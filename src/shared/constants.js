/**
 * 前后端共享的常量与校验上限。
 * 服务端（server/）与前端（src/）都从这里取值，避免两套规则漂移。
 */
export const API_BASE = "/api";

export const MAX_LENGTH = 200;
export const MAX_NICKNAME = 20;
export const DEFAULT_NICKNAME = "茶友";
export const SEED_COUNT = 10;
