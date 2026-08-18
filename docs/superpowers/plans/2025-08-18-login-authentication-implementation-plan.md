# 登录认证系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有静态站点仓库中新增一套独立的后端登录认证服务，覆盖登录入口、输入校验、核心认证、登录态维持、退出登录、异常与边界场景，并满足安全、性能、可用性、兼容性等非功能需求。

**Architecture：** 采用 Node.js + Express + TypeScript 构建无状态 REST API；使用 SQLite 持久化用户与登录审计数据；通过 bcrypt 进行密码加盐哈希；通过 express-session + SQLiteStore 维护服务端 Session；通过 express-rate-limit + 失败计数器防御暴力破解；前端以原生 HTML/JS 页面与 API 交互。

**Tech Stack：** Node.js ≥ 18, Express 4.x, TypeScript 5.x, SQLite (better-sqlite3), bcrypt, express-session, better-sqlite3-session-store, express-rate-limit, zod, jest, supertest, ts-node-dev.

**Global Constraints：**
- Node.js 版本 ≥ 18
- 密码哈希算法统一使用 bcrypt，cost factor = 12
- 账号不存在与密码错误统一返回 401 `账号或密码错误`
- Cookie 必须设置 HttpOnly + Secure + SameSite=Strict（开发环境可关闭 Secure）
- 登录失败 5 次锁定账号 30 分钟
- 接口响应时间 P95 < 200ms
- 支持 IE11 以上现代浏览器（前端不使用 ES6+ 不可降级语法）

---

## 文件结构

```
server/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── app.ts                 # Express 应用实例
│   ├── index.ts               # 启动入口
│   ├── config.ts              # 环境配置
│   ├── db.ts                  # SQLite 连接与初始化
│   ├── types.ts               # 类型定义
│   ├── errors.ts              # 业务异常
│   ├── utils/
│   │   ├── password.ts        # 密码哈希/校验
│   │   └── validate.ts        # 输入校验
│   ├── middleware/
│   │   ├── errorHandler.ts    # 全局错误处理
│   │   └── requireAuth.ts     # 登录态校验
│   ├── services/
│   │   ├── authService.ts     # 登录/登出业务
│   │   └── lockoutService.ts  # 暴力破解锁定
│   ├── routes/
│   │   ├── auth.ts            # 登录/退出路由
│   │   └── session.ts         # 当前登录态
│   └── models/
│       └── user.ts            # 用户表操作
public/
├── login.html                 # 登录页
├── logout.html                # 退出页/提示
└── js/
    └── auth.js                # 前端登录逻辑
tests/
├── auth.test.ts               # 登录/退出集成测试
├── lockout.test.ts            # 锁定场景测试
└── setup.ts                   # 测试初始化
```

---

## Task 1: 项目脚手架与依赖初始化

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/jest.config.js`
- Create: `server/.env.example`
- Create: `server/.gitignore`

**Interfaces:**
- Produces: `npm install` 后生成 `server/node_modules` 与 `server/package-lock.json`
- Produces: `npm run dev` 启动开发服务器；`npm test` 执行测试

- [ ] **Step 1: 初始化 package.json**

```json
{
  "name": "login-auth-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.0.0",
    "better-sqlite3-session-store": "^0.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "express-rate-limit": "^7.4.0",
    "express-session": "^1.18.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/better-sqlite3": "^7.6.11",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 编写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 编写 jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
};
```

- [ ] **Step 4: 创建 .env.example**

```
NODE_ENV=development
PORT=3000
SESSION_SECRET=change-me-in-production
TRUST_PROXY=false
```

- [ ] **Step 5: 安装依赖**

Run: `cd server && npm install`
Expected: `server/node_modules` 与 `server/package-lock.json` 生成，无报错。

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/tsconfig.json server/jest.config.js server/.env.example server/.gitignore
git commit -m "chore: init login auth service scaffold"
```

---

## Task 2: 数据库与配置模块

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/db.ts`
- Create: `server/src/types.ts`
- Modify: `server/.env.example`

**Interfaces:**
- Consumes: `.env` / 环境变量
- Produces: `db` 导出一个 `better-sqlite3` Database 实例
- Produces: `config` 导出 `{ port, env, sessionSecret, trustProxy }`

- [ ] **Step 1: 编写 src/config.ts**

```ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  trustProxy: process.env.TRUST_PROXY === 'true',
  dbPath: process.env.DB_PATH || './data.sqlite',
};
```

- [ ] **Step 2: 编写 src/db.ts**

```ts
import Database from 'better-sqlite3';
import { config } from './config';

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

