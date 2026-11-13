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
});
