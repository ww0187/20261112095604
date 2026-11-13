/* 五组暖秋渐变：枫红 / 金桂 / 栗子 / 焦糖 / 木色 */
export const AVATAR_GRADIENTS = [
  "linear-gradient(145deg, #d4613c, #a8341f)",
  "linear-gradient(145deg, #dfa23c, #b0761f)",
  "linear-gradient(145deg, #b4563f, #7d3325)",
  "linear-gradient(145deg, #c98a4b, #94622f)",
  "linear-gradient(145deg, #9d6b4a, #6f4530)"
];

export function avatarGradient(name = "") {
  let hash = 0;
  const text = String(name);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function initialOf(name = "") {
  const text = String(name || "").trim();
  return Array.from(text)[0] || "茶";
}
