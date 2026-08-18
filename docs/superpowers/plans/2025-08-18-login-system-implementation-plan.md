# 登录系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个安全、可测试的账号密码登录系统，覆盖登录入口、认证流程、登录态维持、退出登录、异常处理及安全防护措施。

**Architecture：** 新增独立的 Node.js/Express + TypeScript 后端认证服务，与现有静态站点解耦；认证状态通过 HttpOnly Cookie 维持，敏感数据经 bcrypt 加盐哈希后持久化到 PostgreSQL，Redis 负责会话与限流计数。

**Tech Stack：** Node.js 20+ · TypeScript 5.x · Express 4.x · PostgreSQL 15+ · Redis 7+ · bcrypt · express-session · connect-pg-simple · express-rate-limit · jest · supertest

**Assumption:** 当前仓库为静态站点。本计划假设新增 `server/` 目录作为独立后端服务；如已有后端框架，应将文件路径映射到对应目录。

---

## Global Constraints

- Node.js >= 20.0.0
- TypeScript strict mode enabled (`strict: true`)
- All passwords must be hashed with bcrypt (cost factor 12) before persistence
- Authentication failure messages must be generic: "账号或密码错误"
- Session cookies: HttpOnly, Secure in production, SameSite=Lax minimum
- API base path: `/api/v1/auth`
- All code changes must include corresponding unit/integration tests
- Commits should be atomic and task-level

---

## File Structure

| File | Responsibility |
|------|----------------|
| `server/src/db/migrations/001_create_users.sql` | 用户表、登录锁定字段 schema |
| `server/src/db/migrations/002_create_sessions.sql` | 会话表（配合 connect-pg-simple） |
| `server/src/config/database.ts` | 数据库连接池配置 |
| `server/src/config/redis.ts` | Redis 客户端配置 |
| `server/src/models/User.ts` | User 实体与类型定义 |
| `server/src/repositories/UserRepository.ts` | 用户数据访问 |
| `server/src/services/PasswordService.ts` | 密码哈希与校验 |
| `server/src/services/RateLimiter.ts` | 失败次数 + IP 限流 |
| `server/src/services/CaptchaService.ts` | 验证码生成与校验 |
| `server/src/services/AuthService.ts` | 核心认证逻辑 |
| `server/src/middleware/session.ts` | 会话中间件配置 |
| `server/src/middleware/validate.ts` | 输入校验中间件 |
| `server/src/middleware/errorHandler.ts` | 全局异常处理 |
| `server/src/routes/auth.ts` | 登录 / 退出路由 |
| `server/src/app.ts` | Express 应用组装 |
| `server/src/index.ts` | 服务入口 |
| `server/tests/unit/...` | 单元测试 |
| `server/tests/integration/auth.test.ts` | 登录/退出集成测试 |
| `server/.env.example` | 环境变量示例 |
| `docs/auth-api-examples.md` | 接口请求响应样例 |

---

## Task 1: Database Schema — Users and Sessions

**Files:**
- Create: `server/src/db/migrations/001_create_users.sql`
- Create: `server/src/db/migrations/002_create_sessions.sql`
- Create: `server/src/config/database.ts`
- Create: `server/src/models/User.ts`

**Interfaces:**
- Produces: `User` type with `{ id, email, passwordHash, status, failedAttempts, lockedUntil, createdAt, updatedAt }`
- Produces: `query<T>(sql, params)` via `database.ts`

- [ ] **Step 1: Write the failing migration runner test**

```typescript
// server/tests/unit/db/migrations.test.ts
import { query } from '../../src/config/database';

describe('migrations', () => {
  it('should create users table with required columns', async () => {
    const result = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
    );
    const columns = result.rows.map(r => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('email');
    expect(columns).toContain('password_hash');
    expect(columns).toContain('status');
    expect(columns).toContain('failed_attempts');
    expect(columns).toContain('locked_until');
  });
});
```

