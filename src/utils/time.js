const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(value) {
  return String(value).padStart(2, "0");
}

/**
 * 把时间戳格式化为「刚刚 / x 分钟前 / x 小时前 / x 天前 / MM-DD / YYYY-MM-DD」。
 * now 参数用于测试注入固定时间基准。
 */
export function formatRelativeTime(timestamp, now = Date.now()) {
  const time = Number(timestamp);
  if (!Number.isFinite(time)) return "";

  const diff = now - time;
  if (diff < MINUTE) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;

  const date = new Date(time);
  const today = new Date(now);
  const monthDay = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return date.getFullYear() === today.getFullYear()
    ? monthDay
    : `${date.getFullYear()}-${monthDay}`;
}
