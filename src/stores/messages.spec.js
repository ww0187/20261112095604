import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEFAULT_NICKNAME, MAX_LENGTH, MAX_NICKNAME, useMessagesStore } from "./messages";
import { getProfile, listMessages, saveNickname } from "../api/client.js";

function newStore() {
  setActivePinia(createPinia());
  return useMessagesStore();
}

/* 模拟“刷新”或“新开一个标签页”：换一个全新的 pinia + store */
async function freshStore() {
  const store = newStore();
  await store.hydrate();
  return store;
}

/* 临时让后端不可用，用例结束自动恢复 setup.js 注入的 shim */
async function withBrokenFetch(run) {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

describe("messages store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("hydrate 载入", () => {
    it("从服务端读回 10 条示例茶话", async () => {
      const store = await freshStore();

      expect(store.messages).toHaveLength(10);
      expect(store.total).toBe(10);
      expect(store.hasMessages).toBe(true);
      expect(store.hydrated).toBe(true);
      expect(store.loading).toBe(false);
      expect(store.error).toBe("");
    });

    it("列表按 createdAt 倒序，最新一条在“刚刚”范围内", async () => {
      const store = await freshStore();

      expect(store.messages).toEqual(
        [...store.messages].sort((a, b) => b.createdAt - a.createdAt)
      );
      expect(Date.now() - store.messages[0].createdAt).toBeLessThan(60 * 1000);
    });

    it("hydrate 后昵称来自服务端 profile", async () => {
      await saveNickname("老周");

      const store = await freshStore();

      expect(store.nickname).toBe("老周");
    });

    it("profile 为空时昵称保持空字符串", async () => {
      const store = await freshStore();

      expect(store.nickname).toBe("");
    });
  });

  describe("addMessage", () => {
    it("发布置顶、同步昵称，换新 store 再次 hydrate 仍能读到", async () => {
      const store = await freshStore();
      const before = store.total;

      const message = await store.addMessage({ content: "  新泡的一壶茶  ", nickname: "阿禾" });

      expect(message.content).toBe("新泡的一壶茶");
      expect(message.nickname).toBe("阿禾");
      expect(store.messages[0].id).toBe(message.id);
      expect(store.total).toBe(before + 1);
      expect(store.nickname).toBe("阿禾");

      const refreshed = await freshStore();
      expect(refreshed.total).toBe(before + 1);
      expect(refreshed.messages[0].id).toBe(message.id);
      expect(refreshed.nickname).toBe("阿禾");
    });

    it("空白内容返回 null，不发请求也不改列表", async () => {
      const store = await freshStore();
      const before = store.total;

      expect(await store.addMessage({ content: "   ", nickname: "阿禾" })).toBeNull();
      expect(store.total).toBe(before);
      expect(await listMessages()).toHaveLength(before);
    });

    it("正文超过上限时截断到 200 字", async () => {
      const store = await freshStore();

      const message = await store.addMessage({
        content: "茶".repeat(MAX_LENGTH + 30),
        nickname: "阿茶"
      });

      expect(message.content).toHaveLength(MAX_LENGTH);
      expect(message.content).toBe("茶".repeat(MAX_LENGTH));
    });

    it("昵称为空时回退默认昵称并写入服务端 profile", async () => {
      const store = await freshStore();

      const message = await store.addMessage({ content: "没有昵称的一条", nickname: "   " });

      expect(message.nickname).toBe(DEFAULT_NICKNAME);
      expect(store.nickname).toBe(DEFAULT_NICKNAME);
      expect(await getProfile()).toBe(DEFAULT_NICKNAME);
    });

    it("接口失败时返回 null 且 error 给出中文提示", async () => {
      const store = await freshStore();
      const before = store.total;

      const message = await withBrokenFetch(() =>
        store.addMessage({ content: "后端挂了也要优雅", nickname: "阿茶" })
      );

      expect(message).toBeNull();
      expect(store.error).toBe("发布失败，请稍后重试。");
      expect(store.total).toBe(before);
      expect(store.loading).toBe(false);
    });

    it("失败后再次发布成功会清空 error", async () => {
      const store = await freshStore();

      await withBrokenFetch(() => store.addMessage({ content: "先失败一次", nickname: "阿茶" }));
      expect(store.error).not.toBe("");

      const message = await store.addMessage({ content: "这次成功", nickname: "阿茶" });
      expect(message).not.toBeNull();
      expect(store.error).toBe("");
    });
  });

  describe("removeMessage", () => {
    it("删除成功返回 true，服务端同步删除", async () => {
      const store = await freshStore();
      const target = store.messages[3];

      const ok = await store.removeMessage(target.id);

      expect(ok).toBe(true);
      expect(store.total).toBe(9);
      expect(store.messages.some((item) => item.id === target.id)).toBe(false);

      const refreshed = await freshStore();
      expect(refreshed.total).toBe(9);
      expect(refreshed.messages.some((item) => item.id === target.id)).toBe(false);
    });

    it("删除不存在的 id 返回 false 且列表不变", async () => {
      const store = await freshStore();

      const ok = await store.removeMessage("not-exist");

      expect(ok).toBe(false);
      expect(store.total).toBe(10);
      expect(store.error).toBe("删除失败，请稍后重试。");
    });
  });

  describe("clearAll", () => {
    it("清空返回被删条数，再次 hydrate 仍为空（不会回填示例）", async () => {
      const store = await freshStore();

      const removed = await store.clearAll();

      expect(removed).toBe(10);
      expect(store.messages).toEqual([]);
      expect(store.total).toBe(0);

      const refreshed = await freshStore();
      expect(refreshed.messages).toEqual([]);
      expect(refreshed.total).toBe(0);
      expect(refreshed.hydrated).toBe(true);
    });
  });

  describe("setNickname", () => {
    it("trim 并截断到 20 字后立即写入服务端 profile", async () => {
      const store = await freshStore();

      await store.setNickname("  老周  ");
      expect(store.nickname).toBe("老周");
      expect(await getProfile()).toBe("老周");

      const longName = `  ${"字".repeat(MAX_NICKNAME + 5)}  `;
      await store.setNickname(longName);
      expect(store.nickname).toBe("字".repeat(MAX_NICKNAME));
      expect(await getProfile()).toBe("字".repeat(MAX_NICKNAME));
    });

    it("允许清空昵称（空字符串写回服务端）", async () => {
      const store = await freshStore();

      await store.setNickname("老周");
      await store.setNickname("   ");

      expect(store.nickname).toBe("");
      expect(await getProfile()).toBe("");
    });
  });

  describe("后端不可用", () => {
    it("hydrate 不抛异常，error 有中文提示且列表为空", async () => {
      const store = newStore();

      await withBrokenFetch(() => store.hydrate());

      expect(store.error).toBe("茶话加载失败，请稍后重试。");
      expect(store.messages).toEqual([]);
      expect(store.total).toBe(0);
      expect(store.loading).toBe(false);
      expect(store.hydrated).toBe(true);
    });
  });
});
