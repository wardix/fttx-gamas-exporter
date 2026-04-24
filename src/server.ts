import { Hono } from "hono";
import { buildMetrics } from "./metrics";

const app = new Hono();

app.get("/", (c) => {
  return c.text("ok");
});

app.get("/healthz", (c) => {
  return c.json({ status: "ok" });
});

app.get("/metrics", async (c) => {
  try {
    const metrics = await buildMetrics();
    c.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return c.body(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return c.text(`failed to build metrics: ${message}\n`, 500);
  }
});

const port = Number(Bun.env.PORT ?? "3000");
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`listening on http://localhost:${server.port}`);
