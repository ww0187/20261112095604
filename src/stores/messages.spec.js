import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/* 只替换点赞 / 收藏两个出口，其余出口保留真实实现（继续走 tests/setup.js 的 fetch shim），
   这样既有用例的断言完全不变；两个新接口在合并后端之前不存在，必须被隔离 */
vi.mock("../api/client.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, toggleLike: vi.fn(), toggleFavorite: vi.fn() };
});

import { DEFAULT_NICKNAME, MAX_LENGTH, MAX_NICKNAME, useMessagesStore } from "./messages";
import {
  getProfile,
  listMessages,
  saveNickname,
  toggleFavorite,
  toggleLike
} from "../api/client.js";

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

  /* 点赞 / 收藏：接口已被 vi.mock 隔离，这里只验证 store 的状态流 */
  describe("toggleLike / toggleFavorite", () => {
    /* 三条本地消息，覆盖“完整字段”“缺 likes 字段”“已收藏”三种情况 */
    function seededStore() {
      const store = newStore();
      store.messages = [
        { id: "a", nickname: "阿茶", content: "第一条", createdAt: 3, likes: 2, liked: false, favorited: false },
        { id: "b", nickname: "老周", content: "第二条", createdAt: 2, likes: 0, liked: false, favorited: true },
        { id: "c", nickname: "阿禾", content: "第三条", createdAt: 1 }
      ];
      return store;
    }

    beforeEach(() => {
      toggleLike.mockReset();
      toggleFavorite.mockReset();
    });

    it("点赞成功后按服务端计数更新对应消息，返回 true 且不改 loading", async () => {
      const store = seededStore();
      toggleLike.mockResolvedValue({ id: "a", likes: 7, liked: true });

      const ok = await store.toggleLike("a");

      expect(ok).toBe(true);
      expect(toggleLike).toHaveBeenCalledWith("a");
      /* 服务端说 7 就是 7，不在本地 2 + 1 */
      expect(store.messages[0].likes).toBe(7);
      expect(store.messages[0].liked).toBe(true);
      expect(store.messages[1].likes).toBe(0);
      expect(store.loading).toBe(false);
      expect(store.error).toBe("");
      expect(store.likedCount).toBe(1);
    });

    it("点赞失败返回 false，error 为中文文案且列表不变", async () => {
      const store = seededStore();
      toggleLike.mockRejectedValue(new Error("404"));

      const ok = await store.toggleLike("a");

      expect(ok).toBe(false);
      expect(store.error).toBe("操作失败，请稍后重试。");
      expect(store.messages[0].likes).toBe(2);
      expect(store.messages[0].liked).toBe(false);
      expect(store.loading).toBe(false);
    });

    it("收藏成功后只改 favorited，加载态与其它消息不受影响", async () => {
      const store = seededStore();
      toggleFavorite.mockResolvedValue({ id: "a", favorited: true });

      const ok = await store.toggleFavorite("a");

      expect(ok).toBe(true);
      expect(toggleFavorite).toHaveBeenCalledWith("a");
      expect(store.messages[0].favorited).toBe(true);
      expect(store.messages[0].likes).toBe(2);
      expect(store.messages[1].favorited).toBe(true);
      expect(store.loading).toBe(false);
      expect(store.favoriteCount).toBe(2);
    });

    it("取消收藏后消息从收藏筛选里消失", async () => {
      const store = seededStore();
      store.setFilter("favorites");
      toggleFavorite.mockResolvedValue({ id: "b", favorited: false });

      expect(store.visibleMessages.map((item) => item.id)).toEqual(["b"]);

      const ok = await store.toggleFavorite("b");

      expect(ok).toBe(true);
      expect(store.messages[1].favorited).toBe(false);
      expect(store.visibleMessages).toEqual([]);
      expect(store.favoriteCount).toBe(0);
    });

    it("收藏失败返回 false 且 error 有中文提示", async () => {
      const store = seededStore();
      toggleFavorite.mockRejectedValue(new Error("boom"));

      const ok = await store.toggleFavorite("a");

      expect(ok).toBe(false);
      expect(store.error).toBe("操作失败，请稍后重试。");
      expect(store.messages[0].favorited).toBe(false);
    });
  });

  describe("filter / visibleMessages", () => {
    beforeEach(() => {
      setActivePinia(createPinia());
    });

    it("默认 filter 为 all，收藏数量与点赞数量按字段统计", () => {
      const store = newStore();
      store.messages = [
        { id: "a", favorited: true, liked: true },
        { id: "b", favorited: false, liked: true },
        { id: "c" }
      ];

      expect(store.filter).toBe("all");
      expect(store.visibleMessages.map((item) => item.id)).toEqual(["a", "b", "c"]);
      expect(store.favoriteCount).toBe(1);
      expect(store.likedCount).toBe(2);
    });

    it("切到 favorites 只留收藏的消息并保持原顺序", () => {
      const store = newStore();
      store.messages = [
        { id: "a", favorited: false },
        { id: "b", favorited: true },
        { id: "c", favorited: true }
      ];

      store.setFilter("favorites");

      expect(store.visibleMessages.map((item) => item.id)).toEqual(["b", "c"]);
      expect(store.total).toBe(3);
      expect(store.hasMessages).toBe(true);
    });

    it("setFilter 只接受 all / favorites，其它值回退 all", () => {
      const store = newStore();

      expect(store.setFilter("favorites")).toBe("favorites");
      expect(store.filter).toBe("favorites");

      expect(store.setFilter("liked")).toBe("all");
      expect(store.filter).toBe("all");

      store.setFilter(undefined);
      expect(store.filter).toBe("all");
    });

    it("空列表时收藏数量为 0 且可见列表为空", () => {
      const store = newStore();

      expect(store.favoriteCount).toBe(0);
      expect(store.likedCount).toBe(0);
      expect(store.visibleMessages).toEqual([]);
    });
  });
});
