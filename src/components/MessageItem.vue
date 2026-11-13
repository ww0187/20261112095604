<script setup>
import { computed } from "vue";
import { avatarGradient, initialOf } from "../utils/avatar";
import { formatRelativeTime } from "../utils/time";

const props = defineProps({
  message: { type: Object, required: true }
});

defineEmits(["delete", "like", "favorite"]);

const gradient = computed(() => avatarGradient(props.message.nickname));
const initial = computed(() => initialOf(props.message.nickname));
const relativeTime = computed(() => formatRelativeTime(props.message.createdAt));
const datetime = computed(() => new Date(props.message.createdAt).toISOString());

/* 兼容旧数据：likes / liked / favorited 缺失时按 0 / false 渲染 */
const likeCount = computed(() => {
  const count = Math.floor(Number(props.message.likes));
  return Number.isFinite(count) && count > 0 ? count : 0;
});
const isLiked = computed(() => Boolean(props.message.liked));
const isFavorited = computed(() => Boolean(props.message.favorited));
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

      <div class="post__actions">
        <button
          class="post__action post__action--like"
          :class="{ 'is-active': isLiked }"
          data-test="like"
          type="button"
          :aria-pressed="isLiked ? 'true' : 'false'"
          :aria-label="isLiked ? '取消点赞' : '点赞'"
          @click="$emit('like', message.id)"
        >
          <svg
            viewBox="0 0 24 24"
            :fill="isLiked ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20.4c-1.1-.75-7.1-4.9-7.1-9.5a4.25 4.25 0 0 1 7.1-3.15A4.25 4.25 0 0 1 19.1 10.9c0 4.6-6 8.75-7.1 9.5Z" />
          </svg>
          <span class="post__action-count" data-test="like-count">{{ likeCount }}</span>
        </button>

        <button
          class="post__action post__action--favorite"
          :class="{ 'is-active': isFavorited }"
          data-test="favorite"
          type="button"
          :aria-pressed="isFavorited ? 'true' : 'false'"
          :aria-label="isFavorited ? '取消收藏' : '收藏'"
          @click="$emit('favorite', message.id)"
        >
          <svg
            viewBox="0 0 24 24"
            :fill="isFavorited ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M7.2 4h9.6a.8.8 0 0 1 .8.8V20l-5.6-3.3L6.4 20V4.8a.8.8 0 0 1 .8-.8Z" />
          </svg>
        </button>
      </div>
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
