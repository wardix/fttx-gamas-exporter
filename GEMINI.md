# Gemini Project Context: fttx-gamas-exporter

## Project Overview
`fttx-gamas-exporter` is a specialized Prometheus exporter designed to detect and report mass outages (Gangguan Massal/Gamas) in FTTX networks. It works by fetching alert data from a Karma instance, clustering these alerts based on their start times, and exposing the resulting clusters as Prometheus metrics.

- **Purpose:** Monitor FTTX network health by identifying clusters of subscriber-offline alerts.
- **Primary Technologies:** [Bun](https://bun.sh/), [Hono](https://hono.dev/), TypeScript.
- **Data Source:** Karma (Alertmanager UI) JSON API.

## Architecture
The application is a lightweight web service with two main components:

1.  **`src/server.ts`**: The entry point that initializes the Hono web server.
    - Exposes `GET /metrics` for Prometheus scraping.
    - Exposes `GET /healthz` and `GET /` for health checks.
    - Uses `Bun.serve` for high-performance HTTP handling.

2.  **`src/metrics.ts`**: Core logic for metric generation.
    - **Fetching:** Retrieves alert groups from the configured `KARMA_URL`.
    - **Clustering:** Sorts alerts by `startsAt` and groups them if the gap between consecutive alerts is within `THRESHOLD_MINUTES`.
    - **Filtering:** Only clusters larger than `MIN_GROUP_SIZE` are considered mass outages.
    - **Formatting:** Outputs metrics in Prometheus text format with labels for `operator` and `started_at`.

## Building and Running

### Prerequisites
- [Bun](https://bun.sh/) installed.

### Setup
```bash
bun install
cp .env.example .env # Then edit .env with your configuration
```

### Commands
- **Start Service:** `bun run start` or `bun run src/server.ts`
- **CLI Tool (Cluster Members):** `bun run cli` - Displays detailed information about active mass outage clusters and their members.
- **Development:** `bun run dev` (currently same as start)

### Configuration (Environment Variables)
- `PORT`: Port the exporter listens on (default: `3000`).
- `KARMA_URL`: URL to the Karma alerts JSON endpoint.
- `THRESHOLD_MINUTES`: Maximum time gap (in minutes) between alerts to be considered part of the same cluster (default: `2`).
- `MIN_GROUP_SIZE`: Minimum number of alerts in a cluster to qualify as a mass outage (default: `15`).

## Development Conventions
- **Runtime:** Leverage Bun's native APIs (`Bun.env`, `Bun.serve`, `fetch`) where possible.
- **Type Safety:** Maintain strict TypeScript types for Karma responses and internal data structures.
- **Functional Logic:** Keep clustering and formatting logic pure and testable within `src/metrics.ts`.
- **Metrics Format:** Ensure output strictly follows the Prometheus text-based exposition format.