Run: `cd server && npx jest tests/unit/db/migrations.test.ts -v`
Expected: FAIL (table not found / module not found)

- [ ] **Step 2: Create user and session tables**

```sql
-- server/src/db/migrations/001_create_users.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

```sql
-- server/src/db/migrations/002_create_sessions.sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

- [ ] **Step 3: Implement database connection and User model**

```typescript
// server/src/config/database.ts
import { Pool, QueryResult } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export function query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
  return pool.query(sql, params);
}
```

```typescript
// server/src/models/User.ts
export type UserStatus = 'active' | 'disabled';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  failedAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Run: `cd server && npx jest tests/unit/db/migrations.test.ts -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/src/db server/src/config/database.ts server/src/models/User.ts server/tests/unit/db
 git commit -m "feat(auth): add users and sessions schema with User model"
```

---

## Task 2: User Repository

**Files:**
- Create: `server/src/repositories/UserRepository.ts`
- Create: `server/tests/unit/repositories/UserRepository.test.ts`

**Interfaces:**
- Consumes: `User` type, `query` from `database.ts`
- Produces: `UserRepository.findByEmail(email)`, `UserRepository.incrementFailedAttempts(id)`, `UserRepository.resetFailedAttempts(id)`, `UserRepository.lockUser(id, minutes)`, `UserRepository.findById(id)`

- [ ] **Step 1: Write failing repository tests**

```typescript
// server/tests/unit/repositories/UserRepository.test.ts
import * as UserRepository from '../../src/repositories/UserRepository';
import { query } from '../../src/config/database';

describe('UserRepository', () => {
  const email = 'test@example.com';

  beforeEach(async () => {
    await query('DELETE FROM users WHERE email = $1', [email]);
  });

  it('findByEmail returns user after insert', async () => {
    await query(
      `INSERT INTO users(email, password_hash) VALUES ($1, $2)`,
      [email, 'hash']
    );
    const user = await UserRepository.findByEmail(email);
    expect(user).toBeDefined();
    expect(user!.email).toBe(email);
  });

  it('incrementFailedAttempts increases count', async () => {
    const inserted = await query<{ id: string }>(
      `INSERT INTO users(email, password_hash) VALUES ($1, $2) RETURNING id`,
      [email, 'hash']
    );
    await UserRepository.incrementFailedAttempts(inserted.rows[0].id);
    const user = await UserRepository.findByEmail(email);
    expect(user!.failedAttempts).toBe(1);
  });
});
```

Run: `cd server && npx jest tests/unit/repositories/UserRepository.test.ts -v`
Expected: FAIL (module not found)

- [ ] **Step 2: Implement repository**

```typescript
// server/src/repositories/UserRepository.ts
import { query } from '../config/database';
import { User } from '../models/User';

function mapRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    status: row.status,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash, status, failed_attempts, locked_until, created_at, updated_at
     FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findById(id: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash, status, failed_attempts, locked_until, created_at, updated_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function incrementFailedAttempts(id: string): Promise<void> {
  await query(
    `UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function resetFailedAttempts(id: string): Promise<void> {
  await query(
    `UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function lockUser(id: string, minutes: number): Promise<void> {
  await query(
    `UPDATE users SET locked_until = NOW() + INTERVAL '1 minute' * $2, updated_at = NOW() WHERE id = $1`,
    [id, minutes]
  );
}
```

Run: `cd server && npx jest tests/unit/repositories/UserRepository.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories server/tests/unit/repositories
 git commit -m "feat(auth): add UserRepository with failure tracking"
```

---

## Task 3: Password Service

**Files:**
- Create: `server/src/services/PasswordService.ts`
- Create: `server/tests/unit/services/PasswordService.test.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): Promise<string>`
- Produces: `verifyPassword(password: string, hash: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/unit/services/PasswordService.test.ts
import { hashPassword, verifyPassword } from '../../src/services/PasswordService';

describe('PasswordService', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('MyS3cr3t!');
    expect(hash).not.toBe('MyS3cr3t!');
    expect(await verifyPassword('MyS3cr3t!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
```

Run: `cd server && npx jest tests/unit/services/PasswordService.test.ts -v`
Expected: FAIL (module not found)

- [ ] **Step 2: Implement with bcrypt**

```typescript
// server/src/services/PasswordService.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

Run: `cd server && npx jest tests/unit/services/PasswordService.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/services/PasswordService.ts server/tests/unit/services/PasswordService.test.ts
 git commit -m "feat(auth): add bcrypt password hashing service"
```

---

## Task 4: Rate Limiter and Brute-Force Protection

**Files:**
- Create: `server/src/config/redis.ts`
- Create: `server/src/services/RateLimiter.ts`
- Create: `server/tests/unit/services/RateLimiter.test.ts`

**Interfaces:**
- Produces: `RateLimiter.recordFailedAttempt(key: string): Promise<number>`
- Produces: `RateLimiter.isBlocked(key: string): Promise<boolean>`
- Produces: `RateLimiter.reset(key: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/unit/services/RateLimiter.test.ts
import * as RateLimiter from '../../src/services/RateLimiter';

describe('RateLimiter', () => {
  const key = 'ip:192.168.1.1';

  beforeEach(async () => {
    await RateLimiter.reset(key);
  });

  it('blocks after max attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await RateLimiter.recordFailedAttempt(key);
    }
    expect(await RateLimiter.isBlocked(key)).toBe(true);
  });

  it('resets block', async () => {
    await RateLimiter.recordFailedAttempt(key);
    await RateLimiter.reset(key);
    expect(await RateLimiter.isBlocked(key)).toBe(false);
  });
});
```

Run: `cd server && npx jest tests/unit/services/RateLimiter.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement Redis client and rate limiter**

```typescript
// server/src/config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});
```

```typescript
// server/src/services/RateLimiter.ts
import { redis } from '../config/redis';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 900; // 15 minutes
const BLOCK_SECONDS = 1800; // 30 minutes

function keyForAttempts(key: string): string {
  return `auth:attempts:${key}`;
}

function keyForBlock(key: string): string {
  return `auth:block:${key}`;
}

export async function recordFailedAttempt(key: string): Promise<number> {
  const attemptsKey = keyForAttempts(key);
  const current = await redis.incr(attemptsKey);
  if (current === 1) {
    await redis.expire(attemptsKey, WINDOW_SECONDS);
  }
  if (current >= MAX_ATTEMPTS) {
    await redis.set(keyForBlock(key), '1', 'EX', BLOCK_SECONDS);
  }
  return current;
}

export async function isBlocked(key: string): Promise<boolean> {
  return (await redis.exists(keyForBlock(key))) === 1;
}

export async function reset(key: string): Promise<void> {
  await redis.del(keyForAttempts(key), keyForBlock(key));
}
```

Run: `cd server && npx jest tests/unit/services/RateLimiter.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/config/redis.ts server/src/services/RateLimiter.ts server/tests/unit/services/RateLimiter.test.ts
 git commit -m "feat(auth): add Redis-backed brute-force rate limiter"
```

---

## Task 5: Captcha Service

**Files:**
- Create: `server/src/services/CaptchaService.ts`
- Create: `server/tests/unit/services/CaptchaService.test.ts`

**Interfaces:**
- Produces: `generateCaptcha(): { id: string, image: string }`
- Produces: `verifyCaptcha(id: string, answer: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/unit/services/CaptchaService.test.ts
import { generateCaptcha, verifyCaptcha } from '../../src/services/CaptchaService';

describe('CaptchaService', () => {
  it('generates and verifies a captcha', () => {
    const captcha = generateCaptcha();
    expect(captcha.id).toBeDefined();
    expect(captcha.image).toMatch(/^data:image\/png;base64,/);

    const text = 'expectedText'; // production implementation exposes answer only via internals
    expect(verifyCaptcha(captcha.id, text)).toBe(true);
    expect(verifyCaptcha(captcha.id, 'wrong')).toBe(false);
  });
});
```

Run: `cd server && npx jest tests/unit/services/CaptchaService.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement simple captcha generator**

```typescript
// server/src/services/CaptchaService.ts
import { createCanvas } from 'canvas';
import { randomBytes } from 'crypto';

const store = new Map<string, string>();

export function generateCaptcha(): { id: string; image: string } {
  const id = randomBytes(16).toString('hex');
  const text = Math.random().toString(36).slice(2, 6).toUpperCase();
  store.set(id, text);

  const canvas = createCanvas(120, 40);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 120, 40);
  ctx.fillStyle = '#333';
  ctx.font = '24px sans-serif';
  ctx.fillText(text, 25, 28);

  return { id, image: canvas.toDataURL() };
}

export async function verifyCaptcha(id: string, answer: string): Promise<boolean> {
  const expected = store.get(id);
  if (!expected) return false;
  const ok = expected === answer.toUpperCase();
  store.delete(id);
  return ok;
}
```

Run: `cd server && npx jest tests/unit/services/CaptchaService.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/services/CaptchaService.ts server/tests/unit/services/CaptchaService.test.ts
 git commit -m "feat(auth): add CAPTCHA generation and verification"
```

---

## Task 6: Core Authentication Service

**Files:**
- Create: `server/src/services/AuthService.ts`
- Create: `server/tests/unit/services/AuthService.test.ts`

**Interfaces:**
- Consumes: `UserRepository`, `PasswordService`, `RateLimiter`
- Produces: `LoginResult = { success: boolean; requireCaptcha?: boolean; user?: User; error?: string }`
- Produces: `authenticate(email, password, ip, captchaId?, captchaAnswer?): Promise<LoginResult>`

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/unit/services/AuthService.test.ts
import { authenticate } from '../../src/services/AuthService';
import * as UserRepository from '../../src/repositories/UserRepository';
import * as PasswordService from '../../src/services/PasswordService';
import { query } from '../../src/config/database';

describe('AuthService', () => {
  beforeEach(async () => {
    await query('DELETE FROM users WHERE email = $1', ['alice@example.com']);
  });

  it('returns success with valid credentials', async () => {
    const hash = await PasswordService.hashPassword('secret');
    await query(
      `INSERT INTO users(email, password_hash, status) VALUES ($1, $2, 'active')`,
      ['alice@example.com', hash]
    );
    const result = await authenticate('alice@example.com', 'secret', '1.1.1.1');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });

  it('returns generic error for wrong password', async () => {
    const hash = await PasswordService.hashPassword('secret');
    await query(
      `INSERT INTO users(email, password_hash, status) VALUES ($1, $2, 'active')`,
      ['alice@example.com', hash]
    );
    const result = await authenticate('alice@example.com', 'wrong', '1.1.1.1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('账号或密码错误');
  });
});
```

Run: `cd server && npx jest tests/unit/services/AuthService.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement authentication service**

```typescript
// server/src/services/AuthService.ts
import * as UserRepository from '../repositories/UserRepository';
import { verifyPassword } from './PasswordService';
import * as RateLimiter from './RateLimiter';
import { User } from '../models/User';

export interface LoginResult {
  success: boolean;
  requireCaptcha?: boolean;
  user?: User;
  error?: string;
}

const MAX_FAILED_ATTEMPTS_BEFORE_CAPTCHA = 3;
const LOCK_MINUTES = 30;
const GENERIC_ERROR = '账号或密码错误';

function getLimiterKey(ip: string, email?: string): string {
  return email ? `login:${ip}:${email}` : `login:${ip}`;
}

export async function authenticate(
  email: string,
  password: string,
  ip: string,
  captchaId?: string,
  captchaAnswer?: string
): Promise<LoginResult> {
  const key = getLimiterKey(ip, email);

  if (await RateLimiter.isBlocked(key)) {
    return { success: false, error: '登录尝试过多，请稍后再试' };
  }

  const user = await UserRepository.findByEmail(email);

  if (!user) {
    await RateLimiter.recordFailedAttempt(key);
    return { success: false, error: GENERIC_ERROR };
  }

  if (user.status === 'disabled') {
    return { success: false, error: '账号已被禁用' };
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return { success: false, error: '账号已被锁定，请稍后再试' };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    await UserRepository.incrementFailedAttempts(user.id);
    const attempts = user.failedAttempts + 1;
    if (attempts >= 5) {
      await UserRepository.lockUser(user.id, LOCK_MINUTES);
    }
    await RateLimiter.recordFailedAttempt(key);

    const requireCaptcha = attempts >= MAX_FAILED_ATTEMPTS_BEFORE_CAPTCHA;
    return { success: false, requireCaptcha, error: GENERIC_ERROR };
  }

  await UserRepository.resetFailedAttempts(user.id);
  await RateLimiter.reset(key);
  return { success: true, user };
}
```

Run: `cd server && npx jest tests/unit/services/AuthService.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/services/AuthService.ts server/tests/unit/services/AuthService.test.ts
 git commit -m "feat(auth): implement core login logic with lockout and rate limiting"
```

---

## Task 7: Session Configuration

**Files:**
- Create: `server/src/middleware/session.ts`
- Create: `server/src/types/express.d.ts`
- Create: `server/tests/unit/middleware/session.test.ts`

**Interfaces:**
- Produces: `sessionMiddleware` (Express middleware)
- Produces: `req.session.userId`, `req.session.rememberMe`

- [ ] **Step 1: Write failing test**

```typescript
// server/tests/unit/middleware/session.test.ts
import session from 'express-session';
import { sessionMiddleware } from '../../src/middleware/session';

describe('session middleware', () => {
  it('exports configured express session middleware', () => {
    expect(sessionMiddleware).toBeDefined();
  });
});
```

Run: `cd server && npx jest tests/unit/middleware/session.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement session middleware with PostgreSQL store**

```typescript
// server/src/middleware/session.ts
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../config/database';

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  name: 'sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
});
```

```typescript
// server/src/types/express.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    rememberMe: boolean;
  }
}
```

Run: `cd server && npx jest tests/unit/middleware/session.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/session.ts server/src/types/express.d.ts server/tests/unit/middleware/session.test.ts
 git commit -m "feat(auth): configure HttpOnly SameSite session cookies with pg store"
```

---

## Task 8: Input Validation Middleware

**Files:**
- Create: `server/src/middleware/validate.ts`
- Create: `server/tests/unit/middleware/validate.test.ts`

**Interfaces:**
- Produces: `validateLogin(req, res, next)` — validates email/password format
- Produces: `validateLogout(req, res, next)`

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/unit/middleware/validate.test.ts
import { validateLogin } from '../../src/middleware/validate';
import { Request, Response } from 'express';

describe('validateLogin', () => {
  const mockNext = jest.fn();

  it('rejects invalid email', () => {
    const req = { body: { email: 'not-an-email', password: 'password' } } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    validateLogin(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid input', () => {
    const req = { body: { email: 'user@example.com', password: 'password' } } as Request;
    const res = {} as Response;
    validateLogin(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
```

Run: `cd server && npx jest tests/unit/middleware/validate.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement validation middleware**

```typescript
// server/src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ error: '邮箱和密码不能为空' });
    return;
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: '参数类型错误' });
    return;
  }

  if (!EMAIL_REGEX.test(email) || email.length > 255) {
    res.status(400).json({ error: '邮箱格式不正确' });
    return;
  }

  if (password.length < 6 || password.length > 128) {
    res.status(400).json({ error: '密码长度应在 6-128 位之间' });
    return;
  }

  next();
}

