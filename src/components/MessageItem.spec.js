import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MessageItem from "./MessageItem.vue";

function mountItem(overrides = {}) {
  return mount(MessageItem, {
    props: {
      message: {
        id: "m-1",
        nickname: "阿茶",
        content: "今天泡了一壶陈年普洱。",
        createdAt: Date.now(),
        ...overrides
      }
    }
  });
}

describe("MessageItem", () => {
  it("渲染昵称、正文与相对时间", () => {
    const wrapper = mountItem();

    expect(wrapper.find('[data-test="post-name"]').text()).toBe("阿茶");
    expect(wrapper.find('[data-test="post-content"]').text()).toBe("今天泡了一壶陈年普洱。");
    expect(wrapper.find('[data-test="post-time"]').text()).toBe("刚刚");
  });

  it("头像显示昵称首字", () => {
    const wrapper = mountItem({ nickname: "老周" });

    expect(wrapper.find('[data-test="post-avatar"]').text()).toBe("老");
  });

  it("正文按纯文本渲染，不解析 HTML", () => {
    const wrapper = mountItem({ content: '<img src=x onerror="alert(1)">危险内容' });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find('[data-test="post-content"]').text()).toContain("<img src=x");
  });

  it("保留正文中的换行", () => {
    const wrapper = mountItem({ content: "第一行\n第二行" });

    expect(wrapper.find('[data-test="post-content"]').element.textContent).toBe("第一行\n第二行");
  });

  it("点击删除按钮派发 delete 事件并携带 id", async () => {
    const wrapper = mountItem();

    await wrapper.find('[data-test="delete"]').trigger("click");

    expect(wrapper.emitted("delete")[0]).toEqual(["m-1"]);
  });

  describe("点赞与收藏", () => {
    it("缺少 likes / liked / favorited 字段时按 0 与未激活渲染", () => {
      const wrapper = mountItem();

      expect(wrapper.find('[data-test="like-count"]').text()).toBe("0");
      expect(wrapper.find('[data-test="like"]').attributes("aria-pressed")).toBe("false");
      expect(wrapper.find('[data-test="favorite"]').attributes("aria-pressed")).toBe("false");
      expect(wrapper.find('[data-test="like"]').classes()).not.toContain("is-active");
      expect(wrapper.find('[data-test="favorite"]').classes()).not.toContain("is-active");
    });

    it("渲染服务端返回的点赞数", () => {
      const wrapper = mountItem({ likes: 12, liked: false, favorited: false });

      expect(wrapper.find('[data-test="like-count"]').text()).toBe("12");
    });

    it("likes 非法（负数 / 非数字）时兜底显示 0", () => {
      expect(mountItem({ likes: -2 }).find('[data-test="like-count"]').text()).toBe("0");
      expect(mountItem({ likes: "好几杯" }).find('[data-test="like-count"]').text()).toBe("0");
    });

    it("已点赞时 aria-pressed 为 true、按钮有 is-active 且心形填充", () => {
      const wrapper = mountItem({ likes: 1, liked: true });
      const button = wrapper.find('[data-test="like"]');

      expect(button.attributes("aria-pressed")).toBe("true");
      expect(button.classes()).toContain("is-active");
      expect(button.find("svg").attributes("fill")).toBe("currentColor");
    });

    it("未点赞时心形不填充", () => {
      const wrapper = mountItem({ likes: 3, liked: false });

      expect(wrapper.find('[data-test="like"] svg').attributes("fill")).toBe("none");
    });

    it("已收藏时 aria-pressed 为 true 且按钮有 is-active", () => {
      const wrapper = mountItem({ favorited: true });
      const button = wrapper.find('[data-test="favorite"]');

      expect(button.attributes("aria-pressed")).toBe("true");
      expect(button.classes()).toContain("is-active");
    });

    it("点击点赞按钮派发 like 事件并携带 id", async () => {
      const wrapper = mountItem();

      await wrapper.find('[data-test="like"]').trigger("click");

      expect(wrapper.emitted("like")[0]).toEqual(["m-1"]);
      expect(wrapper.emitted("delete")).toBeUndefined();
    });

    it("点击收藏按钮派发 favorite 事件并携带 id", async () => {
      const wrapper = mountItem();

      await wrapper.find('[data-test="favorite"]').trigger("click");

      expect(wrapper.emitted("favorite")[0]).toEqual(["m-1"]);
      expect(wrapper.emitted("delete")).toBeUndefined();
    });
  });
});
