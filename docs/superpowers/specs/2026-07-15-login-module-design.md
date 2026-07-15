# 登录功能模块 — 设计文档

> 日期：2026-07-15  
> 状态：草稿（待评审）  
> 关联项目：Hexo 静态博客 (Fluid 主题 v1.9.0，Bootstrap 4.5 + jQuery 3.5)  
> 作者：郝培贤

---

## 1. 现状分析

| 项目 | 现状 |
|------|------|
| 站点类型 | Hexo 生成的纯静态博客，无服务端运行时 |
| 主题 | Fluid v1.9.0，支持亮/暗色模式（`color-schema.js`），CSS 变量：`--text-color`、`--sec-text-color`、`--bg-color` |
| LeanCloud | `js/leancloud.js` 存在，但 CONFIG 中 `app_id`/`app_key` 均为 `null`，`web_analytics.enable=false`，**实际未启用** |
| 认证能力 | 无 |
| 已有基础设施 | Bootstrap Modal（搜索弹窗已用）、jQuery、localStorage、暗色模式切换 |
| Hexo 注入机制 | Fluid 主题支持 `_config.fluid.yml` 中 `custom_js`/`custom_css` 字段，可用于注入自定义脚本和样式到所有页面 |

---

## 2. 方案对比

### 方案 A：LeanCloud BaaS（推荐 ✅）

引入 LeanCloud SDK（`av-min.js`），调用 `AV.User` API，利用 LeanCloud 托管 `_User` 表完成认证。

| 维度 | 评价 |
|------|------|
| 复杂度 | 低。LeanCloud 提供完整用户系统，只需前端 SDK 调用 |
| 后端依赖 | 零。BaaS，无需自建服务端 |
| 与现有栈契合度 | **高**。博客已有 `leancloud.js`，CONFIG 中 `leancloud` 字段可直接复用 |
| 功能完整度 | 高。注册/登录（用户名+密码/邮箱+密码）/登出/密码重置/Session 管理全部内置 |
| 安全 | 中。sessionToken 存 localStorage，受 XSS 威胁；HTTPS 传输 |
| 费用 | 开发版免费：500 活跃用户/天，3 万次 API 请求/天 |
| 风险 | LeanCloud 服务不可用则认证功能降级为「无登录入口」 |

### 方案 B：纯前端密码门（不推荐）

密码 hash 硬编码在 JS 中，前端比对后设置 localStorage 标记。

| 维度 | 评价 |
|------|------|
| 功能完整度 | 极低。仅单用户密码验证，无注册/重置/多用户 |
| 安全 | **极低**。密码 hash 暴露在 JS 源码中 |

### 方案 C：第三方认证 SaaS（Auth0 / Firebase Auth）

| 维度 | 评价 |
|------|------|
| 与现有栈契合度 | 低。引入新依赖，CONFIG 需新增字段 |
| 功能完整度 | 极高（社交登录、MFA 等），但过度设计（YAGNI） |

### 最终选择：方案 A

与博客现有技术栈完全一致，无需引入新服务商，功能完整且个人博客完全够用。

---

## 3. 前置依赖

