import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import App from "./App.vue";

/* 每次挂载都换一个全新的 pinia，等同于“打开页面”；
   后端由 tests/setup.js 的 fetch shim 提供，同一用例内多次挂载共用同一份内存数据 */
async function mountApp() {
  const wrapper = mount(App, {
    global: { plugins: [createPinia()] },
    attachTo: document.body
  });

  await flushPromises();
  return wrapper;
}

describe("App 集成", () => {
  it("首屏从服务端读回 10 条示例茶话与统计数字", async () => {
    const wrapper = await mountApp();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(10);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("10");
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false);
  });

  it("发布后列表与统计同步更新，并清空输入框", async () => {
    const wrapper = await mountApp();

    await wrapper.find('[data-test="nickname"]').setValue("阿茶");
    await wrapper.find("textarea").setValue("写一条新的茶话");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(11);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("11");
    expect(wrapper.find("textarea").element.value).toBe("");
    expect(wrapper.findAll('[data-test="post"]')[0].text()).toContain("写一条新的茶话");
    expect(wrapper.findAll('[data-test="post-name"]')[0].text()).toBe("阿茶");
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false);
  });

  it("删除一条后统计同步", async () => {
    const wrapper = await mountApp();

    await wrapper.findAll('[data-test="delete"]')[0].trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(9);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("9");
  });

  it("清空全部后展示空状态", async () => {
    const wrapper = await mountApp();

    await wrapper.find('[data-test="clear"]').trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="stat-count"]').text()).toBe("0");
    expect(wrapper.find('[data-test="empty"]').text()).toContain("茶桌还空着");
    expect(wrapper.find(".feed__toast").text()).toContain("茶桌已收拾干净");
  });

  it("刷新（卸载后重新挂载）后仍能从服务端读回 11 条", async () => {
    const first = await mountApp();

    await first.find("textarea").setValue("服务端的一条");
    await first.find("form").trigger("submit");
    await flushPromises();

    expect(first.findAll('[data-test="post"]')).toHaveLength(11);
    first.unmount();

    const second = await mountApp();

    expect(second.findAll('[data-test="post"]')).toHaveLength(11);
    expect(second.find('[data-test="stat-count"]').text()).toBe("11");
    expect(second.text()).toContain("服务端的一条");
  });

  it("页脚说明数据保存在服务端内存中", async () => {
    const wrapper = await mountApp();

    expect(wrapper.find(".footer").text()).toContain("数据保存在服务端内存中");
  });

  it("默认停在全部筛选，收藏数量为 0", async () => {
    const wrapper = await mountApp();

    expect(wrapper.find('[data-test="filter-all"]').attributes("aria-pressed")).toBe("true");
    expect(wrapper.find('[data-test="filter-favorites"]').attributes("aria-pressed")).toBe("false");
    expect(wrapper.find('[data-test="favorite-count"]').text()).toBe("0");
  });

  it("收藏筛选没有结果时展示书签空态，切回全部恢复列表", async () => {
    const wrapper = await mountApp();

    await wrapper.find('[data-test="filter-favorites"]').trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="empty"]').text()).toContain("书签里还空着");
    expect(wrapper.find('[data-test="empty"]').text()).not.toContain("茶桌还空着");

    await wrapper.find('[data-test="filter-all"]').trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(10);
  });

  it("点赞后计数 +1 且按钮进入激活态", async () => {
    const wrapper = await mountApp();

    /* 示例数据的 likes 不一定为 0，断言相对增量而非绝对值 */
    const before = Number(wrapper.findAll('[data-test="like-count"]')[0].text());
    expect(wrapper.findAll('[data-test="like"]')[0].attributes("aria-pressed")).toBe("false");

    await wrapper.findAll('[data-test="like"]')[0].trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="like-count"]')[0].text()).toBe(String(before + 1));
    expect(wrapper.findAll('[data-test="like"]')[0].attributes("aria-pressed")).toBe("true");
  });

  it("收藏后收藏数量 +1，切到收藏筛选只剩这一条", async () => {
    const wrapper = await mountApp();

    const before = Number(wrapper.find('[data-test="favorite-count"]').text());
    expect(before).toBe(0);

    await wrapper.findAll('[data-test="favorite"]')[0].trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-test="favorite-count"]').text()).toBe("1");
    expect(wrapper.find(".feed__toast").text()).toContain("已收进茶桌抽屉");

    await wrapper.find('[data-test="filter-favorites"]').trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(1);
  });

  it("在收藏筛选里取消收藏后回到书签空态", async () => {
    const wrapper = await mountApp();

    await wrapper.findAll('[data-test="favorite"]')[0].trigger("click");
    await flushPromises();
    await wrapper.find('[data-test="filter-favorites"]').trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(1);

    await wrapper.findAll('[data-test="favorite"]')[0].trigger("click");
    await flushPromises();

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="empty"]').text()).toContain("书签里还空着");
    expect(wrapper.find(".feed__toast").text()).toContain("已从抽屉取出");
  });

  it("后端不可用时首屏降级为空状态并给出提示", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));

    let wrapper = null;
    try {
      wrapper = await mountApp();
    } finally {
      globalThis.fetch = original;
    }

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true);
    expect(wrapper.find(".feed__toast").text()).toContain("茶话加载失败");
  });
});
