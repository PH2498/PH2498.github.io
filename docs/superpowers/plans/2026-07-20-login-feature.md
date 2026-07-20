# 登录功能 Implementation Plan

> **阶段：** plan（实施计划）  
> **日期：** 2026-07-20  
> **项目：** HPX 个人博客（Hexo 静态站点）  
> **上游澄清：** [docs/design/login-clarification.md](../../design/login-clarification.md)  
> **技能：** writing-plans

---

## Goal

为 HPX 个人博客实现基于 LeanCloud BaaS 的博主后台管理登录功能，含登录页、认证模块、会话管理和受保护的管理后台入口。

## Architecture

采用方案 A：利用已集成的 LeanCloud SDK 的 `AV.User` API 在静态页面中实现前端登录认证。新增 `js/auth.js` 认证模块（遵循现有 `leancloud.js` 的 IIFE 模块模式），配合 `admin/login.html` 登录页和 `admin/index.html` 受保护管理后台。sessionToken 存储于 localStorage，页面加载时通过 `AV.User.become()` 校验登录态。

## Tech Stack

- **前端：** 原生 HTML + CSS + JavaScript（IIFE 模块模式）
- **认证后端：** LeanCloud BaaS（AV.User API）
- **SDK：** 已集成 LeanCloud JavaScript SDK（通过 `AV` 全局对象）
- **会话存储：** localStorage（sessionToken）

## Global Constraints

- 零新依赖：复用已集成的 LeanCloud SDK，不引入新库
- 最小改动：仅新增文件，不修改现有博客页面和 JS 模块
- 模块模式：遵循现有 `js/*.js` 的 `(function(window, document) { ... })(window, document);` IIFE 风格
- 不在本期范围：用户注册（LeanCloud 控制台手动创建博主账号）、密码找回、第三方登录、多用户/权限管理
- 安全基线：登录表单输入过滤、管理后台页面鉴权守卫、HTTPS 传输（依赖部署平台）

---

## 文件清单

| 文件 | 操作 | 用途 |
|------|------|------|
| `js/auth.js` | 新增 | 认证模块：`login()`、`logout()`、`checkAuth()`、`requireAuth()` 守卫 |
| `admin/login.html` | 新增 | 登录页面：用户名 + 密码表单 |
| `admin/index.html` | 新增 | 管理后台入口页（受保护，含登出按钮） |
| `css/login.css` | 新增 | 登录页专属样式 |

---

## 任务列表

### Task 1: 创建认证模块 `js/auth.js`

- [ ] **状态：** pending

**交付物：** `js/auth.js`

**内容：**
- 遵循现有 `js/leancloud.js` 的 IIFE 模式：`(function(window, document) { ... })(window, document);`
- 暴露全局 `window.Auth` 对象，包含以下方法：
  - `login(username, password)` — 调用 `AV.User.logIn()`，成功后将 `sessionToken` 和 `username` 存入 `localStorage`，返回 Promise
  - `logout()` — 调用 `AV.User.logOut()`，清除 `localStorage` 中的认证数据，跳转至 `login.html`
  - `checkAuth()` — 从 `localStorage` 读取 `sessionToken`，调用 `AV.User.become()` 校验，返回 Promise<Boolean>
  - `requireAuth()` — 守卫函数：调用 `checkAuth()`，失败则 `window.location.href` 跳转至 `login.html`
- 错误处理：登录失败时返回可读错误信息（用户名/密码错误、网络异常等）
- 依赖前提：全局 `AV` 对象（LeanCloud SDK）已由 `leancloud.js` 初始化

**测试方法：**
- 在浏览器控制台手动调用 `Auth.checkAuth()` 验证未登录时返回 false
- 模拟有效/无效 sessionToken 验证 `AV.User.become()` 行为

---

### Task 2: 创建登录页面 `admin/login.html`

- [ ] **状态：** pending

**交付物：** `admin/login.html`

**内容：**
- 独立 HTML5 页面，引入 LeanCloud SDK（复用现有 CDN 路径）、`leancloud.js`（初始化 AV）、`auth.js`、`login.css`
- 登录表单：用户名输入框（`<input type="text" name="username">`）、密码输入框（`<input type="password" name="password">`）、登录按钮
- 表单提交事件：调用 `Auth.login(username, password)`，成功跳转 `admin/index.html`，失败显示错误提示
- 加载时检查：若已登录（`Auth.checkAuth()` 为 true），自动跳转 `admin/index.html`
- 防重复提交：登录请求进行中时禁用按钮
- 错误提示区域：`<div id="error-msg">` 用于显示登录失败信息

