<script setup>
defineProps({
  total: { type: Number, default: 0 }
});
</script>

<template>
  <header class="brand">
    <div class="brand__glow" aria-hidden="true"></div>

    <div class="brand__inner">
      <div class="brand__identity">
        <span class="brand__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12h12v3.4A5.6 5.6 0 0 1 10.4 21h-.8A5.6 5.6 0 0 1 4 15.4V12Z" />
            <path d="M16 13h1.6a2.1 2.1 0 0 1 0 4.2H16" />
            <path d="M4.5 22h11" />
            <path d="M11.8 2.2l.9 1.9 2-.4-.8 1.7 1.8 1-1.8.7.3 1.9-1.6-1.2-1.6 1.2.3-1.9-1.8-.7 1.8-1-.8-1.7 2 .4z" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div>
          <h1 class="brand__title">茶话会</h1>
          <p class="brand__subtitle">秋意正浓，泡壶茶慢慢聊</p>
        </div>
      </div>

      <div class="brand__stats" title="服务端已保存的茶话数量">
        <span class="brand__stats-num" data-test="stat-count">{{ total }}</span>
        <span class="brand__stats-label">杯茶话</span>
      </div>
    </div>
  </header>
</template>
