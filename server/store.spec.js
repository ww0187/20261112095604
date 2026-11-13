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
      createdAt: FIXED_NOW
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
