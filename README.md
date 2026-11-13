# 茶话会

一个极简的本地微博，使用 **Node.js + Vue 3 + Pinia** 实现，数据全部保存在浏览器 Local Storage 中。项目以 **TDD（测试驱动开发）** 的方式编写：先写失败的测试，再实现到测试通过。

## 界面预览

<p align="center">
  <img src="docs/preview-desktop.png" alt="茶话会桌面端界面" width="720" />
</p>

<p align="center">
  <img src="docs/preview-mobile.png" alt="茶话会移动端界面（390px）" width="300" />
</p>

## 视觉风格

暖秋主题：枫叶红与柿子橙渐变品牌栏、奶油黄纸感卡片、金桂色时间标签，页面底色铺满低透明度的桂花与枫叶剪影纹样（内联 SVG，无外部图片与字体，离线可用）。所有颜色、圆角、阴影与纹样集中定义在 `src/styles/main.css` 的 `:root` 变量中，支持 `prefers-reduced-motion` 动效降级。

## 功能

- 发布茶话：正文最多 200 字，可填昵称（最多 20 字，不填则显示“茶友”）
- 查看茶话：按时间倒序展示，相对时间（刚刚 / x 分钟前 / x 小时前 / x 天前 / 日期）
- 本地持久化：刷新、关闭浏览器后内容仍然存在
- 字数计数、内容为空时禁止发布、`Ctrl / ⌘ + Enter` 快捷发布
- 单条删除（二次确认）、一键清空全部
- 昵称自动记忆、头像按昵称生成暖秋配色、移动端响应式布局
- 首次打开自动载入 10 条示例茶话，开箱即有内容

## 技术栈

| 层面 | 选型 |
| --- | --- |
| 运行时 | Node.js ≥ 20.19（推荐 22 / 24 LTS） |
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 状态管理 | Pinia（setup 之外的 options store 写法，含 getters / actions） |
| 构建 | Vite 7 |
| 测试 | Vitest + @vue/test-utils + jsdom |
| 存储 | 浏览器 Local Storage（无后端、无网络请求） |

## 快速开始

```bash
npm install
npm run dev      # 开发服务器
npm test         # 运行全部单元 / 组件测试
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览生产构建
```

## 测试驱动开发

项目遵循红 → 绿 → 重构的节奏：

1. **红**：先在 `src/**/*.spec.js` 中描述期望行为（store 的注入与持久化、时间格式化、组件交互、App 集成），运行 `npm test` 确认失败。
2. **绿**：再实现 `src/stores/messages.js`、`src/utils/*` 与各组件，直到全部测试通过。
3. **重构**：在测试保护下拆分组件与样式，保持行为不变。

当前覆盖 7 个测试文件、45 个用例：

| 测试文件 | 关注点 |
| --- | --- |
| `src/utils/time.spec.js` | 相对时间边界（刚刚 / 分钟 / 小时 / 天 / 日期 / 跨年 / 非法值） |
| `src/utils/avatar.spec.js` | 头像渐变确定性、首字兜底 |
| `src/stores/messages.spec.js` | 首次注入、已有数据不重复注入、损坏降级、清空不回填、新增/删除/清空、昵称记忆、200 字截断 |
| `src/components/MessageComposer.spec.js` | 计数、按钮禁用、trim 提交、空内容拦截、Ctrl+Enter、输入上限 |
| `src/components/MessageItem.spec.js` | 渲染、头像、HTML 转义、换行保留、删除事件 |
| `src/components/MessageList.spec.js` | 列表渲染、空状态、事件透传 |
| `src/App.spec.js` | 集成：首访统计、发布、删除、清空、刷新持久化 |

```bash
npm run test:watch   # 监听模式，TDD 时使用
```

除自动化测试外，交付前还用 Playwright 在生产构建上做了 19 项端到端校验（发布、持久化、删除、清空、移动端无横向溢出、控制台无报错），并据此生成 README 截图。

## 目录结构

```
.
├── index.html                  # Vite 入口 HTML
├── vite.config.js              # Vite + Vitest 配置（jsdom、setupFiles、别名）
├── package.json
├── src/
│   ├── main.js                 # 创建应用、注册 Pinia、引入全局样式
│   ├── App.vue                 # 页面装配：品牌栏 + 发布卡片 + 消息流 + 页脚
│   ├── App.spec.js
│   ├── components/
│   │   ├── BrandHeader.vue     # 品牌栏与统计
│   │   ├── MessageComposer.vue # 发布表单（校验、计数、快捷发布）
│   │   ├── MessageList.vue     # 消息列表 / 空状态切换
│   │   ├── MessageItem.vue     # 单条茶话卡片
│   │   ├── EmptyState.vue
│   │   └── *.spec.js
│   ├── stores/
│   │   ├── messages.js         # Pinia store：状态、持久化、增删改
│   │   └── messages.spec.js
│   ├── utils/
│   │   ├── time.js             # 相对时间格式化
│   │   ├── avatar.js           # 头像渐变 / 首字
│   │   └── *.spec.js
│   ├── data/seed.js            # 示例茶话的昵称池、文案池与生成器
│   └── styles/main.css         # 暖秋主题、纹样、响应式
├── tests/setup.js              # 每个用例前清空 localStorage、mock confirm
└── docs/                       # README 使用的界面截图
```

## 数据存储

| localStorage 键 | 说明 |
| --- | --- |
| `chahua_messages` | 茶话列表，JSON 数组，字段：`id`、`nickname`、`content`、`createdAt`（毫秒时间戳） |
| `chahua_nickname` | 上次使用的昵称 |

### 示例数据

首次访问时若 `chahua_messages` 不存在，会从 12 个昵称与 18 条文案中随机抽取 10 条写入本地，时间从「刚刚」铺到 5～6 天前：

- 只注入一次，刷新不会重复生成，也不会覆盖已有内容
- 示例茶话可正常删除；点击「清空全部」会写入空数组，刷新不会回填
- 重新生成一组示例：`localStorage.removeItem('chahua_messages')` 后刷新
- 彻底重置：`localStorage.clear()` 后刷新

## 说明

项目最初是纯 HTML/CSS/JavaScript 版本（无构建、双击即用），后按 TDD 改写为 Vue 3 + Pinia 版本；原生实现保留在 Git 历史中，可用 `git log` 查看。
