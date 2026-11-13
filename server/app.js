import { Hono } from "hono";
import { API_BASE } from "../src/shared/constants.js";
import { createMemoryStore } from "./store.js";

const ERROR_MESSAGES = {
  INVALID_CONTENT: "消息内容不能为空",
  INVALID_JSON: "请求体不是合法的 JSON",
  NOT_FOUND: "请求的资源不存在",
  INTERNAL_ERROR: "服务内部错误"
};

function fail(code, message = ERROR_MESSAGES[code]) {
  return { error: { code, message } };
}

async function readJsonBody(c) {
  let raw = "";
  try {
    raw = await c.req.text();
  } catch {
    return { ok: false, value: null };
  }

  if (!raw.trim()) return { ok: true, value: {} };

  try {
    const parsed = JSON.parse(raw);
    const value = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return { ok: true, value };
  } catch {
    return { ok: false, value: null };
  }
}

/**
 * 创建 Hono 应用。store 可注入，便于测试拿到隔离的内存状态。
 */
export function createApp({ store = createMemoryStore() } = {}) {
  const app = new Hono();

  app.get(`${API_BASE}/health`, (c) => c.json({ status: "ok" }, 200));

  app.get(`${API_BASE}/messages`, (c) => c.json({ messages: store.list() }, 200));

  app.post(`${API_BASE}/messages`, async (c) => {
    const body = await readJsonBody(c);
    if (!body.ok) return c.json(fail("INVALID_JSON"), 400);

    const message = store.add({
      content: body.value.content,
      nickname: body.value.nickname
    });
    if (!message) return c.json(fail("INVALID_CONTENT"), 400);

    return c.json({ message }, 201);
  });

  app.delete(`${API_BASE}/messages/:id`, (c) => {
    const id = c.req.param("id");
    if (!store.remove(id)) return c.json(fail("NOT_FOUND"), 404);
    return c.json({ deleted: true, id }, 200);
  });

  app.delete(`${API_BASE}/messages`, (c) => c.json({ deleted: store.clear() }, 200));

  app.get(`${API_BASE}/profile`, (c) => c.json({ nickname: store.getNickname() }, 200));

  app.put(`${API_BASE}/profile`, async (c) => {
    const body = await readJsonBody(c);
    if (!body.ok) return c.json(fail("INVALID_JSON"), 400);
    return c.json({ nickname: store.setNickname(body.value.nickname) }, 200);
  });

  app.notFound((c) => c.json(fail("NOT_FOUND"), 404));

  app.onError((error, c) => {
    console.error("[api] 未捕获异常：", error);
    return c.json(fail("INTERNAL_ERROR"), 500);
  });

  return app;
}
