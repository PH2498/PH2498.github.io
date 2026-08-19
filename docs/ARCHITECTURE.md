# 架构文档

## 项目概述

HelloWorld 演示应用，基于 Spring Boot 3.2 + JDK 21。

## 模块列表

| 模块 | 路径 | 说明 |
|------|------|------|
| helloworld | `src/main/java/com/dtcz/helloworld/` | HelloWorld 问候接口模块 |

## 技术栈

- **框架**：Spring Boot 3.2
- **JDK**：21
- **构建**：Maven
- **测试**：JUnit 5 + Mockito + AssertJ

## 分层架构

```
Controller (Web层) → Service (业务层)
```

当前为单模块演示应用，无数据库依赖。

## 模块边界

- **helloworld**：提供 `/api/hello_world` GET 接口，返回标准化问候消息。