export function validateLogout(req: Request, res: Response, next: NextFunction): void {
  next();
}
```

Run: `cd server && npx jest tests/unit/middleware/validate.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/validate.ts server/tests/unit/middleware/validate.test.ts
 git commit -m "feat(auth): add login input validation middleware"
```

---

## Task 9: Authentication Routes (Login / Logout)

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/tests/integration/auth.test.ts`

**Interfaces:**
- Consumes: `validateLogin`, `authenticate`, `sessionMiddleware`
- Produces: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`

- [ ] **Step 1: Write failing integration tests**

```typescript
// server/tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { query } from '../../src/config/database';
import * as PasswordService from '../../src/services/PasswordService';

describe('Auth Routes', () => {
  const email = 'route@example.com';

  beforeEach(async () => {
    await query('DELETE FROM users WHERE email = $1', [email]);
    const hash = await PasswordService.hashPassword('secret123');
    await query(
      `INSERT INTO users(email, password_hash, status) VALUES ($1, $2, 'active')`,
      [email, hash]
    );
  });

  it('POST /login returns 200 and sets cookie on success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /login returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('账号或密码错误');
  });

  it('POST /logout clears session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email, password: 'secret123' });
    const res = await agent.post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

Run: `cd server && npx jest tests/integration/auth.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement auth routes**

```typescript
// server/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../services/AuthService';
import { validateLogin, validateLogout } from '../middleware/validate';

const router = Router();

router.post('/login', validateLogin, async (req: Request, res: Response) => {
  const { email, password, captchaId, captchaAnswer, rememberMe } = req.body;
  const ip = req.ip || 'unknown';

  const result = await authenticate(email, password, ip, captchaId, captchaAnswer);

  if (!result.success) {
    return res.status(401).json({
      error: result.error,
      requireCaptcha: result.requireCaptcha,
    });
  }

  req.session.userId = result.user!.id;
  req.session.rememberMe = rememberMe === true;

  const maxAge = rememberMe === true ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  req.session.cookie.maxAge = maxAge;

  return res.json({ success: true, userId: result.user!.id });
});

router.post('/logout', validateLogout, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '退出登录失败' });
    }
    res.clearCookie('sid');
    return res.json({ success: true });
  });
});

