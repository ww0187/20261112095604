import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEFAULT_NICKNAME, MAX_LENGTH, STORAGE_KEYS, useMessagesStore } from "./messages";

function readStoredMessages() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.messages));
}

function newStore() {
  setActivePinia(createPinia());
  return useMessagesStore();
}

describe("messages store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("首次载入", () => {
    it("localStorage 为空时注入 10 条示例茶话", () => {
      const store = newStore();
      store.hydrate();

      expect(store.messages).toHaveLength(10);
      expect(store.total).toBe(10);
      expect(readStoredMessages()).toHaveLength(10);
    });

    it("示例数据最新一条始终在“刚刚”范围内（1 分钟内）", () => {
      const store = newStore();
      store.hydrate();

      expect(Date.now() - store.messages[0].createdAt).toBeLessThan(60 * 1000);
    });

    it("示例数据的昵称与正文互不重复，并按时间倒序排列", () => {
      const store = newStore();
      store.hydrate();

      const nicknames = new Set(store.messages.map((item) => item.nickname));
      const contents = new Set(store.messages.map((item) => item.content));
      expect(nicknames.size).toBe(10);
      expect(contents.size).toBe(10);
      expect(store.messages).toEqual(
        [...store.messages].sort((a, b) => b.createdAt - a.createdAt)
      );
    });

    it("已有数据时不会重复注入示例", () => {
      window.localStorage.setItem(
        STORAGE_KEYS.messages,
        JSON.stringify([
          { id: "m1", nickname: "阿茶", content: "手写的一条茶话", createdAt: Date.now() }
        ])
      );

      const store = newStore();
      store.hydrate();

      expect(store.messages).toHaveLength(1);
      expect(store.messages[0].content).toBe("手写的一条茶话");
    });

    it("数据损坏时安全降级为空列表，不抛异常", () => {
      window.localStorage.setItem(STORAGE_KEYS.messages, "{ not json");

      const store = newStore();
      expect(() => store.hydrate()).not.toThrow();
      expect(store.messages).toEqual([]);
    });

    it("清空后再次载入不会回填示例数据", () => {
      const first = newStore();
      first.hydrate();
      first.clearAll();

      expect(window.localStorage.getItem(STORAGE_KEYS.messages)).toBe("[]");

      const second = newStore();
      second.hydrate();
      expect(second.messages).toEqual([]);
      expect(second.total).toBe(0);
    });

    it("恢复上次使用的昵称", () => {
      window.localStorage.setItem(STORAGE_KEYS.nickname, "老周");

      const store = newStore();
      store.hydrate();

      expect(store.nickname).toBe("老周");
    });
  });

  describe("addMessage", () => {
    it("新增内容置顶并写入 localStorage", () => {
      const store = newStore();
      store.hydrate();
      const before = store.total;

      const message = store.addMessage({ content: "  新泡的一壶茶  ", nickname: "阿禾" });

      expect(message.content).toBe("新泡的一壶茶");
      expect(message.nickname).toBe("阿禾");
      expect(store.messages[0].id).toBe(message.id);
      expect(store.total).toBe(before + 1);
      expect(readStoredMessages()[0].id).toBe(message.id);
    });

    it("空白内容不写入并返回 null", () => {
      const store = newStore();
      store.hydrate();
      const before = store.total;

      expect(store.addMessage({ content: "   ", nickname: "阿禾" })).toBeNull();
      expect(store.total).toBe(before);
    });

    it("昵称为空时使用默认昵称并记住昵称", () => {
      const store = newStore();
      store.hydrate();

      const message = store.addMessage({ content: "没有昵称的一条", nickname: "   " });

      expect(message.nickname).toBe(DEFAULT_NICKNAME);
      expect(store.nickname).toBe(DEFAULT_NICKNAME);
      expect(window.localStorage.getItem(STORAGE_KEYS.nickname)).toBe(DEFAULT_NICKNAME);
    });

    it("正文超过上限时截断", () => {
      const store = newStore();
      store.hydrate();

      const message = store.addMessage({ content: "茶".repeat(MAX_LENGTH + 30), nickname: "阿茶" });

      expect(message.content).toHaveLength(MAX_LENGTH);
    });

    it("每条记录的 id 唯一", () => {
      const store = newStore();
      store.hydrate();

      const a = store.addMessage({ content: "第一条", nickname: "阿茶" });
      const b = store.addMessage({ content: "第二条", nickname: "阿茶" });

      expect(a.id).not.toBe(b.id);
    });
  });

  describe("removeMessage / clearAll", () => {
    it("按 id 删除并持久化", () => {
      const store = newStore();
      store.hydrate();
      const target = store.messages[3];

      store.removeMessage(target.id);

      expect(store.total).toBe(9);
      expect(store.messages.some((item) => item.id === target.id)).toBe(false);
      expect(readStoredMessages().some((item) => item.id === target.id)).toBe(false);
    });

    it("删除不存在的 id 不改变列表", () => {
      const store = newStore();
      store.hydrate();

      store.removeMessage("not-exist");

      expect(store.total).toBe(10);
    });

    it("清空全部后写入空数组", () => {
      const store = newStore();
      store.hydrate();

      store.clearAll();

      expect(store.messages).toEqual([]);
      expect(store.total).toBe(0);
      expect(window.localStorage.getItem(STORAGE_KEYS.messages)).toBe("[]");
    });
  });
});
