# 茶话会

一个极简的本地微博。纯 HTML + CSS + JavaScript 实现，无需安装、无需构建、无网络依赖，数据全部保存在浏览器的 Local Storage 中。

## 功能

- 发布茶话：正文最多 200 字，可填昵称（最多 20 字，不填则显示“茶友”）
- 查看茶话：按时间倒序展示，相对时间（刚刚 / x 分钟前 / x 小时前 / 日期）
- 本地持久化：刷新、关闭浏览器后内容仍然存在
- 字数计数、内容为空时禁止发布、`Ctrl / ⌘ + Enter` 快捷发布
- 单条删除（二次确认）、一键清空全部
- 昵称自动记忆、头像按昵称生成配色、移动端响应式布局

## 运行

直接双击 `index.html` 用浏览器打开即可。

如需通过本地服务器访问：

```bash
# 任选其一
python -m http.server 8080
npx serve .
```

然后访问 `http://localhost:8080`。

## 数据存储

| localStorage 键 | 说明 |
| --- | --- |
| `chahua_messages` | 茶话列表，JSON 数组，字段：`id`、`nickname`、`content`、`createdAt`（毫秒时间戳） |
| `chahua_nickname` | 上次使用的昵称 |

清除数据：在浏览器开发者工具 Console 中执行 `localStorage.clear()`，或删除站点数据后刷新页面。

## 目录结构

```
.
├── index.html   # 页面结构：品牌栏、发布卡片、消息流、空状态
├── style.css    # 暖茶主题样式、动效与响应式布局
├── app.js       # 存储层、渲染层、事件层
└── README.md
```

## 技术说明

- 不使用框架、构建工具与第三方库，`<script defer>` 直接引入，双击打开即可运行
- 渲染采用 `textContent` / `createElement`，不拼接用户输入的 HTML，避免 XSS
- 读取 localStorage 时做 JSON 解析容错与字段归一化，数据损坏时安全降级为空列表