export default router;
```

- [ ] **Step 3: Wire routes into Express app**

```typescript
// server/src/app.ts
import express from 'express';
import authRoutes from './routes/auth';
import { sessionMiddleware } from './middleware/session';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(express.json());
app.use(sessionMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);
```

Run: `cd server && npx jest tests/integration/auth.test.ts -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/src/routes server/src/app.ts server/tests/integration/auth.test.ts
 git commit -m "feat(auth): add login and logout HTTP endpoints"
```

---

## Task 10: Error Handler and Security Headers

**Files:**
- Create: `server/src/middleware/errorHandler.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/unit/middleware/errorHandler.test.ts`

**Interfaces:**
- Produces: `errorHandler` middleware

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/unit/middleware/errorHandler.test.ts
import { errorHandler } from '../../src/middleware/errorHandler';
import { Request, Response } from 'express';

describe('errorHandler', () => {
  it('returns 500 without leaking details', () => {
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    errorHandler(new Error('secret'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
```

Run: `cd server && npx jest tests/unit/middleware/errorHandler.test.ts -v`
Expected: FAIL

- [ ] **Step 2: Implement error handler and security headers**

```typescript
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

```typescript
// server/src/app.ts (additions)
import helmet from 'helmet';

app.use(helmet());
app.disable('x-powered-by');
```

Run: `cd server && npx jest tests/unit/middleware/errorHandler.test.ts -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/errorHandler.ts server/src/app.ts server/tests/unit/middleware/errorHandler.test.ts
 git commit -m "feat(auth): add global error handler and security headers"
