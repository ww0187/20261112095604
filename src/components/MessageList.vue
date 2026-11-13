<script setup>
import MessageItem from "./MessageItem.vue";
import EmptyState from "./EmptyState.vue";

defineProps({
  messages: { type: Array, default: () => [] },
  /* 空态文案由调用方决定：默认是“茶桌还空着”，收藏筛选无结果时换一套 */
  emptyTitle: { type: String, default: "茶桌还空着" },
  emptyText: { type: String, default: "泡一壶热茶，说说今天的秋意。" }
});

defineEmits(["delete", "like", "favorite"]);
</script>

<template>
  <ul v-if="messages.length" class="feed__list" aria-live="polite">
    <MessageItem
      v-for="message in messages"
      :key="message.id"
      :message="message"
      @delete="$emit('delete', $event)"
      @like="$emit('like', $event)"
      @favorite="$emit('favorite', $event)"
    />
  </ul>
  <EmptyState v-else :title="emptyTitle" :text="emptyText" />
</template>
