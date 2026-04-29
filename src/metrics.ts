type KarmaResponse = {
  groups?: Record<string, Group>;
};

type Group = {
  alerts?: Alert[];
  shared?: {
    labels?: Record<string, string>;
  };
};

type Alert = {
  startsAt: string;
  labels: Record<string, string>;
};

export type ParsedAlert = {
  startsAt: Date;
  labels: Record<string, string>;
};

const DEFAULT_KARMA_URL =
  "https://nmx.example.com/karma/alerts.json?q=alertname%3Dfttx%20subscriber%20offline";
const DEFAULT_THRESHOLD_MINUTES = 2;
const DEFAULT_MIN_GROUP_SIZE = 15;

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function formatStartedAt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildClusters(alerts: ParsedAlert[]): ParsedAlert[][] {
  const thresholdMs =
    Number(Bun.env.THRESHOLD_MINUTES ?? String(DEFAULT_THRESHOLD_MINUTES)) * 60 * 1000;
  const sortedAlerts = [...alerts].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );

  const clusters: ParsedAlert[][] = [];
  for (const alert of sortedAlerts) {
    const current = clusters.at(-1);
    if (!current) {
      clusters.push([alert]);
      continue;
    }

    const previous = current.at(-1)!;
    if (alert.startsAt.getTime() - previous.startsAt.getTime() <= thresholdMs) {
      current.push(alert);
    } else {
      clusters.push([alert]);
    }
  }

  return clusters;
}

export async function getClusteredAlerts(): Promise<{
  clusters: ParsedAlert[][];
  operator: string;
}> {
  const karmaUrl = Bun.env.KARMA_URL ?? DEFAULT_KARMA_URL;

  const response = await fetch(karmaUrl);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as KarmaResponse;
  const groups = Object.values(data.groups ?? {});
  const operator =
    groups.find((group) => group.shared?.labels?.operator)?.shared?.labels?.operator ??
    "unknown";

  const alerts: ParsedAlert[] = [];
  for (const group of groups) {
    for (const alert of group.alerts ?? []) {
      alerts.push({
        startsAt: new Date(alert.startsAt),
        labels: { ...(group.shared?.labels ?? {}), ...(alert.labels ?? {}) },
      });
    }
  }

  return { clusters: buildClusters(alerts), operator };
}

export async function buildMetrics(): Promise<string> {
  const minGroupSize = Number(Bun.env.MIN_GROUP_SIZE ?? String(DEFAULT_MIN_GROUP_SIZE));
  const { clusters, operator } = await getClusteredAlerts();

  const qualifyingClusters = clusters.filter((cluster) => cluster.length > minGroupSize);

  const lines = [
    "# HELP fttx_mass_outage_active Whether a mass outage is currently detected.",
    "# TYPE fttx_mass_outage_active gauge",
  ];

  for (const cluster of qualifyingClusters) {
    const first = cluster[0];
    lines.push(
      `fttx_mass_outage_active{operator="${escapeLabelValue(operator)}",started_at="${escapeLabelValue(formatStartedAt(first.startsAt))}"} 1`,
    );
  }

  return lines.join("\n") + "\n";
}
