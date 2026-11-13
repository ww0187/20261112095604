<script setup>
import MessageItem from "./MessageItem.vue";
import EmptyState from "./EmptyState.vue";

defineProps({
  messages: { type: Array, default: () => [] }
});

defineEmits(["delete"]);
</script>

<template>
  <ul v-if="messages.length" class="feed__list" aria-live="polite">
    <MessageItem
      v-for="message in messages"
      :key="message.id"
      :message="message"
      @delete="$emit('delete', $event)"
    />
  </ul>
  <EmptyState v-else />
</template>
