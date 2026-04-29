import { getClusteredAlerts } from "./metrics";

async function main() {
  const minGroupSize = Number(Bun.env.MIN_GROUP_SIZE ?? "15");
  
  try {
    const { clusters } = await getClusteredAlerts();
    const qualifyingClusters = clusters.filter(c => c.length > minGroupSize);

    if (qualifyingClusters.length === 0) {
      console.log("No mass outages detected (above threshold " + minGroupSize + ").");
      return;
    }

    qualifyingClusters.forEach((cluster, index) => {
      const first = cluster[0];
      const timeStr = first.startsAt.toLocaleString();
      
      console.log(`Cluster ${index + 1} (Total: ${cluster.length} alerts) - Started at: ${timeStr}`);
      console.log(`Status: GANGGUAN MASSAL`);
      console.log(`Members:`);
      
      cluster.forEach(alert => {
        const alertTime = alert.startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const labelsStr = Object.entries(alert.labels)
          .filter(([key]) => key !== "alertname") // hide redundant alertname
          .map(([key, val]) => `${key}: ${val}`)
          .join(", ");
        
        console.log(`  - ${alertTime} | ${labelsStr}`);
      });
      console.log(""); // newline
    });
  } catch (error) {
    console.error("Error fetching or processing clusters:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
