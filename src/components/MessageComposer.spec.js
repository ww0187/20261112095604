import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MessageComposer from "./MessageComposer.vue";

function mountComposer(props = {}) {
  return mount(MessageComposer, {
    props: { nickname: "", ...props }
  });
}

describe("MessageComposer", () => {
  it("初始状态：计数为 0 / 200，发布按钮禁用", () => {
    const wrapper = mountComposer();

    expect(wrapper.find('[data-test="counter"]').text()).toBe("0 / 200");
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(true);
  });

  it("输入内容后实时更新计数并启用按钮", async () => {
    const wrapper = mountComposer();

    await wrapper.find("textarea").setValue("秋天的第一杯茶");

    expect(wrapper.find('[data-test="counter"]').text()).toBe("7 / 200");
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(false);
  });

  it("提交时抛出 trim 后的正文与昵称，并清空输入框", async () => {
    const wrapper = mountComposer({ nickname: "阿茶" });

    await wrapper.find("textarea").setValue("  一壶热茶  ");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("submit")[0][0]).toEqual({
      content: "一壶热茶",
      nickname: "阿茶"
    });
    expect(wrapper.find("textarea").element.value).toBe("");
    expect(wrapper.find('[data-test="counter"]').text()).toBe("0 / 200");
  });

  it("空白内容提交时给出提示且不派发事件", async () => {
    const wrapper = mountComposer();

    await wrapper.find("textarea").setValue("    ");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.find('[data-test="error"]').text()).toContain("先写点什么");
  });

  it("Ctrl + Enter 快捷发布", async () => {
    const wrapper = mountComposer();

    await wrapper.find("textarea").setValue("键盘发布");
    await wrapper.find("textarea").trigger("keydown", { key: "Enter", ctrlKey: true });

    expect(wrapper.emitted("submit")).toHaveLength(1);
  });

  it("超过 200 字时禁止继续输入", async () => {
    const wrapper = mountComposer();

    await wrapper.find("textarea").setValue("茶".repeat(210));

    expect(wrapper.find("textarea").element.value).toHaveLength(200);
    expect(wrapper.find('[data-test="counter"]').text()).toBe("200 / 200");
  });

  it("昵称输入变化时向父组件同步", async () => {
    const wrapper = mountComposer();

    await wrapper.find('[data-test="nickname"]').setValue("小满");

    expect(wrapper.emitted("update:nickname")[0]).toEqual(["小满"]);
  });
});