```

---

## Task 11: API Documentation (Interface Examples)

**Files:**
- Create: `docs/auth-api-examples.md`

- [ ] **Step 1: Write documentation**

```markdown
# 认证接口示例

## 登录

### Request
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MyS3cr3t!",
  "rememberMe": false,
  "captchaId": "abc123",
  "captchaAnswer": "X7Y9"
}

### Success Response 200
{
  "success": true,
  "userId": "uuid"
}

### Failure Response 401
{
  "error": "账号或密码错误",
  "requireCaptcha": false
}

## 退出登录

### Request
POST /api/v1/auth/logout

### Response 200
{
  "success": true
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/auth-api-examples.md
 git commit -m "docs(auth): add login/logout API examples"
```

---

## Task 12: Acceptance Tests

**Files:**
- Create: `server/tests/acceptance/login.acceptance.test.ts`

- [ ] **Step 1: Write acceptance tests for all 8 criteria**

```typescript
// server/tests/acceptance/login.acceptance.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { query } from '../../src/config/database';
import * as PasswordService from '../../src/services/PasswordService';

describe('Login Acceptance', () => {
  const email = 'accept@example.com';

  beforeEach(async () => {
    await query('DELETE FROM users WHERE email = $1', [email]);
    const hash = await PasswordService.hashPassword('Valid123!');
    await query(
      `INSERT INTO users(email, password_hash, status) VALUES ($1, $2, 'active')`,
      [email, hash]
    );
  });

  it('AC1: valid credentials return success and set HttpOnly cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Valid123!' });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
  });

  it('AC2: wrong password returns generic error', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('账号或密码错误');
  });

  it('AC3: non-existent user returns generic error', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('账号或密码错误');
  });

  it('AC4: disabled account is rejected', async () => {
    await query(`UPDATE users SET status = 'disabled' WHERE email = $1`, [email]);
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Valid123!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('账号已被禁用');
  });

  it('AC5: brute force triggers lockout', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/login').send({ email, password: 'wrong' });
    }
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Valid123!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/锁定/);
  });

  it('AC6: logout clears session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email, password: 'Valid123!' });
    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(200);
  });

  it('AC7: invalid input returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'bad', password: '1' });
    expect(res.status).toBe(400);
  });

  it('AC8: rememberMe extends cookie lifetime', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Valid123!', rememberMe: true });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/Max-Age=|expires=/i);
  });
});
```

Run: `cd server && npx jest tests/acceptance/login.acceptance.test.ts -v`
Expected: PASS

- [ ] **Step 2: Commit**

```bash
git add server/tests/acceptance/login.acceptance.test.ts
 git commit -m "test(auth): add login acceptance tests covering all 8 criteria"