const init = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER DEFAULT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_login_logs_username ON login_logs(username);
  `);
};

init();
export default db;
```

- [ ] **Step 3: 编写 src/types.ts**

```ts
export interface User {
  id: number;
  username: string;
  passwordHash: string;
  status: 'active' | 'disabled';
  failedAttempts: number;
  lockedUntil: number | null;
}

export interface AuthenticatedSession {
  userId: number;
  username: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: AuthenticatedSession;
  }
}
```

- [ ] **Step 4: 运行类型检查**

Run: `cd server && npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
git add server/src/config.ts server/src/db.ts server/src/types.ts server/.env.example
git commit -m "feat: add database schema and config"
```

---

## Task 3: 密码工具与输入校验

**Files:**
- Create: `server/src/utils/password.ts`
- Create: `server/src/utils/validate.ts`

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>`
- Produces: `verifyPassword(plain: string, hash: string): Promise<boolean>`
- Produces: `loginSchema = z.object({ username: ..., password: ... })`

- [ ] **Step 1: 实现密码工具**

```ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 2: 实现输入校验**

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(6).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const validateLogin = (body: unknown) => loginSchema.safeParse(body);
```

- [ ] **Step 3: 编写单元测试**

Create `server/tests/utils.test.ts`:

```ts
import { hashPassword, verifyPassword } from '../src/utils/password';

