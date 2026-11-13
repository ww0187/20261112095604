<script setup>
import { computed } from "vue";
import { avatarGradient, initialOf } from "../utils/avatar";
import { formatRelativeTime } from "../utils/time";

const props = defineProps({
  message: { type: Object, required: true }
});

defineEmits(["delete"]);

const gradient = computed(() => avatarGradient(props.message.nickname));
const initial = computed(() => initialOf(props.message.nickname));
const relativeTime = computed(() => formatRelativeTime(props.message.createdAt));
const datetime = computed(() => new Date(props.message.createdAt).toISOString());
</script>

<template>
  <li class="post" data-test="post">
    <span
      class="post__avatar"
      data-test="post-avatar"
      aria-hidden="true"
      :style="{ backgroundImage: gradient }"
    >{{ initial }}</span>

    <div class="post__body">
      <div class="post__meta">
        <span class="post__name" data-test="post-name">{{ message.nickname }}</span>
        <time class="post__time" data-test="post-time" :datetime="datetime">{{ relativeTime }}</time>
      </div>
      <p class="post__text" data-test="post-content">{{ message.content }}</p>
    </div>

    <button
      class="post__delete"
      data-test="delete"
      type="button"
      :aria-label="`删除 ${message.nickname} 的这条茶话`"
      @click="$emit('delete', message.id)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
        <path d="M6.5 7l.7 12.2a1.8 1.8 0 0 0 1.8 1.8h6a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
      </svg>
    </button>
  </li>
</template>
