import { defineStore } from "pinia";
import { createSeedMessages } from "../data/seed";

export const STORAGE_KEYS = {
  messages: "chahua_messages",
  nickname: "chahua_nickname"
};

export const MAX_LENGTH = 200;
export const MAX_NICKNAME = 20;
export const DEFAULT_NICKNAME = "茶友";
export const SEED_COUNT = 10;

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("读取本地数据失败：", error);
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("保存本地数据失败：", error);
    return false;
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!content) return null;

  const nickname = typeof raw.nickname === "string" ? raw.nickname.trim() : "";
  const createdAt = Number(raw.createdAt);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId(),
    nickname: nickname.slice(0, MAX_NICKNAME) || DEFAULT_NICKNAME,
    content: content.slice(0, MAX_LENGTH),
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now()
  };
}

function parseMessages(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeMessage)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn("本地数据格式异常，已忽略：", error);
    return [];
  }
}

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    messages: [],
    nickname: "",
    storageError: false,
    hydrated: false
  }),

  getters: {
    total: (state) => state.messages.length,
    hasMessages: (state) => state.messages.length > 0
  },

  actions: {
    hydrate() {
      this.nickname = safeGet(STORAGE_KEYS.nickname) || "";

      const raw = safeGet(STORAGE_KEYS.messages);
      if (raw === null) {
        /* 首次访问：注入示例茶话，仅写入一次 */
        this.messages = createSeedMessages().sort((a, b) => b.createdAt - a.createdAt);
        this.persist();
      } else {
        this.messages = parseMessages(raw);
      }

      this.hydrated = true;
      return this.messages;
    },

    persist() {
      const ok = safeSet(STORAGE_KEYS.messages, JSON.stringify(this.messages));
      this.storageError = !ok;
      return ok;
    },

    addMessage({ content, nickname } = {}) {
      const text = String(content ?? "").trim().slice(0, MAX_LENGTH);
      if (!text) return null;

      const name = String(nickname ?? "").trim().slice(0, MAX_NICKNAME) || DEFAULT_NICKNAME;
      const message = {
        id: createId(),
        nickname: name,
        content: text,
        createdAt: Date.now()
      };

      this.messages.unshift(message);
      this.nickname = name;
      this.persist();
      this.setNickname(name);
      return message;
    },

    removeMessage(id) {
      const next = this.messages.filter((item) => item.id !== id);
      if (next.length === this.messages.length) return false;
      this.messages = next;
      this.persist();
      return true;
    },

    clearAll() {
      this.messages = [];
      this.persist();
    },

    setNickname(name) {
      const value = String(name ?? "").trim().slice(0, MAX_NICKNAME);
      this.nickname = value;
      if (value) safeSet(STORAGE_KEYS.nickname, value);
      else safeGet(STORAGE_KEYS.nickname) !== null && safeSet(STORAGE_KEYS.nickname, "");
    }
  }
});