| 步骤 | 操作 |
|------|------|
| 1 | [LeanCloud 控制台](https://console.leancloud.cn) 创建应用（开发版免费），获取 `AppId`、`AppKey`、`serverURL` |
| 2 | 控制台 → 存储 → 用户 → 设置 → 勾选「启用用户注册」 |
| 3 | 控制台 → 存储 → 用户 → 设置 → 配置「重置密码邮件模板」（可选） |
| 4 | 更新 Hexo `_config.fluid.yml`（或 `_config.yml`）中 `leancloud` 字段，`web_analytics.enable` 设为 `true` |
| 5 | 确保 LeanCloud 控制台 → 设置 → 安全 → 「允许未经验证的邮箱登录」已开启（默认开启） |

**CONFIG 完整结构**（`_config.fluid.yml` 中生成，嵌入页面 `<script>` 块）：

```js
CONFIG.web_analytics.leancloud = {
  app_id:      "your-app-id",
  app_key:     "your-app-key",
  server_url:  "https://xxx.lc-cn-n1-shared.com",
  path:        "window.location.pathname",
  ignore_local: false
};
```

---

## 4. 架构

```
┌── 浏览器 ──────────────────────────────────────────────────┐
│  ┌─ UI ───────────────────────────────────────────────────┐ │
│  │  #auth-modal (Bootstrap Modal，三面板共用)              │ │
│  │  ├─ #auth-form-login / #auth-form-register / #auth-form-reset │
│  │  Navbar: 注入到 #navbarSupportedContent > ul.navbar-nav │ │
│  │  ├─ ANONYMOUS → 「登录」按钮                            │ │
│  │  └─ LOGGED_IN → 用户名 + 下拉菜单（登出）              │ │
│  └──────────────┬─────────────────────────────────────────┘ │
│  ┌─ 核心 ───────┴─────────────────────────────────────────┐ │
│  │  window.Auth (IIFE)                                     │ │
│  │  ├─ SessionManager  — AV.User.current() + localStorage  │ │
│  │  ├─ UIController    — Modal 创建/切换 + navbar 注入     │ │
│  │  ├─ Validator       — 实时校验 (200ms debounce)         │ │
│  │  └─ ErrorMapper     — 错误码 → 中文                     │ │
│  └──────────────┬─────────────────────────────────────────┘ │
│  ┌──────────────┴─────────────────────────────────────────┐ │
│  │  LeanCloud SDK (av-min.js CDN) + AV.init()              │ │
│  └──────────────┬─────────────────────────────────────────┘ │
│  ┌─ 主题适配 ───┴─────────────────────────────────────────┐ │
│  │  auth.css: --text-color / --sec-text-color / --bg-color │ │
│  │  [data-color-scheme="dark"] 自动跟随亮/暗色模式         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌─ 跨标签页同步 ─┴───────────────────────────────────────┐ │
│  │  window.addEventListener('storage', syncAuthState)       │ │
│  │  标签页 A 登录/登出 → 标签页 B 自动感知                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────┼──────────────────────────────────────────┘
                  │ HTTPS → LeanCloud _User 表
```

---

## 5. 组件规格

### 5.1 `js/auth.js`（~280 行）

**接口**（IIFE，`window.Auth`，与 `leancloud.js` 风格一致）：

```js
window.Auth = (function() {
  'use strict';
  var _state = 'UNKNOWN';  // UNKNOWN | CHECKING | ANONYMOUS | LOGGED_IN
  var _currentUser = null;
  var _listeners = [];
  var _modalAlive = false;

  // ── 公开 API ──
  return {
    init:       function() { /* 恢复会话 + 注入 UI + 绑定 storage 事件 */ },
    login:      function(identifier, password) { /* 支持用户名/邮箱 → Promise<AV.User> */ },
    loginWithEmail: function(email, password) { /* → Promise<AV.User> */ },
    register:   function(username, password, email) { /* → Promise<AV.User> */ },
    logout:     function() { /* 清除 session + 广播 storage 事件 */ },
    requestPasswordReset: function(email) { /* → Promise */ },
    getCurrentUser: function() { return _currentUser; },
    isLoggedIn: function() { return _state === 'LOGGED_IN'; },
    onStateChange: function(fn) { _listeners.push(fn); }
  };
})();
```

**子模块**：

| 子模块 | 职责 | 关键细节 |
|--------|------|---------|
| `SessionManager` | 会话生命周期 | `AV.User.current()` 从 localStorage 读取 sessionToken 并调用 LeanCloud 验证；`LeanCloud_Auth_State` 辅助快速 UI 恢复；**注意**：用户手动清除浏览器 localStorage 会导致登录态丢失 |
| `UIController` | DOM 生命周期 | 三面板共用同一 Modal；`.auth-switch` 切换面板+更新标题；`_modalAlive` 防关闭后回调误操作；ESC 键关闭 Modal（Bootstrap 默认行为） |
| `Validator` | 实时校验 | `input` 事件 + 200ms debounce；用户名 `/^[a-zA-Z0-9_]{3,20}$/`；密码 `≥8` 位且含字母和数字（推荐复杂度，前端建议用 `.invalid-feedback` 提示，不做硬拦截）；邮箱 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`；确认密码一致性 |
| `ErrorMapper` | 错误码→中文 | 集中映射表，未匹配降级 `error.rawMessage` |
| `CrossTabSync` | 多标签页同步 | `window.addEventListener('storage', handler)` 监听 `LeanCloud_Auth_State` 键变化，自动同步 UI |

**依赖**：`AV`（`av-min.js`）、`CONFIG.web_analytics.leancloud`、`jQuery`+`Bootstrap`（已全局加载）。

### 5.2 Modal DOM 结构

三面板共用 Modal，通过 `display:none/block` 切换：

```html
<div class="modal fade" id="auth-modal" tabindex="-1" role="dialog" aria-labelledby="auth-modal-title" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-sm">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="auth-modal-title">登录</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="关闭">&times;</button>
      </div>
      <div class="modal-body">
        <div class="auth-alert d-none" id="auth-alert" role="alert"></div>

        <!-- 登录面板 -->
        <form id="auth-form-login" class="auth-form" novalidate>
          <div class="form-group">
            <input name="username" class="form-control" placeholder="用户名或邮箱"
                   autocomplete="username" required>
            <div class="invalid-feedback"></div>
          </div>
          <div class="form-group">
            <input name="password" type="password" class="form-control" placeholder="密码"
                   autocomplete="current-password" required>
            <div class="invalid-feedback"></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">登 录</button>
          <div class="auth-links">
            <a href="#" class="auth-switch" data-target="register">注册账号</a>
            <a href="#" class="auth-switch" data-target="reset">忘记密码?</a>
          </div>
        </form>

        <!-- 注册面板（初始隐藏） -->
        <form id="auth-form-register" class="auth-form" style="display:none" novalidate>
          <div class="form-group">
            <input name="username" class="form-control" placeholder="用户名 (3-20位字母数字下划线)"
                   autocomplete="username" required>
            <div class="invalid-feedback"></div>
          </div>
          <div class="form-group">
            <input name="email" type="email" class="form-control" placeholder="邮箱"
                   autocomplete="email" required>
            <div class="invalid-feedback"></div>
          </div>
          <div class="form-group">
            <input name="password" type="password" class="form-control" placeholder="密码 (至少8位，含字母和数字)"
                   autocomplete="new-password" required>
            <div class="invalid-feedback"></div>
          </div>
          <div class="form-group">
            <input name="confirm" type="password" class="form-control" placeholder="确认密码"
                   autocomplete="new-password" required>
            <div class="invalid-feedback"></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">注 册</button>
          <div class="auth-links">
            <a href="#" class="auth-switch" data-target="login">已有账号？去登录</a>
          </div>
        </form>

        <!-- 重置密码面板（初始隐藏） -->
        <form id="auth-form-reset" class="auth-form" style="display:none" novalidate>
          <div class="form-group">
            <input name="email" type="email" class="form-control" placeholder="注册邮箱"
                   autocomplete="email" required>
            <div class="invalid-feedback"></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">发送重置邮件</button>
          <div class="auth-links">
            <a href="#" class="auth-switch" data-target="login">返回登录</a>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
```

**切换规则**：点击 `.auth-switch[data-target]` → 隐藏当前 `form` → 显示目标 `form` → 更新 `modal-title` → 清空 `#auth-alert`。

**可访问性**：`role="dialog"`、`aria-labelledby`、`aria-hidden`、`aria-label="关闭"`、`role="alert"` 均已标注。Bootstrap Modal 默认支持 ESC 关闭和焦点管理。

### 5.3 `css/auth.css`（~110 行）

```css
.auth-links { display: flex; justify-content: space-between; margin-top: 12px; font-size: 0.875rem; }
.auth-links a { color: var(--sec-text-color, #6c757d); text-decoration: none; }
.auth-links a:hover { color: #0d6efd; }
.auth-links a:focus { outline: 2px solid #0d6efd; outline-offset: 2px; }

.auth-alert { padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 0.875rem; }
.auth-alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.auth-alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }

.btn-auth-loading { position: relative; pointer-events: none; opacity: 0.7; }
.btn-auth-loading::after {
  content: ''; width: 16px; height: 16px;
  border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%;
  animation: auth-spin 0.6s linear infinite;
  display: inline-block; margin-left: 8px; vertical-align: middle;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }

/* 暗色模式 — 跟随 Fluid color-schema.js */
[data-color-scheme="dark"] .auth-alert-error { background: rgba(220,53,69,0.2); color: #f5c6cb; }
[data-color-scheme="dark"] .auth-alert-success { background: rgba(40,167,69,0.2); color: #c3e6cb; }
[data-color-scheme="dark"] #auth-modal .modal-content { background-color: var(--bg-color); color: var(--text-color); }
[data-color-scheme="dark"] #auth-modal .form-control { background-color: var(--bg-color); color: var(--text-color); border-color: var(--sec-text-color); }
[data-color-scheme="dark"] #auth-modal .form-control:focus { background-color: var(--bg-color); color: var(--text-color); border-color: #0d6efd; box-shadow: 0 0 0 0.2rem rgba(13,110,253,0.25); }
[data-color-scheme="dark"] #auth-modal .close { color: var(--text-color); }

@media (max-width: 576px) {
  #auth-modal .modal-dialog { margin: 0.5rem; }
  #auth-modal .modal-body { padding: 1rem; }
}
```

### 5.4 Navbar 注入

**注入路径**：`#navbarSupportedContent > ul.navbar-nav` 末端，`appendChild`。

```html
<!-- ANONYMOUS -->
<li class="nav-item" id="auth-nav-item">
  <a class="nav-link" href="javascript:;" id="auth-nav-login-btn" role="button">
    <i class="iconfont icon-user-fill"></i> 登录
  </a>
</li>

<!-- LOGGED_IN -->
<li class="nav-item dropdown" id="auth-nav-item">
  <a class="nav-link dropdown-toggle" href="javascript:;" data-toggle="dropdown"
     id="auth-nav-user-menu" role="button" aria-haspopup="true" aria-expanded="false">
    <i class="iconfont icon-user-fill"></i> <span id="auth-nav-username"></span>
  </a>
  <div class="dropdown-menu dropdown-menu-right">
    <a class="dropdown-item" href="javascript:;" id="auth-nav-logout-btn" role="button">退出登录</a>
  </div>
</li>
```

**降级**：未找到容器则静默跳过。

---

## 6. 状态机

```
UNKNOWN →(AV.init)→ CHECKING →(sessionToken有效)→ LOGGED_IN
                              →(sessionToken无效)→ ANONYMOUS
LOGGED_IN →(logout)→ ANONYMOUS
ANONYMOUS →(login/register)→ LOGGED_IN

多标签页同步:
  storage 事件 → 标签页 B 读取 localStorage 中 LeanCloud_Auth_State
  → 若与当前状态不一致 → 调用 AV.User.current() 重新验证 → 更新 UI
```

UI：UNKNOWN/CHECKING 不显示入口；LOGGED_IN 显示用户名+菜单；ANONYMOUS 显示登录按钮。

---

## 7. 关键流程

### 7.1 登录（支持用户名或邮箱）

```
点击「登录」→ 显示 Modal (login 面板)
  → 输入用户名/邮箱 + 密码 → 实时校验
  → 提交：按钮 loading 态 + 禁用重复提交
  → 策略：优先调用 AV.User.logIn(username, password)
          → 若返回错误码 211（用户不存在）且输入含 @
            → 自动 fallback 调用 AV.User.loginWithEmail(email, password)
          → 其他错误码直接显示，不 fallback
  → 成功: 关闭 Modal → 状态 LOGGED_IN → 更新 navbar
          → sessionToken 由 LeanCloud SDK 自动写入 localStorage
          → 手动写入 localStorage['LeanCloud_Auth_State'] = 'LOGGED_IN'
  → 失败: 解除 loading → .auth-alert 显示错误码对应中文提示
```

### 7.2 注册

```
Modal 切换到 register 面板
  → 输入 + 实时校验 (用户名 3-20 位 / 密码 ≥8 位含字母数字 / 确认一致 / 邮箱格式)
  → 提交: loading 态
  → AV.User.signUp({username, password, email})
  → 成功: 自动登录 → 同登录成功流程
  → 失败: 解除 loading → 显示错误
```

### 7.3 密码重置

```
Modal 切换到 reset 面板 → 输入邮箱
  → AV.User.requestPasswordReset(email)
  → 成功: .auth-alert 绿色提示 — "重置邮件已发送，请查收"
  → 失败: 显示错误提示
```

### 7.4 会话恢复

```
auth.js 加载 → AV.User.current() 同步读取缓存
  (从 localStorage 读取 sessionToken 和缓存的 AV.User 对象)
  → 缓存命中 → 直接恢复 LOGGED_IN → 注入用户菜单
    (LeanCloud SDK 后台异步验证 sessionToken 有效性，过期则自动降级)
  → 缓存未命中 → ANONYMOUS → 注入登录按钮
  → AV 未初始化 (app_id 为空) → UNKNOWN → 不注入任何入口
```

### 7.5 多标签页同步

```
标签页 A 登录 → localStorage.setItem('LeanCloud_Auth_State', 'LOGGED_IN')
  → 浏览器触发标签页 B 的 storage 事件
  → 标签页 B 读取新状态 → 与当前状态对比
  → 若不一致 → AV.User.current() 重新验证 → 更新 UI
  → 同理：登出触发反向同步
```

---

## 8. LeanCloud `_User` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `objectId` | String | 自动生成，唯一标识 |
| `username` | String | 唯一，必填 |
| `password` | String | 自动加盐哈希存储 |
| `email` | String | 唯一，用于密码重置和邮箱登录 |
| `emailVerified` | Boolean | 默认 false（本设计不要求验证） |
| `sessionToken` | String | 存于 localStorage，验证半衰期 1 小时，绝对过期 1 年 |
| `createdAt`/`updatedAt` | Date | 自动生成 |

---

## 9. Session 生命周期

| 参数 | 说明 |
|------|------|
| sessionToken 默认有效期 | **1 年**（LeanCloud 默认配置），可在控制台 → 设置 → 安全中调整 |
| sessionToken 验证半衰期 | **1 小时**。客户端每 1 小时重新验证一次 sessionToken 有效性 |
| `rememberMe` 参数 | `AV.User.logIn()` 默认 `rememberMe=true`，sessionToken 有效期 1 年；设为 `false` 则为浏览器会话级（关闭即失效） |
| 用户手动清除 localStorage | 登录态丢失。下次 `AV.User.current()` 返回 null → 显示 ANONYMOUS |
| sessionToken 过期 | 下次 API 调用返回 401 → 自动清除 → ANONYMOUS → 提示"登录已过期，请重新登录" |

---

## 10. 错误码映射

| 错误码 | 提示 |
|--------|------|
| 210 | 用户名或密码错误 |
| 211 | 用户不存在 |
| 202 | 用户名已被占用 |
| 203 | 该邮箱已被注册 |
| 125 | 邮箱地址无效 |
| 216 | 邮箱未验证（若开启强制验证） |
| 219 | 登录失败次数过多，请稍后重试 |
| 网络超时 (SDK Error) | 网络连接失败，请检查网络后重试 |
| 其他 | 操作失败，请稍后重试（附带 `error.rawMessage`） |

**原则**：报错不清空输入、不关闭弹窗。

---

## 11. 边界条件与防御

| 场景 | 处理 |
|------|------|
| 快速双击提交 | 按钮 `loading` 态 + `pointer-events: none`，防重复请求 |
| 请求未返回时关闭 Modal | 不中止请求，`_modalAlive` 标记忽略回调 |
| 已登录再次点击登录 | 静默忽略 |
| SessionToken 过期 | 401 → 自动清除 → ANONYMOUS → 提示"登录已过期，请重新登录" |
| `av-min.js` 加载失败 | `typeof AV === 'undefined'` → 静默退出 |
| `app_id` 为空 | 同 SDK 未加载，静默退出 |
| 移动端软键盘弹出 | `modal-dialog-centered` + Bootstrap 自动处理 |
| 暗色模式切换 | `[data-color-scheme="dark"]` 自动适配 |
| 用户清除 localStorage | 下次访问显示 ANONYMOUS，用户重新登录即可 |
| LeanCloud API 超限 | 开发版 3 万次/天。以博客+认证场景，正常使用不会触发；若触发则返回 429，降级为"服务繁忙，请稍后重试" |
| 邮箱登录/用户名登录判断 | 按输入是否含 `@` 字符自动分发到对应 API |

---

## 12. 安全性

| 层面 | 措施 |
|------|------|
| 传输 | HTTPS |
| 密码存储 | LeanCloud 服务端加盐哈希，客户端不存明文 |
| 密码强度 | 建议 ≥8 位且含字母和数字（前端提示，不做硬拦截） |
| 会话 | `sessionToken` 存 localStorage（非 Cookie → 免疫 CSRF） |
| XSS | 用户输入通过 `textContent` / `.text()` 渲染 |
| 校验 | 前端仅 UX 校验，所有安全校验（唯一性、格式合法性）由 LeanCloud 服务端执行 |
| 降级 | SDK 失败时静默退出，不暴露错误堆栈到控制台 |
| 邮箱验证 | 默认不强制，可在 LeanCloud 控制台开启 |

---

## 13. 注入方式（Hexo 兼容）

### 推荐方式：Fluid 主题 `custom_js` / `custom_css`

在 Hexo 根目录 `_config.fluid.yml`（或 `_config.yml`）中配置：

```yaml
# _config.fluid.yml
custom_js:
  - https://cdn.jsdelivr.net/npm/leancloud-storage@4/dist/av-min.js
  - /js/auth.js
custom_css:
  - /css/auth.css
```

Fluid 主题在构建时会自动将 `custom_js` 列表注入到所有页面 `<script>` 块末尾（`boot.js` 之前），`custom_css` 注入到 `<head>`。

**AV.init() 初始化脚本**：由于有顺序依赖（AV SDK 加载后、auth.js 加载前执行），在 `custom_js` 方式下无法直接插入 inline `<script>`。**替代方案**：将初始化逻辑放在 `auth.js` 顶部，`auth.js` 作为最后一个加载项：

```js
// auth.js 开头
(function() {
  if (typeof AV === 'undefined') return;
  var lc = CONFIG.web_analytics.leancloud;
  if (!lc || !lc.app_id || !lc.app_key) return;
  AV.init({ appId: lc.app_id, appKey: lc.app_key, serverURL: lc.server_url || undefined });
  window.__AV_READY__ = true;
  // 然后执行 Auth.init()
})();
```

### 备选方式：直接修改页面 HTML

若 Fluid 的 `custom_js` 因版本原因不可用，直接修改 `index.html` 等生成文件。脚本加载顺序如下（在 `boot.js` 之前）：

```html
<script src="https://cdn.jsdelivr.net/npm/leancloud-storage@4/dist/av-min.js"></script>
<script src="/js/auth.js"></script>
<link rel="stylesheet" href="/css/auth.css">
```

**注意**：`hexo generate` 会覆盖手动修改。使用此方式需每次构建后重新注入，或编写构建后脚本（如 `scripts/postbuild.sh`）自动化。

---

## 14. 文件变更清单

| 文件 | 操作 | 行数 | 说明 |
|------|------|------|------|
| `js/auth.js` | **新增** | ~280 | 核心认证模块（含 AV.init + 跨标签页同步） |
| `css/auth.css` | **新增** | ~110 | 认证 UI 样式（含暗色模式 + 可访问性） |
| `_config.fluid.yml` | **修改** | +4 | 通过 `custom_js`/`custom_css` 注入脚本和样式 |

> `js/leancloud.js` **无需修改**。fetch 计数与 `AV.User` SDK 路径独立，可共存。

---

## 15. 测试策略

| 测试类型 | 覆盖范围 | 验证方式 |
|----------|---------|---------|
| 单元 | Validator 规则、ErrorMapper 映射、输入分发（@ 检测） | 浏览器 console |
| 集成 | AV.User 全链路（用户名登录、邮箱登录） | 真实 LeanCloud 环境 |
| UI | Modal 切换、navbar 注入、响应式、键盘操作 | Chrome DevTools |
| 会话恢复 | 关闭标签页重新打开 | 验证 navbar 直接显示用户名 |
| 会话过期 | 修改 localStorage 伪造过期 sessionToken | 验证自动降级为 ANONYMOUS |
| 多标签页同步 | 标签页 A 登录 → 标签页 B 验证 UI 更新 | 两条 Chrome 窗口 |
| 异常路径 | 错误密码、重复注册、网络断开、清除 localStorage | 逐项验证错误提示 |
| 降级路径 | 删除 app_id 后刷新 | 验证页面正常渲染，无报错 |
| 暗色模式 | 切换亮/暗色 | 验证 Modal 颜色跟随 |

---

## 16. 实现顺序

```
1. LeanCloud 控制台创建应用 → 获取凭证 → 开启用户注册
2. 更新 Hexo _config.fluid.yml leancloud 配置 + custom_js/custom_css
3. 创建 css/auth.css（独立验证亮/暗色模式）
4. 创建 js/auth.js（SessionManager → ErrorMapper → Validator → UIController → CrossTabSync → API）
5. hexo generate → 验证所有页面脚本注入正确
6. 端到端：注册 → 用户名登录 → 邮箱登录 → 刷新恢复 → 登出 → 密码重置
7. 多标签页同步验证 → 异常路径 → 降级验证
```

---

## 17. 自审

- [x] 无 TBD / TODO，架构与流程一致
- [x] 范围聚焦单一登录模块，无需拆分
- [x] 2 种替代方案对比（密码门 / Auth SaaS），满足 brainstorming 技能要求
- [x] 纠正"LeanCloud 已初始化"假设（CONFIG 证据：`app_id=null`）
- [x] 明确 `av-min.js` 与 `leancloud.js` 关系（独立共存）
- [x] **修复 Hexo 生成流程矛盾**：推荐 Fluid `custom_js`/`custom_css` 注入，备选手动修改
- [x] **新增 sessionToken 生命周期说明**：有效期 1 年、验证半衰期 1 小时、`rememberMe` 参数
- [x] **新增邮箱登录**：`AV.User.loginWithEmail()` + 优先 `logIn` → 211 时 fallback
- [x] **新增 LeanCloud 免费版 API 限额**：3 万次/天，429 降级
- [x] **新增多标签页同步**：`window.addEventListener('storage')` + CrossTabSync 子模块
- [x] **新增 `AV.User.current()` 与 localStorage 关系说明**：从 localStorage 读取→调用 LeanCloud 验证
- [x] **新增键盘可访问性**：`role`/`aria-label`/`aria-haspopup`/`aria-expanded`/`role="alert"`/`novalidate`/focus 样式
- [x] **密码复杂度建议**：≥8 位含字母和数字（前端建议，不做硬拦截以保持 UX 友好）
- [x] **CDN 版本号**：使用 `@4` 主版本范围，避免硬编码小版本号
- [x] 新增错误码 216（邮箱未验证）
- [x] 状态机新增多标签页同步路径
- [x] Modal DOM 完整结构 + Navbar 精确注入路径 + 暗色模式 + 边界条件（11 种）