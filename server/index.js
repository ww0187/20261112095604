import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[茶话会] API 服务已启动：http://127.0.0.1:${info.port}`);
});

export default app;