**测试方法：**
- 浏览器打开 `admin/login.html`，验证表单渲染正确
- 输入错误凭据，验证错误提示显示
- 空白输入提交，验证前端校验

---

### Task 3: 创建登录页样式 `css/login.css`

- [ ] **状态：** pending

**交付物：** `css/login.css`

**内容：**
- 居中卡片式布局：flexbox 垂直水平居中，白色卡片 + 阴影
- 表单元素样式：输入框、按钮（与博客整体设计风格协调，参考 `main.css` 色调）
- 响应式：移动端适配（max-width 约束 + padding 调整）
- 错误提示样式：红色文字，淡入动画
- 加载状态：按钮禁用态样式

**测试方法：**
- 浏览器打开 `admin/login.html`，验证视觉样式在不同视口下正常
- 验证错误提示动画和按钮禁用态

---

### Task 4: 创建管理后台入口 `admin/index.html`

- [ ] **状态：** pending

**交付物：** `admin/index.html`

**内容：**
- 独立 HTML5 页面，引入 LeanCloud SDK、`leancloud.js`、`auth.js`、`main.css`
- 页面加载时立即调用 `Auth.requireAuth()` 进行鉴权守卫，未登录自动跳转 `login.html`
- 登录成功后显示：
  - 欢迎信息：显示当前登录用户名（从 `localStorage` 读取）
  - 登出按钮：调用 `Auth.logout()`
  - 管理功能占位区：预留后续文章管理、评论管理等功能的入口
- 最小可用仪表盘：显示博客基础统计（文章数、分类数、标签数——可从公开页面抓取或用 LeanCloud Counter 数据）

**测试方法：**
- 未登录直接访问 `admin/index.html`，验证自动跳转至 `login.html`
- 登录后访问，验证欢迎信息和登出功能正常
- 点击登出，验证跳转至 `login.html` 且无法再直接访问 `admin/index.html`

---

## 数据流

```
登录流程：
  用户输入 username + password
  → Auth.login() 调用 AV.User.logIn()
  → LeanCloud 返回 { sessionToken, user }
  → 存储 sessionToken + username 到 localStorage
  → 跳转 admin/index.html

鉴权守卫：
  页面加载 → Auth.requireAuth() → Auth.checkAuth()
  → 读取 localStorage sessionToken
  → AV.User.become(sessionToken)
  → 成功：渲染受保护内容
  → 失败：跳转 login.html

登出流程：
  点击登出 → Auth.logout()
  → AV.User.logOut()
  → 清除 localStorage 认证数据
  → 跳转 login.html
```

## 依赖与前置条件

| 前置条件 | 状态 | 说明 |
|---------|------|------|
| LeanCloud AppId/AppKey 已配置 | 假设已配置 | `js/leancloud.js` 已存在并初始化 AV |
| LeanCloud 博主账号已创建 | 需手动操作 | 在 LeanCloud 控制台 `_User` 表中手动创建用户 |
| 部署平台支持直接 URL 访问 | 假设支持 | 静态托管（GitHub Pages/Vercel/Netlify）通常支持 |
| 部署平台启用 HTTPS | 假设已启用 | 保护登录凭证明文传输 |

## 安全考量

| 风险 | 缓解措施 |
|------|---------|
| XSS 窃取 token | 输入过滤 + 依赖部署平台 CSP 头 |
| Token 过期 | sessionToken 默认有效期 1 年 |
| 暴力破解 | LeanCloud 内置登录失败次数限制 |
| 页面直接访问 | `requireAuth()` 守卫在页面加载时立即执行 |

## 验证检查清单

- [ ] `admin/login.html` 可正常加载并显示登录表单
- [ ] 错误凭据登录显示错误提示，不清空输入框
- [ ] 正确凭据登录后跳转 `admin/index.html`
- [ ] 未登录直接访问 `admin/index.html` 自动跳转登录页
- [ ] 登录后 `admin/index.html` 显示用户名和登出按钮
- [ ] 登出后无法再次访问 `admin/index.html`
- [ ] 登录态在浏览器刷新后保持（localStorage sessionToken 持久化）