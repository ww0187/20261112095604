import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./time";

const NOW = new Date(2026, 10, 13, 12, 0, 0).getTime();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("不足一分钟显示「刚刚」", () => {
    expect(formatRelativeTime(NOW - 30 * 1000, NOW)).toBe("刚刚");
  });

  it("以分钟为单位显示", () => {
    expect(formatRelativeTime(NOW - MIN, NOW)).toBe("1 分钟前");
    expect(formatRelativeTime(NOW - 59 * MIN, NOW)).toBe("59 分钟前");
  });

  it("以小时为单位显示", () => {
    expect(formatRelativeTime(NOW - HOUR, NOW)).toBe("1 小时前");
    expect(formatRelativeTime(NOW - 23 * HOUR, NOW)).toBe("23 小时前");
  });

  it("以天为单位显示，最多到 7 天前", () => {
    expect(formatRelativeTime(NOW - DAY, NOW)).toBe("1 天前");
    expect(formatRelativeTime(NOW - 6 * DAY, NOW)).toBe("6 天前");
  });

  it("超过 7 天显示月-日", () => {
    const timestamp = new Date(2026, 10, 3, 9, 0, 0).getTime();
    expect(formatRelativeTime(timestamp, NOW)).toBe("11-03");
  });

  it("跨年时显示完整日期", () => {
    const timestamp = new Date(2025, 10, 3, 9, 0, 0).getTime();
    expect(formatRelativeTime(timestamp, NOW)).toBe("2025-11-03");
  });

  it("非法时间戳安全兜底", () => {
    expect(formatRelativeTime(Number.NaN, NOW)).toBe("");
    expect(formatRelativeTime(NOW + 10 * MIN, NOW)).toBe("刚刚");
  });
});
