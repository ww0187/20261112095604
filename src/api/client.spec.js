import { describe, expect, it } from "vitest";
import {
  ApiError,
  clearMessages,
  createMessage,
  deleteMessage,
  getProfile,
  listMessages,
  saveNickname,
  toggleFavorite,
  toggleLike
} from "./client";
import { API_BASE } from "../shared/constants.js";

/* 抓住 promise 抛出的错误，便于逐项断言 status / code / message */
async function capture(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

/* 临时替换 fetch，用例结束后必须恢复（setup.js 的 shim 才是默认实现） */
async function withFetch(impl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

describe("api/client", () => {
  describe("成功路径", () => {
    it("listMessages 解析出服务端返回的列表", async () => {
      const messages = await listMessages();

      expect(Array.isArray(messages)).toBe(true);
      expect(messages).toHaveLength(10);
      expect(messages[0]).toEqual(
        expect.objectContaining({ id: expect.any(String), nickname: expect.any(String) })
      );
    });

    it("createMessage 拿到 201 创建的消息并落到服务端", async () => {
      const message = await createMessage({ content: "客户端的一条", nickname: "阿茶" });

      expect(message.content).toBe("客户端的一条");
      expect(message.nickname).toBe("阿茶");
      expect(typeof message.id).toBe("string");
      expect(Date.now() - message.createdAt).toBeLessThan(60 * 1000);

      const messages = await listMessages();
      expect(messages).toHaveLength(11);
      expect(messages[0].id).toBe(message.id);
    });

    it("deleteMessage 返回删除结果", async () => {
      const created = await createMessage({ content: "待删除的一条", nickname: "阿茶" });

      const result = await deleteMessage(created.id);

      expect(result).toEqual({ deleted: true, id: created.id });
      expect(await listMessages()).toHaveLength(10);
    });

    it("clearMessages 返回被删除的条数", async () => {
      expect(await clearMessages()).toBe(10);
      expect(await listMessages()).toHaveLength(0);
    });

    it("getProfile / saveNickname 读写昵称", async () => {
      expect(await getProfile()).toBe("");
      expect(await saveNickname("老周")).toBe("老周");
      expect(await getProfile()).toBe("老周");
    });
  });

  describe("错误归一", () => {
    it("空内容返回 400，抛 ApiError 且 code 与中文 message 正确", async () => {
      const error = await capture(createMessage({ content: "   ", nickname: "阿茶" }));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.status).toBe(400);
      expect(error.code).toBe("INVALID_CONTENT");
      expect(error.message).toBe("消息内容不能为空");
    });

    it("删除不存在的消息返回 404，抛 NOT_FOUND", async () => {
      const error = await capture(deleteMessage("not-exist"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("请求的资源不存在");
    });

    it("网络异常被归一为 ApiError（status 0 / NETWORK_ERROR）", async () => {
      const error = await withFetch(
        () => Promise.reject(new TypeError("Failed to fetch")),
        () => capture(listMessages())
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(0);
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.message).toBe("网络开小差了，请稍后重试。");
      expect(error.cause).toBeInstanceOf(TypeError);
    });

    it("响应体不是 JSON 时按状态码兜底文案", async () => {
      const error = await withFetch(
        () => Promise.resolve({ ok: false, status: 500, text: async () => "<html>boom</html>" }),
        () => capture(listMessages())
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.message).toBe("服务内部错误，请稍后重试。");
    });
  });

  /* 只伪造响应，不关心真实路由：用于校验归一逻辑与异常分支 */
  function fakeResponse(body, { status = 200 } = {}) {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body))
    };
  }

  describe("toggleLike", () => {
    it("以 POST 打到 /messages/:id/like，并原样返回服务端计数", async () => {
      const calls = [];
      const result = await withFetch(
        (input, init) => {
          calls.push({ input, init });
          return Promise.resolve(fakeResponse({ id: "m-1", likes: 7, liked: true }));
        },
        () => toggleLike("m-1")
      );

      expect(calls[0].input).toBe(`${API_BASE}/messages/m-1/like`);
      expect(calls[0].init.method).toBe("POST");
      expect(calls[0].init.body).toBeUndefined();
      expect(result).toEqual({ id: "m-1", likes: 7, liked: true });
    });

    it("likes 缺失或非法时归零，liked 缺失时视为未点赞", async () => {
      const missing = await withFetch(
        () => Promise.resolve(fakeResponse({ id: "m-1" })),
        () => toggleLike("m-1")
      );
      expect(missing).toEqual({ id: "m-1", likes: 0, liked: false });

      const negative = await withFetch(
        () => Promise.resolve(fakeResponse({ id: "m-1", likes: -3, liked: 0 })),
        () => toggleLike("m-1")
      );
      expect(negative).toEqual({ id: "m-1", likes: 0, liked: false });

      const weird = await withFetch(
        () => Promise.resolve(fakeResponse({ id: "m-1", likes: "两杯" })),
        () => toggleLike("m-1")
      );
      expect(weird.likes).toBe(0);
    });

    it("响应体缺少 id 时抛 INVALID_RESPONSE", async () => {
      const error = await withFetch(
        () => Promise.resolve(fakeResponse({ likes: 1 })),
        () => capture(toggleLike("m-1"))
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe("INVALID_RESPONSE");
      expect(error.message).toBe("服务端返回的数据不完整，请稍后重试。");
    });

    it("消息不存在时抛 404 NOT_FOUND", async () => {
      const error = await capture(toggleLike("not-exist"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("请求的资源不存在");
    });

    it("网络异常归一为 ApiError（status 0 / NETWORK_ERROR）", async () => {
      const error = await withFetch(
        () => Promise.reject(new TypeError("Failed to fetch")),
        () => capture(toggleLike("m-1"))
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(0);
      expect(error.code).toBe("NETWORK_ERROR");
    });
  });

  describe("toggleFavorite", () => {
    it("以 POST 打到 /messages/:id/favorite，返回收藏状态", async () => {
      const calls = [];
      const result = await withFetch(
        (input, init) => {
          calls.push({ input, init });
          return Promise.resolve(fakeResponse({ id: "m-2", favorited: true }));
        },
        () => toggleFavorite("m-2")
      );

      expect(calls[0].input).toBe(`${API_BASE}/messages/m-2/favorite`);
      expect(calls[0].init.method).toBe("POST");
      expect(result).toEqual({ id: "m-2", favorited: true });
    });

    it("favorited 缺失时兜底为 false，响应缺少 id 时抛 INVALID_RESPONSE", async () => {
      const loose = await withFetch(
        () => Promise.resolve(fakeResponse({ id: "m-2" })),
        () => toggleFavorite("m-2")
      );
      expect(loose).toEqual({ id: "m-2", favorited: false });

      const error = await withFetch(
        () => Promise.resolve(fakeResponse("null")),
        () => capture(toggleFavorite("m-2"))
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe("INVALID_RESPONSE");
    });

    it("消息不存在时抛 404 NOT_FOUND", async () => {
      const error = await capture(toggleFavorite("not-exist"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  describe("请求格式", () => {
    it("所有请求都拼上 API_BASE 前缀，方法、Content-Type 与请求体正确", async () => {
      const original = globalThis.fetch;
      const calls = [];
      globalThis.fetch = (input, init) => {
        calls.push({ input, init });
        return original(input, init);
      };

      let created = null;
      try {
        await listMessages();
        created = await createMessage({ content: "前缀检查", nickname: "阿茶" });
        await deleteMessage(created.id);
        await getProfile();
        await saveNickname("阿茶");
        await clearMessages();
      } finally {
        globalThis.fetch = original;
      }

      expect(calls.map((call) => call.input)).toEqual([
        `${API_BASE}/messages`,
        `${API_BASE}/messages`,
        `${API_BASE}/messages/${created.id}`,
        `${API_BASE}/profile`,
        `${API_BASE}/profile`,
        `${API_BASE}/messages`
      ]);
      expect(calls.map((call) => call.init.method ?? "GET")).toEqual([
        "GET",
        "POST",
        "DELETE",
        "GET",
        "PUT",
        "DELETE"
      ]);
      expect(calls[1].init.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(calls[1].init.body)).toEqual({ content: "前缀检查", nickname: "阿茶" });
      expect(JSON.parse(calls[4].init.body)).toEqual({ nickname: "阿茶" });
      expect(calls[0].init.body).toBeUndefined();
    });
  });
});
