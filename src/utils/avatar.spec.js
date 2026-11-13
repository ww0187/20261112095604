import { describe, expect, it } from "vitest";
import { AVATAR_GRADIENTS, avatarGradient, initialOf } from "./avatar";

describe("avatar utils", () => {
  it("同一个昵称始终得到同一组渐变", () => {
    expect(avatarGradient("阿茶")).toBe(avatarGradient("阿茶"));
    expect(AVATAR_GRADIENTS).toContain(avatarGradient("阿茶"));
  });

  it("不同昵称会分布到不同配色（抽样）", () => {
    const names = ["阿茶", "老周", "小满", "林间", "阿吉", "木鱼", "陶陶", "白露"];
    const colors = new Set(names.map(avatarGradient));
    expect(colors.size).toBeGreaterThan(1);
  });

  it("取昵称首字作为头像文字", () => {
    expect(initialOf("阿茶")).toBe("阿");
    expect(initialOf("  小满 ")).toBe("小");
  });

  it("空昵称兜底为「茶」", () => {
    expect(initialOf("")).toBe("茶");
    expect(initialOf("   ")).toBe("茶");
    expect(initialOf(undefined)).toBe("茶");
  });
});