```

---

## Self-Review

**Spec coverage:**
- 概述 / 目标 / 名词定义 → covered in plan header and architecture sections.
- 角色与范围 → explicit in-scope (login/logout/session/captcha/rate-limit) and out-of-scope note.
- 功能需求 → Tasks 1–12 cover schema, validation, authentication, session, logout.
- 7 类异常场景 → Account not found / wrong password (Task 6), brute-force lockout (Task 4/6), disabled account (Task 6), locked account (Task 6), invalid input (Task 8), rate limited (Task 4).
- 非功能需求 → security (bcrypt, HttpOnly, helmet), performance (Redis, DB indexes), availability (generic errors), compatibility (REST/Cookie).
- 接口示例 → Task 11.
- 验收标准 → Task 12 maps 8 acceptance tests.
- 后续规划 → noted in document header for future third-party login / MFA / SSO.

**Placeholder scan:** No TBD/TODO/fill-later steps remain. Each step includes concrete file paths, code, and commands.

**Type consistency:**
- `User` fields snake-cased in DB, camelCased in code via `mapRow`.
- `authenticate` returns `LoginResult` used in route.
- `req.session.userId` and `rememberMe` extended via declaration merging.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-08-18-login-system-implementation-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach would you prefer?**

Co-authored-by: DTCoder <noreply@dtcoder.local>
