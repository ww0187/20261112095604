<script setup>
import { computed, ref } from "vue";

const MAX_LENGTH = 200;
const MAX_NICKNAME = 20;

const props = defineProps({
  nickname: { type: String, default: "" }
});

const emit = defineEmits(["submit", "update:nickname"]);

const content = ref("");
const error = ref("");
const textarea = ref(null);

const counter = computed(() => `${content.value.length} / ${MAX_LENGTH}`);
const canSubmit = computed(() => content.value.trim().length > 0);

function onInput(event) {
  const raw = event.target.value;
  const value = raw.slice(0, MAX_LENGTH);
  content.value = value;
  if (raw !== value) event.target.value = value;
  if (error.value) error.value = "";
}

function onNicknameInput(event) {
  emit("update:nickname", event.target.value.slice(0, MAX_NICKNAME));
}

function submit() {
  const text = content.value.trim();
  if (!text) {
    error.value = "茶还没泡呢，先写点什么吧。";
    return;
  }

  emit("submit", {
    content: text.slice(0, MAX_LENGTH),
    nickname: props.nickname.trim()
  });

  content.value = "";
  error.value = "";
  if (textarea.value) textarea.value.value = "";
}

function onKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    submit();
  }
}
</script>

<template>
  <section class="composer card">
    <h2 class="visually-hidden">发布一条茶话</h2>

    <form class="composer__form" novalidate @submit.prevent="submit">
      <div class="composer__field">
        <label class="composer__label" for="nickname">昵称</label>
        <input
          id="nickname"
          class="composer__nickname"
          data-test="nickname"
          type="text"
          maxlength="20"
          autocomplete="nickname"
          placeholder="你的昵称，可不填"
          :value="nickname"
          @input="onNicknameInput"
        />
      </div>

      <div class="composer__field">
        <label class="visually-hidden" for="content">茶话内容</label>
        <textarea
          id="content"
          ref="textarea"
          class="composer__textarea"
          rows="4"
          maxlength="200"
          placeholder="今天想聊点什么茶话？"
          :value="content"
          @input="onInput"
          @keydown="onKeydown"
        ></textarea>
      </div>

      <div class="composer__footer">
        <div class="composer__meta">
          <span class="composer__counter" data-test="counter" aria-live="polite">{{ counter }}</span>
          <span class="composer__hint">Ctrl / ⌘ + Enter 快速发布</span>
        </div>
        <button class="btn btn--primary" type="submit" :disabled="!canSubmit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4.5 12 20 4.5 15.5 20 12 13.5 4.5 12Z" />
          </svg>
          发布茶话
        </button>
      </div>

      <p v-if="error" class="composer__error" data-test="error" role="status" aria-live="polite">
        {{ error }}
      </p>
    </form>
  </section>
</template>
