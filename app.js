/* ============================================================
   茶话会 · 应用逻辑
   结构：存储层 → 渲染层 → 事件层
   数据只在本地 localStorage 中流转，无任何网络请求。
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- 常量 ---------------- */
  var STORAGE_KEYS = {
    messages: "chahua_messages",
    nickname: "chahua_nickname"
  };
  var MAX_LENGTH = 200;
  var MAX_NICKNAME = 20;
  var DEFAULT_NICKNAME = "茶友";

  /* 头像配色：五组柔和茶色渐变 */
  var AVATAR_COLORS = [
    "linear-gradient(145deg, #93a06f, #6f8151)",
    "linear-gradient(145deg, #b08a67, #8c6a4a)",
    "linear-gradient(145deg, #a89579, #85705a)",
    "linear-gradient(145deg, #8f9c8a, #6b7a67)",
    "linear-gradient(145deg, #c08c78, #a06a55)"
  ];

  /* ---------------- 元素引用 ---------------- */
  var el = {
    form: document.getElementById("composer-form"),
    nickname: document.getElementById("nickname"),
    content: document.getElementById("content"),
    counter: document.getElementById("counter"),
    submit: document.getElementById("submit-btn"),
    toast: document.getElementById("toast"),
    list: document.getElementById("feed-list"),
    empty: document.getElementById("empty-state"),
    count: document.getElementById("stat-count"),
    clear: document.getElementById("clear-btn")
  };

  /* ---------------- 状态 ---------------- */
  var state = {
    messages: []
  };
  var toastTimer = null;

  /* ---------------- 存储层 ---------------- */
  function genId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalizeMessage(raw) {
    if (!raw || typeof raw !== "object") return null;
    var content = typeof raw.content === "string" ? raw.content.trim() : "";
    if (!content) return null;

    var nickname = typeof raw.nickname === "string" ? raw.nickname.trim() : "";
    var createdAt = Number(raw.createdAt);
    if (!isFinite(createdAt) || createdAt <= 0) createdAt = Date.now();
    if (createdAt > Date.now()) createdAt = Date.now();

    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : genId(),
      nickname: nickname.slice(0, MAX_NICKNAME) || DEFAULT_NICKNAME,
      content: content.slice(0, MAX_LENGTH),
      createdAt: createdAt
    };
  }

  function loadMessages() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEYS.messages);
    } catch (err) {
      console.warn("读取本地数据失败：", err);
      return [];
    }
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(normalizeMessage)
        .filter(Boolean)
        .sort(function (a, b) {
          return b.createdAt - a.createdAt;
        });
    } catch (err) {
      console.warn("本地数据格式异常，已忽略：", err);
      return [];
    }
  }

  function saveMessages() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(state.messages));
      return true;
    } catch (err) {
      console.warn("保存本地数据失败：", err);
      showToast("本地存储写入失败，可能是浏览器隐私模式或空间已满。");
      return false;
    }
  }

  function loadNickname() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.nickname) || "";
    } catch (err) {
      return "";
    }
  }

  function saveNickname(name) {
    try {
      if (name) window.localStorage.setItem(STORAGE_KEYS.nickname, name);
      else window.localStorage.removeItem(STORAGE_KEYS.nickname);
    } catch (err) {
      /* 昵称记忆失败不影响主流程 */
    }
  }

  /* ---------------- 工具函数 ---------------- */
  function formatTime(timestamp, now) {
    var diff = now - timestamp;
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + " 天前";

    var d = new Date(timestamp);
    var month = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    if (d.getFullYear() === new Date(now).getFullYear()) {
      return month + "-" + day;
    }
    return d.getFullYear() + "-" + month + "-" + day;
  }

  function avatarColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }

  function firstChar(name) {
    return Array.from(name.trim())[0] || "茶";
  }

  function showToast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.toast.classList.remove("is-visible");
      el.toast.textContent = "";
    }, 3000);
  }

  /* ---------------- 渲染层 ---------------- */
  function createPostNode(message, now, animate) {
    var li = document.createElement("li");
    li.className = "post" + (animate ? " post--animate" : "");
    li.dataset.id = message.id;

    var avatar = document.createElement("span");
    avatar.className = "post__avatar";
    avatar.style.backgroundImage = avatarColor(message.nickname);
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = firstChar(message.nickname);

    var body = document.createElement("div");
    body.className = "post__body";

    var meta = document.createElement("div");
    meta.className = "post__meta";

    var name = document.createElement("span");
    name.className = "post__name";
    name.textContent = message.nickname;

    var time = document.createElement("time");
    time.className = "post__time";
    time.dateTime = new Date(message.createdAt).toISOString();
    time.textContent = formatTime(message.createdAt, now);

    meta.appendChild(name);
    meta.appendChild(time);

    var text = document.createElement("p");
    text.className = "post__text";
    text.textContent = message.content;

    body.appendChild(meta);
    body.appendChild(text);

    var del = document.createElement("button");
    del.type = "button";
    del.className = "post__delete";
    del.dataset.action = "delete";
    del.dataset.id = message.id;
    del.setAttribute("aria-label", "删除这条茶话");
    del.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />' +
      '<path d="M6.5 7l.7 12.2a1.8 1.8 0 0 0 1.8 1.8h6a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />' +
      "</svg>";

    li.appendChild(avatar);
    li.appendChild(body);
    li.appendChild(del);
    return li;
  }

  function render(animateIds) {
    var now = Date.now();
    var fragment = document.createDocumentFragment();
    var animateSet = animateIds || null;

    state.messages.forEach(function (message) {
      var animate = !animateSet || animateSet.has(message.id);
      fragment.appendChild(createPostNode(message, now, animate));
    });

    el.list.textContent = "";
    el.list.appendChild(fragment);

    var hasMessages = state.messages.length > 0;
    el.empty.classList.toggle("is-visible", !hasMessages);
    el.list.hidden = !hasMessages;
    el.clear.hidden = !hasMessages;
    el.count.textContent = String(state.messages.length);
  }

  function updateCounter() {
    var length = el.content.value.length;
    el.counter.textContent = length + " / " + MAX_LENGTH;
    el.counter.classList.toggle("is-warning", length >= MAX_LENGTH * 0.9 && length < MAX_LENGTH);
    el.counter.classList.toggle("is-over", length >= MAX_LENGTH);
    el.submit.disabled = length === 0;
  }

  /* ---------------- 事件层 ---------------- */
  function handleSubmit(event) {
    event.preventDefault();

    var content = el.content.value.trim();
    var nickname = el.nickname.value.trim().slice(0, MAX_NICKNAME);

    if (!content) {
      showToast("茶还没泡呢，先写点什么吧。");
      el.content.focus();
      return;
    }

    if (content.length > MAX_LENGTH) {
      showToast("最多只能写 " + MAX_LENGTH + " 个字哦。");
      return;
    }

    var message = {
      id: genId(),
      nickname: nickname || DEFAULT_NICKNAME,
      content: content,
      createdAt: Date.now()
    };

    state.messages.unshift(message);

    if (!saveMessages()) {
      state.messages.shift();
      return;
    }

    saveNickname(nickname);
    render(new Set([message.id]));

    el.content.value = "";
    updateCounter();
    el.content.focus();
  }

  function handleListClick(event) {
    var trigger = event.target.closest("[data-action='delete']");
    if (!trigger) return;

    var id = trigger.dataset.id;
    var target = state.messages.find(function (message) {
      return message.id === id;
    });
    if (!target) return;

    var preview = target.content.length > 18 ? target.content.slice(0, 18) + "…" : target.content;
    if (!window.confirm("确定要删除这条茶话吗？\n\n“" + preview + "”")) return;

    state.messages = state.messages.filter(function (message) {
      return message.id !== id;
    });
    saveMessages();
    render(new Set());
  }

  function handleClear() {
    if (!state.messages.length) return;
    if (!window.confirm("确定清空全部 " + state.messages.length + " 条茶话吗？此操作无法撤销。")) return;

    state.messages = [];
    saveMessages();
    render(new Set());
    showToast("茶桌已收拾干净。");
  }

  function handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (typeof el.form.requestSubmit === "function") {
        el.form.requestSubmit();
      } else {
        handleSubmit(event);
      }
    }
  }

  function bindEvents() {
    el.form.addEventListener("submit", handleSubmit);
    el.content.addEventListener("input", updateCounter);
    el.content.addEventListener("keydown", handleKeydown);
    el.list.addEventListener("click", handleListClick);
    el.clear.addEventListener("click", handleClear);
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    state.messages = loadMessages();
    el.nickname.value = loadNickname();
    bindEvents();
    updateCounter();

    /* 首屏统一淡入；若数据为空则仅展示空状态 */
    render(state.messages.length ? new Set(state.messages.map(function (m) { return m.id; })) : new Set());
    el.content.focus({ preventScroll: true });
  }

  init();
})();
