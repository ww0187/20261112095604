<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useMessagesStore } from "./stores/messages";
import BrandHeader from "./components/BrandHeader.vue";
import MessageComposer from "./components/MessageComposer.vue";
import MessageList from "./components/MessageList.vue";

const store = useMessagesStore();
store.hydrate();

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

function handleSubmit({ content, nickname }) {
  const message = store.addMessage({ content, nickname });
  if (!message) showToast("茶还没泡呢，先写点什么吧。");
}

function handleDelete(id) {
  const target = store.messages.find((item) => item.id === id);
  if (!target) return;

  const preview = target.content.length > 18 ? `${target.content.slice(0, 18)}…` : target.content;
  if (!window.confirm(`确定要删除这条茶话吗？\n\n“${preview}”`)) return;

  store.removeMessage(id);
}

function handleClear() {
  if (!store.total) return;
  if (!window.confirm(`确定清空全部 ${store.total} 条茶话吗？此操作无法撤销。`)) return;

  store.clearAll();
  showToast("茶桌已收拾干净。");
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
      <p>数据仅保存在本机浏览器 · 茶话会</p>
    </footer>
  </div>
</template>
