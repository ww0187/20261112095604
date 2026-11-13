import { describe, expect, it } from "vitest";
import { createMemoryStore } from "./store.js";
import {
  DEFAULT_NICKNAME,
  MAX_LENGTH,
  MAX_NICKNAME,
  SEED_COUNT
} from "../src/shared/constants.js";

const FIXED_NOW = 1700000000000;

function createClock(start = FIXED_NOW) {
  let current = start;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
      return current;
    }
  };
}

function isDescending(list) {
  return list.every((item, index) => index === 0 || list[index - 1].createdAt >= item.createdAt);
}

describe("createMemoryStore · seed", () => {
  it("默认注入 SEED_COUNT 条示例消息并按 createdAt 倒序", () => {
    const store = createMemoryStore({ now: () => FIXED_NOW });
    const list = store.list();
    expect(list).toHaveLength(SEED_COUNT);
    expect(isDescending(list)).toBe(true);
    expect(list[0]).toMatchObject({
      id: expect.any(String),
      nickname: expect.any(String),
      content: expect.any(String),
      createdAt: expect.any(Number)
    });
  });

  it("seed:false 时初始为空", () => {
    const store = createMemoryStore({ seed: false });
    expect(store.list()).toEqual([]);
  });

  it("clear() 之后不会被重新注入示例", () => {
    const store = createMemoryStore({ now: () => FIXED_NOW });
    store.clear();
    expect(store.list()).toEqual([]);
    expect(store.list()).toEqual([]);
  });
});

describe("createMemoryStore · list", () => {
  it("返回副本，外部修改不影响内部状态", () => {
    const store = createMemoryStore({ seed: false, now: () => FIXED_NOW });
    store.add({ content: "第一杯茶" });
    const snapshot = store.list();
    snapshot[0].content = "被篡改";
    snapshot.pop();
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].content).toBe("第一杯茶");
  });
});

describe("createMemoryStore · add", () => {
  it("生成完整字段并使用注入的时钟与 UUID", () => {
    const clock = createClock();
    const store = createMemoryStore({ seed: false, now: clock.now });
    const message = store.add({ content: "  雨天煮茶  ", nickname: "  小满  " });
    expect(message).toEqual({
      id: expect.any(String),
      nickname: "小满",
      content: "雨天煮茶",
      createdAt: FIXED_NOW,
      likes: 0,
      liked: false,
      favorited: false
    });
    expect(message.id.length).toBeGreaterThan(8);
  });

  it("追加后新消息排在 list() 首位", () => {
    const clock = createClock();
    const store = createMemoryStore({ seed: false, now: clock.now });
    store.add({ content: "早一点" });
    clock.advance(1000);
    store.add({ content: "晚一点" });
    const list = store.list();
    expect(list.map((item) => item.content)).toEqual(["晚一点", "早一点"]);
  });

  it("content 截断到 MAX_LENGTH", () => {
    const store = createMemoryStore({ seed: false });
    const message = store.add({ content: "a".repeat(MAX_LENGTH + 50) });
    expect(message.content).toHaveLength(MAX_LENGTH);
  });

  it("content 为空白时返回 null 且不写入", () => {
    const store = createMemoryStore({ seed: false });
    expect(store.add({ content: "   \n  " })).toBeNull();
    expect(store.add({ content: "" })).toBeNull();
    expect(store.add({})).toBeNull();
    expect(store.list()).toEqual([]);
  });

  it("昵称为空时回退 DEFAULT_NICKNAME", () => {
    const store = createMemoryStore({ seed: false });
    const message = store.add({ content: "你好", nickname: "   " });
    expect(message.nickname).toBe(DEFAULT_NICKNAME);
  });

  it("昵称截断到 MAX_NICKNAME", () => {
    const store = createMemoryStore({ seed: false });
    const message = store.add({ content: "你好", nickname: "n".repeat(MAX_NICKNAME + 10) });
    expect(message.nickname).toHaveLength(MAX_NICKNAME);
  });

  it("新增消息同时写入 profile 昵称", () => {
    const store = createMemoryStore({ seed: false });
    store.add({ content: "你好", nickname: "  阿茶  " });
    expect(store.getNickname()).toBe("阿茶");
  });
});

describe("createMemoryStore · remove / clear", () => {
  it("remove 成功返回 true 并从列表消失", () => {
    const store = createMemoryStore({ seed: false });
    const message = store.add({ content: "会被删掉" });
    expect(store.remove(message.id)).toBe(true);
    expect(store.list()).toEqual([]);
  });

  it("remove 不存在的 id 返回 false", () => {
    const store = createMemoryStore({ seed: false });
    expect(store.remove("missing-id")).toBe(false);
  });

  it("clear 返回删除条数并清空列表", () => {
    const store = createMemoryStore({ now: () => FIXED_NOW });
    expect(store.clear()).toBe(SEED_COUNT);
    expect(store.list()).toEqual([]);
    expect(store.clear()).toBe(0);
  });
});

