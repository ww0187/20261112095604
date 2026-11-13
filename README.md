# 茶话会

一个极简的本地微博。纯 HTML + CSS + JavaScript 实现，无需安装、无需构建、无网络依赖，数据全部保存在浏览器的 Local Storage 中。

## 界面预览

<p align="center">
  <img src="docs/preview-desktop.png" alt="茶话会桌面端界面" width="720" />
</p>

<p align="center">
  <img src="docs/preview-mobile.png" alt="茶话会移动端界面（390px）" width="300" />
</p>

## 视觉风格

暖秋主题：枫叶红与柿子橙渐变品牌栏、奶油黄纸感卡片、金桂色时间标签，页面底色铺满低透明度的桂花与枫叶剪影纹样（内联 SVG，无外部图片与字体，离线可用）。所有颜色、圆角、阴影与纹样集中定义在 `style.css` 的 `:root` 变量中，支持 `prefers-reduced-motion` 动效降级。

## 功能

- 发布茶话：正文最多 200 字，可填昵称（最多 20 字，不填则显示“茶友”）
- 查看茶话：按时间倒序展示，相对时间（刚刚 / x 分钟前 / x 小时前 / 日期）
- 本地持久化：刷新、关闭浏览器后内容仍然存在
- 字数计数、内容为空时禁止发布、`Ctrl / ⌘ + Enter` 快捷发布
- 单条删除（二次确认）、一键清空全部
- 昵称自动记忆、头像按昵称生成配色、移动端响应式布局
- 首次打开自动载入 10 条示例茶话，开箱即有内容

## 示例数据

首次打开时，若本地还没有任何茶话记录（`chahua_messages` 不存在），应用会从内置昵称池（12 个）与文案池（18 条）中随机抽取 10 条示例茶话写入本地存储。昵称与文案在同一批内互不重复，时间从「刚刚」一直铺到 5～6 天前，用于演示与截图。

- 注入只发生一次：刷新页面不会重复生成，也不会覆盖已有内容
- 示例茶话与真实内容同等对待，可正常删除
- 点击「清空全部」后写入空数组，刷新仍为空，不会再次回填
- 想重新生成一组示例：在 Console 执行 `localStorage.removeItem('chahua_messages')` 后刷新
- 彻底重置：执行 `localStorage.clear()` 后刷新

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
├── app.js       # 存储层、示例数据、渲染层、事件层
├── docs/        # README 使用的界面截图
│   ├── preview-desktop.png
│   └── preview-mobile.png
└── README.md
```

## 技术说明

- 不使用框架、构建工具与第三方库，`<script defer>` 直接引入，双击打开即可运行
- 渲染采用 `textContent` / `createElement`，不拼接用户输入的 HTML，避免 XSS
- 读取 localStorage 时做 JSON 解析容错与字段归一化，数据损坏时安全降级为空列表
