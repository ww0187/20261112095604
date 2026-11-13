<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useMessagesStore } from "./stores/messages";
import BrandHeader from "./components/BrandHeader.vue";
import MessageComposer from "./components/MessageComposer.vue";
import MessageList from "./components/MessageList.vue";

const store = useMessagesStore();

const toast = ref("");
let toastTimer = null;

function showToast(text) {
  toast.value = text;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
    toastTimer = null;
  }, 3000);
}

/* 首屏向服务端要数据；失败时 store 内部已降级为空列表，这里只负责提示 */
onMounted(async () => {
  await store.hydrate();
  if (store.error) showToast(store.error);
});

async function handleSubmit({ content, nickname }) {
  if (!String(content ?? "").trim()) {
    showToast("茶还没泡呢，先写点什么吧。");
    return;
  }

  const message = await store.addMessage({ content, nickname });
  if (!message) showToast(store.error || "发布失败，请稍后重试。");
}

async function handleDelete(id) {
  /* 请求进行中直接忽略点击，等价于把删除按钮置灰（按钮在子组件内，本轮不改组件） */
  if (store.loading) return;

  const target = store.messages.find((item) => item.id === id);
  if (!target) return;

  const preview = target.content.length > 18 ? `${target.content.slice(0, 18)}…` : target.content;
  if (!window.confirm(`确定要删除这条茶话吗？\n\n“${preview}”`)) return;

  const ok = await store.removeMessage(id);
  if (!ok) showToast(store.error || "删除失败，请稍后重试。");
}

async function handleClear() {
  if (store.loading || !store.total) return;
  if (!window.confirm(`确定清空全部 ${store.total} 条茶话吗？此操作无法撤销。`)) return;

  const removed = await store.clearAll();
  if (removed > 0) showToast("茶桌已收拾干净。");
  else showToast(store.error || "清空失败，请稍后重试。");
}

onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer);
});
</script>

<template>
  <div class="page">
    <BrandHeader :total="store.total" />

    <main class="shell">
      <MessageComposer
        :nickname="store.nickname"
        @update:nickname="store.setNickname"
        @submit="handleSubmit"
      />

      <section class="feed" aria-labelledby="feed-heading">
        <div class="feed__head">
          <h2 id="feed-heading" class="feed__title">茶话记录</h2>
          <button
            v-if="store.hasMessages"
            class="btn btn--ghost"
            data-test="clear"
            type="button"
            :disabled="store.loading"
            @click="handleClear"
          >
            清空全部
          </button>
        </div>

        <MessageList :messages="store.messages" @delete="handleDelete" />

        <p v-if="toast" class="feed__toast" role="status" aria-live="polite">{{ toast }}</p>
      </section>
    </main>

    <footer class="footer">
      <p>数据保存在服务端内存中 · 茶话会</p>
    </footer>
  </div>
</template>