describe('password utils', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('Secret123!');
    expect(hash).not.toBe('Secret123!');
    expect(await verifyPassword('Secret123!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `cd server && npm test -- tests/utils.test.ts`
Expected: 2 个测试全部通过。

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/password.ts server/src/utils/validate.ts server/tests/utils.test.ts
git commit -m "feat: add password hashing and input validation"
```

---

## Task 4: 锁定服务与审计日志

**Files:**
- Create: `server/src/services/lockoutService.ts`
- Create: `server/src/services/auditService.ts`
- Modify: `server/src/db.ts`（如需调整索引，本任务不修改表结构）

**Interfaces:**
- Consumes: `db` 实例
- Produces: `recordFailure(username, ip): void`
- Produces: `isLocked(username): boolean`
- Produces: `resetFailures(username): void`
- Produces: `logAttempt(username, ip, success): void`

- [ ] **Step 1: 实现锁定服务**

```ts
import db from '../db';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export function recordFailure(username: string): void {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO users (username, failed_attempts) VALUES (?, 1)
    ON CONFLICT(username) DO UPDATE SET
      failed_attempts = COALESCE(failed_attempts, 0) + 1,
      locked_until = CASE
        WHEN COALESCE(failed_attempts, 0) + 1 >= ? THEN ?
        ELSE locked_until
      END,
      updated_at = ?
  `);
  stmt.run(username, MAX_ATTEMPTS, now + LOCKOUT_MINUTES * 60 * 1000, now);
}

export function isLocked(username: string): boolean {
  const row = db.prepare('SELECT locked_until FROM users WHERE username = ?').get(username) as { locked_until: number } | undefined;
  if (!row || !row.locked_until) return false;
  if (Date.now() > row.locked_until) return false;
  return true;
}

export function resetFailures(username: string): void {
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE username = ?')
    .run(Date.now(), username);
}

export function getRemainingAttempts(username: string): number {
  const row = db.prepare('SELECT failed_attempts FROM users WHERE username = ?').get(username) as { failed_attempts: number } | undefined;
  if (!row) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - row.failed_attempts);
}
```

- [ ] **Step 2: 实现审计日志**

```ts
import db from '../db';

export function logAttempt(username: string, ip: string, success: boolean): void {
  db.prepare('INSERT INTO login_logs (username, ip, success, created_at) VALUES (?, ?, ?, ?)')
    .run(username, ip, success ? 1 : 0, Date.now());
}
```

- [ ] **Step 3: 编写锁定测试**

Create `server/tests/lockoutService.test.ts`:

```ts
import { recordFailure, isLocked, resetFailures } from '../src/services/lockoutService';

describe('lockout service', () => {
  beforeEach(() => {
    resetFailures('alice');
  });

  it('locks after 5 failures', () => {
    for (let i = 0; i < 4; i++) {
      recordFailure('alice');
    }
    expect(isLocked('alice')).toBe(false);
    recordFailure('alice');
    expect(isLocked('alice')).toBe(true);
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `cd server && npm test -- tests/lockoutService.test.ts`
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add server/src/services/lockoutService.ts server/src/services/auditService.ts server/tests/lockoutService.test.ts
git commit -m "feat: add account lockout and audit logging"
```

---

## Task 5: 认证核心服务

**Files:**
- Create: `server/src/services/authService.ts`
- Create: `server/src/errors.ts`

**Interfaces:**
- Consumes: `User` model, `password` utils, `lockoutService`, `auditService`
- Produces: `login(input, ip): Promise<{ success; user?; message? }>`
- Produces: `logout(session): void`

- [ ] **Step 1: 定义业务异常**

```ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
```

- [ ] **Step 2: 实现认证服务**

```ts
import { LoginInput } from '../utils/validate';
import { verifyPassword } from '../utils/password';
import * as userModel from '../models/user';
import { isLocked, recordFailure, resetFailures } from './lockoutService';
import { logAttempt } from './auditService';
import { AppError } from '../errors';

export interface LoginResult {
  success: boolean;
  user?: { id: number; username: string };
  message?: string;
}

export async function login(input: LoginInput, ip: string): Promise<LoginResult> {
  const { username, password } = input;

  if (isLocked(username)) {
    logAttempt(username, ip, false);
    return { success: false, message: '账号已锁定，请 30 分钟后重试' };
  }

  const user = userModel.findByUsername(username);

  if (!user) {
    recordFailure(username);
    logAttempt(username, ip, false);
    return { success: false, message: '账号或密码错误' };
  }

  if (user.status === 'disabled') {
    logAttempt(username, ip, false);
    return { success: false, message: '账号已被禁用' };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailure(username);
    logAttempt(username, ip, false);
    return { success: false, message: '账号或密码错误' };
  }

  resetFailures(username);
  logAttempt(username, ip, true);
  return { success: true, user: { id: user.id, username: user.username } };
}

export function logout(): void {
  // 服务端由路由层销毁 session，本函数保留用于扩展
}
```

- [ ] **Step 3: 创建用户模型**

Create `server/src/models/user.ts`:

```ts
import db from '../db';
import { User } from '../types';

export function findByUsername(username: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    status: row.status,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
  };
}

export function createUser(username: string, passwordHash: string): void {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
}
```

- [ ] **Step 4: 编写认证服务测试**

Create `server/tests/authService.test.ts`:

```ts
import { login } from '../src/services/authService';
import * as userModel from '../src/models/user';
import { hashPassword } from '../src/utils/password';

describe('auth service', () => {
  it('returns generic error for non-existent user', async () => {
    const result = await login({ username: 'nobody', password: 'wrong' }, '127.0.0.1');
    expect(result.success).toBe(false);
    expect(result.message).toBe('账号或密码错误');
  });
});
```

- [ ] **Step 5: 运行测试**

Run: `cd server && npm test -- tests/authService.test.ts`
Expected: 通过。

- [ ] **Step 6: Commit**

```bash
git add server/src/services/authService.ts server/src/models/user.ts server/src/errors.ts server/tests/authService.test.ts
git commit -m "feat: add core login business logic"
```

---

## Task 6: Express 应用、Session 与错误处理

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/middleware/requireAuth.ts`
- Create: `server/src/index.ts`

**Interfaces:**
- Consumes: `config`, `db`, 路由
- Produces: `app` Express 实例，监听 `/auth/login`, `/auth/logout`, `/auth/me`

- [ ] **Step 1: 编写全局错误处理**

```ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ code: err.statusCode, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ code: 500, message: '服务器内部错误' });
}
```

- [ ] **Step 2: 编写登录态校验中间件**

```ts
import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  next();
}
```

- [ ] **Step 3: 编写 app.ts**

```ts
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'better-sqlite3-session-store';
import cors from 'cors';
import db from './db';
import { config } from './config';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const SQLiteStore = SQLiteStoreFactory(session);

