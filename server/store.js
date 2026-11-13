import { createSeedMessages } from "../src/data/seed.js";
import {
  DEFAULT_NICKNAME,
  MAX_LENGTH,
  MAX_NICKNAME,
  SEED_COUNT
} from "../src/shared/constants.js";

function normalize(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function sortDesc(list) {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 进程内存储：数据只活在这个 Node 进程里，重启即重置。
 * 所有方法都是同步的，HTTP 层只负责解析/序列化。
 */
export function createMemoryStore({ seed = true, now = () => Date.now() } = {}) {
  let messages = seed ? sortDesc(createSeedMessages(now(), SEED_COUNT)) : [];
  let profile = "";

  return {
    list() {
      return sortDesc(messages).map((item) => ({ ...item }));
    },

    add({ content, nickname } = {}) {
      const text = normalize(content, MAX_LENGTH);
      if (!text) return null;

      const name = normalize(nickname, MAX_NICKNAME) || DEFAULT_NICKNAME;
      const message = {
        id: globalThis.crypto.randomUUID(),
        nickname: name,
        content: text,
        createdAt: now()
      };

      messages = [...messages, message];
      profile = name;
      return { ...message };
    },

    remove(id) {
      const next = messages.filter((item) => item.id !== id);
      if (next.length === messages.length) return false;
      messages = next;
      return true;
    },

    clear() {
      const removed = messages.length;
      messages = [];
      return removed;
    },

    getNickname() {
      return profile;
    },

    setNickname(name) {
      profile = normalize(name, MAX_NICKNAME);
      return profile;
    }
  };
}
