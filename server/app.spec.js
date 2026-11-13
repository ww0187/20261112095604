import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createMemoryStore } from "./store.js";
import {
  DEFAULT_NICKNAME,
  MAX_LENGTH,
  MAX_NICKNAME,
  SEED_COUNT
} from "../src/shared/constants.js";

const FIXED_NOW = 1700000000000;

let app;
let store;

function send(path, method, body) {
  return app.request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

beforeEach(() => {
  store = createMemoryStore({ seed: false, now: () => FIXED_NOW });
  app = createApp({ store });
});

describe("GET /api/health", () => {
  it("返回 200 { status: 'ok' } 且为 JSON", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/messages", () => {
  it("空存储返回 { messages: [] }", async () => {
    const res = await app.request("/api/messages");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ messages: [] });
  });

  it("seed 存储返回 SEED_COUNT 条并按 createdAt 倒序", async () => {
    app = createApp({ store: createMemoryStore({ now: () => FIXED_NOW }) });
    const res = await app.request("/api/messages");
    const { messages } = await res.json();
    expect(messages).toHaveLength(SEED_COUNT);
    const timestamps = messages.map((item) => item.createdAt);
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });
});

describe("POST /api/messages", () => {
  it("合法内容返回 201 { message }", async () => {
    const res = await send("/api/messages", "POST", { content: "  新茶到了  ", nickname: "木鱼" });
    expect(res.status).toBe(201);
    const { message } = await res.json();
    expect(message).toMatchObject({
      id: expect.any(String),
      nickname: "木鱼",
      content: "新茶到了",
      createdAt: FIXED_NOW
    });
    expect(store.list()).toHaveLength(1);
  });

  it("content 空白返回 400 INVALID_CONTENT（中文提示）", async () => {
    const res = await send("/api/messages", "POST", { content: "   " });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CONTENT");
    expect(body.error.message).toMatch(/[\u4e00-\u9fa5]/);
    expect(store.list()).toHaveLength(0);
  });

  it("非法 JSON 返回 400 INVALID_JSON", async () => {
    const res = await send("/api/messages", "POST", "{ content: ");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_JSON");
    expect(body.error.message).toMatch(/[\u4e00-\u9fa5]/);
  });

  it("未带昵称回退 DEFAULT_NICKNAME", async () => {
    const res = await send("/api/messages", "POST", { content: "没有昵称" });
    const { message } = await res.json();
    expect(message.nickname).toBe(DEFAULT_NICKNAME);
  });

  it("内容超长截断到 MAX_LENGTH", async () => {
    const res = await send("/api/messages", "POST", { content: "b".repeat(MAX_LENGTH + 99) });
    const { message } = await res.json();
    expect(message.content).toHaveLength(MAX_LENGTH);
  });

  it("发布携带的昵称同步写入 profile", async () => {
    await send("/api/messages", "POST", { content: "同步昵称", nickname: "云片糕" });
    const res = await app.request("/api/profile");
    expect(await res.json()).toEqual({ nickname: "云片糕" });
  });

  it("发布后列表包含新消息且保持倒序", async () => {
    await send("/api/messages", "POST", { content: "第一条" });
    const res = await app.request("/api/messages");
    const { messages } = await res.json();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("第一条");
  });
});

describe("DELETE /api/messages/:id", () => {
  it("删除已存在消息返回 { deleted: true, id }", async () => {
    const created = store.add({ content: "待删除" });
    const res = await app.request(`/api/messages/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true, id: created.id });
    expect(store.list()).toHaveLength(0);
  });

  it("删除不存在消息返回 404 NOT_FOUND", async () => {
    const res = await app.request("/api/messages/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/messages", () => {
  it("返回删除条数并清空", async () => {
    const res = await app.request("/api/messages", { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 0 });
  });

  it("全量清空后列表为空且不会重新灌示例", async () => {
    app = createApp({ store: createMemoryStore({ now: () => FIXED_NOW }) });
    const res = await app.request("/api/messages", { method: "DELETE" });
    expect(await res.json()).toEqual({ deleted: SEED_COUNT });
    const list = await (await app.request("/api/messages")).json();
    expect(list).toEqual({ messages: [] });
    const again = await (await app.request("/api/messages")).json();
    expect(again).toEqual({ messages: [] });
  });
});

describe("/api/profile", () => {
  it("初始昵称为空字符串", async () => {
    const res = await app.request("/api/profile");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nickname: "" });
  });

  it("PUT 去空白并截断到 MAX_NICKNAME", async () => {
    const res = await send("/api/profile", "PUT", { nickname: "  陶陶  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nickname: "陶陶" });

    const long = await send("/api/profile", "PUT", { nickname: "p".repeat(MAX_NICKNAME + 8) });
    const body = await long.json();
    expect(body.nickname).toHaveLength(MAX_NICKNAME);
  });

  it("PUT 允许设置为空字符串", async () => {
    store.setNickname("阿禾");
    const res = await send("/api/profile", "PUT", { nickname: "   " });
    expect(await res.json()).toEqual({ nickname: "" });
  });
});

describe("未匹配路由", () => {
  it("返回 404 NOT_FOUND 且为 JSON", async () => {
    const res = await app.request("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toMatch(/[\u4e00-\u9fa5]/);
  });

  it("根路径与任意方法都返回 404 NOT_FOUND", async () => {
    const res = await app.request("/definitely-not-here", { method: "POST" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
