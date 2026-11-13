import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import App from "./App.vue";

function mountApp() {
  return mount(App, {
    global: { plugins: [createPinia()] },
    attachTo: document.body
  });
}

describe("App 集成", () => {
  it("首次访问展示 10 条示例茶话与统计数字", () => {
    const wrapper = mountApp();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(10);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("10");
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false);
  });

  it("发布后列表与统计同步更新，并清空输入框", async () => {
    const wrapper = mountApp();

    await wrapper.find('[data-test="nickname"]').setValue("阿茶");
    await wrapper.find("textarea").setValue("写一条新的茶话");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(11);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("11");
    expect(wrapper.find("textarea").element.value).toBe("");
    expect(wrapper.findAll('[data-test="post"]')[0].text()).toContain("写一条新的茶话");
  });

  it("删除一条后统计同步", async () => {
    const wrapper = mountApp();

    await wrapper.findAll('[data-test="delete"]')[0].trigger("click");

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(9);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("9");
  });

  it("清空全部后展示空状态", async () => {
    const wrapper = mountApp();

    await wrapper.find('[data-test="clear"]').trigger("click");

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("0");
    expect(wrapper.find('[data-test="empty"]').text()).toContain("茶桌还空着");
  });

  it("刷新（重新挂载）后内容仍然存在", async () => {
    const first = mountApp();
    await first.find("textarea").setValue("持久化的一条");
    await first.find("form").trigger("submit");
    first.unmount();

    const second = mountApp();

    expect(second.findAll('[data-test="post"]')).toHaveLength(11);
    expect(second.text()).toContain("持久化的一条");
  });
});