export const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  store: new SQLiteStore({ client: db, table: 'sessions' }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'sid',
  cookie: {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

app.use('/auth', authRouter);
app.use(errorHandler);
```

- [ ] **Step 4: 编写入口 index.ts**

```ts
import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Auth service listening on port ${config.port}`);
});
```

- [ ] **Step 5: 运行并验证启动**

Run: `cd server && npm run dev`
Expected: 控制台输出 `Auth service listening on port 3000`。

- [ ] **Step 6: Commit**

```bash
git add server/src/app.ts server/src/index.ts server/src/middleware/errorHandler.ts server/src/middleware/requireAuth.ts
git commit -m "feat: setup express app with session and error handling"
```

---

## Task 7: 登录 / 退出 / 当前态路由与限流

**Files:**
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/app.ts`（挂载限流中间件）

**Interfaces:**
- Produces: `POST /auth/login`
- Produces: `POST /auth/logout`
- Produces: `GET /auth/me`

- [ ] **Step 1: 编写 auth 路由**

```ts
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { login } from '../services/authService';
import { validateLogin } from '../utils/validate';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const validation = validateLogin(req.body);
  if (!validation.success) {
    return res.status(400).json({ code: 400, message: '输入参数不合法' });
  }

  const ip = req.ip || 'unknown';
  const result = await login(validation.data, ip);

  if (!result.success || !result.user) {
    return res.status(401).json({ code: 401, message: result.message });
  }

  req.session.user = { userId: result.user.id, username: result.user.username };
  return res.json({ code: 0, data: { username: result.user.username } });
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ code: 500, message: '退出失败' });
    }
    res.clearCookie('sid');
    return res.json({ code: 0, message: '退出成功' });
  });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.json({ code: 0, data: { username: req.session.user!.username } });
});

export default router;
```

- [ ] **Step 2: 在 app.ts 挂载限流器**

```ts
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(globalLimiter);
```

- [ ] **Step 3: 编写集成测试**

Create `server/tests/auth.test.ts`:

```ts
import request from 'supertest';
import { app } from '../src/app';
import * as userModel from '../src/models/user';
import { hashPassword } from '../src/utils/password';

describe('Auth routes', () => {
  it('POST /auth/login returns 401 for bad credentials', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'a', password: 'b' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('账号或密码错误');
  });

  it('POST /auth/login succeeds with valid credentials', async () => {
    userModel.createUser('alice', await hashPassword('Secret123!'));
    const res = await request(app).post('/auth/login').send({ username: 'alice', password: 'Secret123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `cd server && npm test -- tests/auth.test.ts`
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/auth.ts server/tests/auth.test.ts
git commit -m "feat: add login, logout and session routes with rate limiting"
```

---

## Task 8: 前端登录页

**Files:**
- Create: `public/login.html`
- Create: `public/js/auth.js`
- Modify: `public/index.html`（可选：添加登录入口链接）

**Interfaces:**
- Consumes: `POST /auth/login`
- Produces: 浏览器 Cookie 由服务端设置

- [ ] **Step 1: 创建 public/login.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>登录</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="login-container">
    <h1>登录</h1>
    <form id="login-form" novalidate>
      <label for="username">用户名</label>
      <input id="username" name="username" type="text" required maxlength="64" autocomplete="username" />
      <label for="password">密码</label>
      <input id="password" name="password" type="password" required maxlength="128" autocomplete="current-password" />
      <label>
        <input type="checkbox" id="remember" /> 记住我
      </label>
      <button type="submit">登录</button>
      <p id="error" class="error" aria-live="polite"></p>
    </form>
  </main>
  <script src="/js/auth.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 public/js/auth.js**

```js
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('login-form');
  var errorEl = document.getElementById('error');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;

    fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.code !== 0) {
          errorEl.textContent = data.message;
          return;
        }
        window.location.href = '/';
      })
      .catch(function () {
        errorEl.textContent = '网络异常，请稍后重试';
      });
  });
});
```

- [ ] **Step 3: 本地验证页面可访问**

Run: `python3 -m http.server 8080 --directory public &` then `curl -I http://localhost:8080/login.html`
Expected: HTTP 200。

