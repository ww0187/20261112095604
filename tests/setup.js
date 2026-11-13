import { afterEach, beforeEach, vi } from "vitest";
import { createApp } from "../server/app.js";
import { createMemoryStore } from "../server/store.js";

/* 每个用例一份全新的内存后端 + 一个把 fetch 指向 Hono 路由的 shim，
   前端代码走的是真实的 HTTP 路由与序列化，但不监听任何端口 */
let app = null;
let originalFetch = null;

beforeEach(() => {
  app = createApp({ store: createMemoryStore() });
  originalFetch = globalThis.fetch;

  globalThis.fetch = (input, init) => app.request(input, init);

  vi.spyOn(window, "confirm").mockReturnValue(true);

  /* 前端已不再使用 localStorage；保留一行清空，避免个别用例残留干扰 */
  window.localStorage.clear();
});

afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
  else delete globalThis.fetch;

  app = null;
  originalFetch = null;
  vi.restoreAllMocks();
});
