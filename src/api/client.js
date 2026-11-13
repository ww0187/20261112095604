import { API_BASE } from "../shared/constants.js";

/**
 * 统一的前端 API 错误。
 * - status：HTTP 状态码；网络层异常时为 0
 * - code：服务端错误码（INVALID_CONTENT / NOT_FOUND / INVALID_JSON ...），或本地归一码
 * - message：可直接展示给用户的中文提示
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN_ERROR", cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

/* 服务端没给出可读文案时，按状态码兜底 */
const STATUS_FALLBACK = {
  400: { code: "INVALID_REQUEST", message: "请求参数不合法，请检查后重试。" },
  404: { code: "NOT_FOUND", message: "请求的资源不存在。" },
  500: { code: "INTERNAL_ERROR", message: "服务内部错误，请稍后重试。" }
};

const NETWORK_ERROR_MESSAGE = "网络开小差了，请稍后重试。";

function fallbackOf(status) {
  if (STATUS_FALLBACK[status]) return STATUS_FALLBACK[status];
  return { code: "UNKNOWN_ERROR", message: `请求失败（HTTP ${status}）。` };
}

/* 宽容解析响应体：空响应或非 JSON 一律当作 null，交给上层兜底 */
async function readPayload(response) {
  try {
    const raw = await response.text();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

/**
 * 唯一的请求出口：拼 API_BASE、序列化请求体、解析 JSON、非 2xx 抛 ApiError。
 * 路径参数传相对路径，例如 "/messages"。
 */
async function request(path, { method = "GET", body } = {}) {
  const init = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await globalThis.fetch(`${API_BASE}${path}`, init);
  } catch (error) {
    /* 断网、DNS、被中止……统一归一为 ApiError，调用方只需处理一种错误 */
    throw new ApiError(NETWORK_ERROR_MESSAGE, {
      status: 0,
      code: "NETWORK_ERROR",
      cause: error
    });
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const fallback = fallbackOf(response.status);
    const code = payload?.error?.code || fallback.code;
    const message = payload?.error?.message || fallback.message;
    throw new ApiError(message, { status: response.status, code });
  }

  return payload;
}

/* 以下 8 个函数即前端数据层的全部入口，store 只依赖它们 */

export async function listMessages() {
  const payload = await request("/messages");
  return Array.isArray(payload?.messages) ? payload.messages : [];
}

export async function createMessage({ content, nickname } = {}) {
  const payload = await request("/messages", {
    method: "POST",
    body: { content, nickname }
  });
  if (!payload?.message) {
    throw new ApiError("服务端返回的数据不完整，请稍后重试。", {
      status: 0,
      code: "INVALID_RESPONSE"
    });
  }
  return payload.message;
}

export async function deleteMessage(id) {
  const payload = await request(`/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
  return { deleted: Boolean(payload?.deleted), id: payload?.id ?? id };
}

export async function clearMessages() {
  const payload = await request("/messages", { method: "DELETE" });
  const removed = Number(payload?.deleted ?? 0);
  return Number.isFinite(removed) ? removed : 0;
}

export async function getProfile() {
  const payload = await request("/profile");
  return typeof payload?.nickname === "string" ? payload.nickname : "";
}

export async function saveNickname(nickname) {
  const payload = await request("/profile", { method: "PUT", body: { nickname } });
  return typeof payload?.nickname === "string" ? payload.nickname : "";
}

/* 计数容错：负数、NaN、非数字一律归零，保证界面不会出现负数或 NaN */
function normalizeCount(value) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * 点赞 / 取消点赞：POST /messages/:id/like。
 * 返回 { id, likes, liked }，其中 likes 以服务端为准（本地不做加减），
 * likes 缺失或非法时兜底为 0；id 缺失说明响应不完整，抛 INVALID_RESPONSE。
 */
export async function toggleLike(id) {
  const payload = await request(`/messages/${encodeURIComponent(id)}/like`, { method: "POST" });
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string" || !payload.id) {
    throw new ApiError("服务端返回的数据不完整，请稍后重试。", {
      status: 0,
      code: "INVALID_RESPONSE"
    });
  }
  return { id: payload.id, likes: normalizeCount(payload.likes), liked: Boolean(payload.liked) };
}

/**
 * 收藏 / 取消收藏：POST /messages/:id/favorite。
 * 返回 { id, favorited }；响应不完整抛 INVALID_RESPONSE。
 */
export async function toggleFavorite(id) {
  const payload = await request(`/messages/${encodeURIComponent(id)}/favorite`, {
    method: "POST"
  });
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string" || !payload.id) {
    throw new ApiError("服务端返回的数据不完整，请稍后重试。", {
      status: 0,
      code: "INVALID_RESPONSE"
    });
  }
  return { id: payload.id, favorited: Boolean(payload.favorited) };
}
