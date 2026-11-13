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
        createdAt: now(),
        likes: 0,
        liked: false,
        favorited: false
      };

      messages = [...messages, message];
      profile = name;
      return { ...message };
    },

    toggleLike(id) {
      const index = messages.findIndex((item) => item.id === id);
      if (index === -1) return null;

      const current = messages[index];
      const base = Number.isFinite(current.likes) && current.likes > 0 ? current.likes : 0;
      const liked = !current.liked;
      const likes = liked ? base + 1 : Math.max(0, base - 1);
      const next = { ...current, likes, liked };

      messages = messages.map((item, i) => (i === index ? next : item));
      return { id: next.id, likes: next.likes, liked: next.liked };
    },

    toggleFavorite(id) {
      const index = messages.findIndex((item) => item.id === id);
      if (index === -1) return null;

      const current = messages[index];
      const next = { ...current, favorited: !current.favorited };

      messages = messages.map((item, i) => (i === index ? next : item));
      return { id: next.id, favorited: next.favorited };
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