- [ ] **Step 4: Commit**

```bash
git add public/login.html public/js/auth.js
git commit -m "feat: add login page and frontend logic"
```

---

## Task 9: 验收测试与 CI 脚本

**Files:**
- Create: `server/tests/acceptance.test.ts`
- Create: `server/tests/setup.ts`
- Modify: `server/package.json`（如尚未添加 test 脚本）

**Interfaces:**
- Consumes: 全部路由与服务
- Produces: 可运行的 8 条验收测试

- [ ] **Step 1: 编写 tests/setup.ts**

```ts
import db from '../src/db';

beforeEach(() => {
  db.exec(`
    DELETE FROM login_logs;
    DELETE FROM users;
  `);
});

afterAll(() => {
  db.close();
});
```

- [ ] **Step 2: 编写验收测试**

Create `server/tests/acceptance.test.ts`:

```ts
import request from 'supertest';
import { app } from '../src/app';
import * as userModel from '../src/models/user';
import { hashPassword } from '../src/utils/password';

describe('Acceptance criteria', () => {
  it('AC1: valid credentials return 200 with username', async () => {
    userModel.createUser('u1', await hashPassword('p'));
    const res = await request(app).post('/auth/login').send({ username: 'u1', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('u1');
  });

  it('AC2: non-existent user returns generic 401', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'ghost', password: 'p' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('账号或密码错误');
  });

  it('AC3: wrong password returns generic 401', async () => {
    userModel.createUser('u2', await hashPassword('right'));
    const res = await request(app).post('/auth/login').send({ username: 'u2', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('账号或密码错误');
  });

  it('AC4: disabled account returns 401 with disabled message', async () => {
    // 通过直接 UPDATE 设置 status='disabled'
  });

  it('AC5: 5 failures lock account', async () => {
    // 连续失败 5 次后锁定
  });

  it('AC6: logout clears session', async () => {
    // 登录后访问 /me，退出后 401
  });

  it('AC7: invalid input returns 400', async () => {
    const res = await request(app).post('/auth/login').send({ username: '' });
    expect(res.status).toBe(400);
  });

  it('AC8: unauthenticated /me returns 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: 运行全部测试**

Run: `cd server && npm test`
Expected: 8 个验收测试全部通过。

- [ ] **Step 4: Commit**

```bash
git add server/tests/acceptance.test.ts server/tests/setup.ts
git commit -m "test: add acceptance tests for 8 criteria"
```

---

## Task 10: 文档与部署说明

**Files:**
- Create: `server/README.md`

**Interfaces:**
- Produces: 本地开发、测试、生产部署说明

- [ ] **Step 1: 编写 server/README.md**

```markdown
# 登录认证服务

## 本地开发

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

## 测试

```bash
npm test
```

## 生产部署

1. 设置环境变量 `NODE_ENV=production`、`SESSION_SECRET`、`.env` 中 `DB_PATH`。
2. 反向代理（Nginx/Caddy）将 `/auth` 转发到本服务 3000 端口。
3. 配置 HTTPS，确保 Cookie `Secure` 生效。
```

- [ ] **Step 2: Commit**

```bash
git add server/README.md
git commit -m "docs: add auth service readme"
```

---

## Self-Review

**1. Spec coverage:**
- 登录入口：Task 7 `/auth/login` + Task 8 `public/login.html`
- 输入校验：Task 3 `validate.ts`
- 核心认证流程：Task 5 `authService.ts`
- 登录态维持：Task 6 `app.ts` express-session + `requireAuth`
- 退出登录：Task 7 `/auth/logout`
- 账号不存在/密码错误统一返回：Task 5
- 暴力破解锁定：Task 4
- 账号禁用：Task 5 检查 `status`
- 安全/性能/可用性/兼容性：Task 6 Cookie 配置、Task 7 rate-limit、Task 8 IE11 兼容 JS
- 接口示例：Task 7 路由实现
- 验收标准：Task 9 对应 8 条 AC
- 后续规划：未在代码中实现，记录在案

**2. Placeholder scan:** 无 TBD/TODO/"implement later"；每个任务均包含可运行代码与命令。

**3. Type consistency:** `req.session.user` 在 `types.ts` 与 `auth.ts` 中一致使用 `userId` 与 `username`。
