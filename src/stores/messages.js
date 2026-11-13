import { defineStore } from "pinia";
import { DEFAULT_NICKNAME, MAX_LENGTH, MAX_NICKNAME, SEED_COUNT } from "../shared/constants.js";
import {
  clearMessages,
  createMessage,
  deleteMessage,
  getProfile,
  listMessages,
  saveNickname,
  toggleFavorite as toggleFavoriteApi,
  toggleLike as toggleLikeApi
} from "../api/client.js";

/* 常量继续从 store 转出，保持既有的 import 写法兼容 */
export { DEFAULT_NICKNAME, MAX_LENGTH, MAX_NICKNAME, SEED_COUNT };

/* 失败时的中文兜底文案，避免把英文异常或 HTTP 细节暴露给用户 */
const FALLBACK = {
  hydrate: "茶话加载失败，请稍后重试。",
  add: "发布失败，请稍后重试。",
  remove: "删除失败，请稍后重试。",
  clear: "清空失败，请稍后重试。",
  nickname: "昵称保存失败，请稍后重试。",
  react: "操作失败，请稍后重试。"
};

/* 列表筛选：all 全部、favorites 只看收藏；不在这两个值里的一律回退 all */
const FILTER_ALL = "all";
const FILTER_FAVORITES = "favorites";

function trimTo(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

/* 只替换命中的那条消息，返回新数组：保持其余消息的引用与顺序不变 */
function patchMessage(messages, id, patch) {
  return messages.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    messages: [],
    nickname: "",
    loading: false,
    hydrated: false,
    error: "",
    filter: FILTER_ALL
  }),

  getters: {
    total: (state) => state.messages.length,
    hasMessages: (state) => state.messages.length > 0,
    /* 收藏筛选下只留 favorited 为真的消息，顺序沿用服务端返回的顺序 */
    visibleMessages: (state) =>
      state.filter === FILTER_FAVORITES
        ? state.messages.filter((item) => Boolean(item.favorited))
        : state.messages,
    favoriteCount: (state) => state.messages.filter((item) => Boolean(item.favorited)).length,
    likedCount: (state) => state.messages.filter((item) => Boolean(item.liked)).length
  },

  actions: {
    /**
     * 首屏载入：并行拉取消息列表与昵称。
     * 任何失败都降级为空列表，只把中文提示写进 error，绝不向组件抛异常。
     */
    async hydrate() {
      this.loading = true;
      this.error = "";

      try {
        const [messages, nickname] = await Promise.all([listMessages(), getProfile()]);
        this.messages = Array.isArray(messages) ? messages : [];
        this.nickname = trimTo(nickname, MAX_NICKNAME);
      } catch (error) {
        console.warn("加载茶话失败：", error);
        this.error = FALLBACK.hydrate;
        this.messages = [];
      } finally {
        this.loading = false;
        /* 失败也算“已尝试过”，避免界面一直停在加载态 */
        this.hydrated = true;
      }

      return this.messages;
    },

    /**
     * 发布一条茶话：本地先 trim + 截断，空白内容直接返回 null（不发请求）。
     * 成功后用服务端返回的消息置顶，并同步服务端已记住的昵称。
     */
    async addMessage({ content, nickname } = {}) {
      const text = trimTo(content, MAX_LENGTH);
      if (!text) return null;

      const name = trimTo(nickname, MAX_NICKNAME) || DEFAULT_NICKNAME;

      this.loading = true;
      this.error = "";

      try {
        const message = await createMessage({ content: text, nickname: name });
        if (!message) {
          this.error = FALLBACK.add;
          return null;
        }

        /* 服务端写入时会同时更新 profile，这里不需要再发一次 PUT */
        this.messages = [message, ...this.messages];
        this.nickname = message.nickname || name;
        return message;
      } catch (error) {
        console.warn("发布茶话失败：", error);
        this.error = FALLBACK.add;
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 删除一条：先请求服务端，成功后再改本地列表。
     * 返回 true / false，调用方据此决定是否提示。
     */
    async removeMessage(id) {
      this.loading = true;
      this.error = "";

      try {
        await deleteMessage(id);
        this.messages = this.messages.filter((item) => item.id !== id);
        return true;
      } catch (error) {
        console.warn("删除茶话失败：", error);
        this.error = FALLBACK.remove;
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 清空全部：返回被删除的条数（失败返回 0）。
     * 服务端清空后不会再灌示例数据，刷新依旧是空桌。
     */
    async clearAll() {
      this.loading = true;
      this.error = "";

      try {
        const removed = await clearMessages();
        this.messages = [];
        return removed;
      } catch (error) {
        console.warn("清空茶话失败：", error);
        this.error = FALLBACK.clear;
        return 0;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 点赞 / 取消点赞：计数完全以服务端返回为准（本地不做 +1 / -1）。
     * 失败只写 error 并返回 false，绝不抛异常；不动 loading，避免影响删除与清空按钮。
     */
    async toggleLike(id) {
      this.error = "";

      try {
        const result = await toggleLikeApi(id);
        this.messages = patchMessage(this.messages, id, {
          likes: result.likes,
          liked: result.liked
        });
        return true;
      } catch (error) {
        console.warn("点赞失败：", error);
        this.error = FALLBACK.react;
        return false;
      }
    },

    /**
     * 收藏 / 取消收藏：同样只认服务端返回的 favorited。
     * 返回 true / false，调用方据此提示。
     */
    async toggleFavorite(id) {
      this.error = "";

      try {
        const result = await toggleFavoriteApi(id);
        this.messages = patchMessage(this.messages, id, { favorited: result.favorited });
        return true;
      } catch (error) {
        console.warn("收藏失败：", error);
        this.error = FALLBACK.react;
        return false;
      }
    },

    /* 切换列表筛选：只接受 all / favorites，其它值一律回退 all */
    setFilter(next) {
      this.filter = next === FILTER_FAVORITES ? FILTER_FAVORITES : FILTER_ALL;
      return this.filter;
    },

    /**
     * 记住昵称：本地立即规范化（trim + 20 字）并写回 state，
     * 同时立刻 PUT 到服务端；失败只置 error，不打断输入。
     */
    async setNickname(name) {
      const value = trimTo(name, MAX_NICKNAME);
      this.nickname = value;

      try {
        const saved = await saveNickname(value);
        /* 逐字符输入会产生多次 PUT，只认最后一次输入对应的响应，避免乱序覆盖 */
        if (this.nickname === value) this.nickname = trimTo(saved, MAX_NICKNAME);
      } catch (error) {
        console.warn("保存昵称失败：", error);
        this.error = FALLBACK.nickname;
      }

      return this.nickname;
    }
  }
});
