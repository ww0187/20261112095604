import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MessageList from "./MessageList.vue";

const messages = [
  { id: "a", nickname: "阿茶", content: "第一条茶话", createdAt: Date.now() },
  { id: "b", nickname: "老周", content: "第二条茶话", createdAt: Date.now() - 60000 }
];

describe("MessageList", () => {
  it("按传入顺序渲染全部茶话", () => {
    const wrapper = mount(MessageList, { props: { messages } });

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(2);
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false);
  });

  it("空列表时展示空状态", () => {
    const wrapper = mount(MessageList, { props: { messages: [] } });

    expect(wrapper.findAll('[data-test="post"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="empty"]').text()).toContain("茶桌还空着");
  });

  it("透传删除事件", async () => {
    const wrapper = mount(MessageList, { props: { messages } });

    await wrapper.findAll('[data-test="delete"]')[0].trigger("click");

    expect(wrapper.emitted("delete")[0]).toEqual(["a"]);
  });
});