describe("createMemoryStore · nickname / profile", () => {
  it("getNickname 初始为空字符串", () => {
    expect(createMemoryStore({ seed: false }).getNickname()).toBe("");
  });

  it("setNickname 去空白并截断到 MAX_NICKNAME", () => {
    const store = createMemoryStore({ seed: false });
    expect(store.setNickname("  老周  ")).toBe("老周");
    expect(store.setNickname("z".repeat(MAX_NICKNAME + 5))).toHaveLength(MAX_NICKNAME);
    expect(store.getNickname()).toHaveLength(MAX_NICKNAME);
  });

  it("setNickname 允许空字符串", () => {
    const store = createMemoryStore({ seed: false });
    store.setNickname("白露");
    expect(store.setNickname("   ")).toBe("");
    expect(store.getNickname()).toBe("");
  });
});

describe("createMemoryStore · 点赞与收藏默认值", () => {
  it("新增消息默认 likes 为 0 且未点赞未收藏", () => {
    const store = createMemoryStore({ seed: false });
    const message = store.add({ content: "第一杯茶" });
    expect(message.likes).toBe(0);
    expect(message.liked).toBe(false);
    expect(message.favorited).toBe(false);
    expect(store.list()[0]).toMatchObject({ likes: 0, liked: false, favorited: false });
  });

  it("示例消息的 likes 由确定性规则生成，范围 0~23 且至少一条为 0", () => {
    const first = createMemoryStore({ now: () => FIXED_NOW }).list().map((item) => item.likes);
    const second = createMemoryStore({ now: () => FIXED_NOW }).list().map((item) => item.likes);
    expect(first).toEqual(second);
    expect(first.every((value) => Number.isInteger(value) && value >= 0 && value <= 23)).toBe(true);
    expect(first).toContain(0);
  });

  it("示例消息默认未点赞未收藏", () => {
    const list = createMemoryStore({ now: () => FIXED_NOW }).list();
    expect(list.every((item) => item.liked === false)).toBe(true);
    expect(list.every((item) => item.favorited === false)).toBe(true);
  });
});

describe("createMemoryStore · toggleLike", () => {
  it("首次点赞 likes +1 且 liked 变为 true", () => {
    const store = createMemoryStore({ seed: false });
    const created = store.add({ content: "值得点一下" });
    expect(store.toggleLike(created.id)).toEqual({ id: created.id, likes: 1, liked: true });
    expect(store.list()[0]).toMatchObject({ likes: 1, liked: true });
  });

  it("再次点赞取消，回到原始计数", () => {
    const store = createMemoryStore({ seed: false });
    const created = store.add({ content: "来回切换" });
    store.toggleLike(created.id);
    expect(store.toggleLike(created.id)).toEqual({ id: created.id, likes: 0, liked: false });
    expect(store.list()[0]).toMatchObject({ likes: 0, liked: false });
  });

  it("反复点赞取消后 likes 始终为非负整数", () => {
    const store = createMemoryStore({ seed: false });
    const created = store.add({ content: "很多次" });
    for (let i = 0; i < 7; i += 1) {
      const result = store.toggleLike(created.id);
      expect(result.likes).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.likes)).toBe(true);
    }
    expect(store.list()[0].liked).toBe(true);
  });

  it("id 不存在返回 null 且不影响已有消息", () => {
    const store = createMemoryStore({ seed: false });
    store.add({ content: "唯一一条" });
    expect(store.toggleLike("missing-id")).toBeNull();
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].likes).toBe(0);
  });

  it("只影响目标任务消息", () => {
    const store = createMemoryStore({ seed: false });
    const first = store.add({ content: "甲" });
    const second = store.add({ content: "乙" });
    store.toggleLike(first.id);
    const byId = Object.fromEntries(store.list().map((item) => [item.id, item]));
    expect(byId[first.id]).toMatchObject({ likes: 1, liked: true });
    expect(byId[second.id]).toMatchObject({ likes: 0, liked: false });
  });
});

describe("createMemoryStore · toggleFavorite", () => {
  it("收藏后 favorited 为 true，再次调用取消收藏", () => {
    const store = createMemoryStore({ seed: false });
    const created = store.add({ content: "先收藏" });
    expect(store.toggleFavorite(created.id)).toEqual({ id: created.id, favorited: true });
    expect(store.list()[0].favorited).toBe(true);
    expect(store.toggleFavorite(created.id)).toEqual({ id: created.id, favorited: false });
    expect(store.list()[0].favorited).toBe(false);
  });

  it("id 不存在返回 null", () => {
    const store = createMemoryStore({ seed: false });
    expect(store.toggleFavorite("missing-id")).toBeNull();
  });

  it("收藏与点赞互不干扰", () => {
    const store = createMemoryStore({ seed: false });
    const created = store.add({ content: "两件事分开" });
    store.toggleFavorite(created.id);
    const liked = store.toggleLike(created.id);
    expect(liked).toMatchObject({ likes: 1, liked: true });
    expect(store.list()[0].favorited).toBe(true);
  });
});

describe("createMemoryStore · list 副本隔离（新字段）", () => {
  it("list() 返回的副本带三个新字段，修改副本不影响内部状态", () => {
    const store = createMemoryStore({ seed: false });
    store.add({ content: "副本隔离" });
    const snapshot = store.list();
    snapshot[0].likes = 99;
    snapshot[0].liked = true;
    snapshot[0].favorited = true;
    expect(store.list()[0]).toMatchObject({ likes: 0, liked: false, favorited: false });
  });
});
