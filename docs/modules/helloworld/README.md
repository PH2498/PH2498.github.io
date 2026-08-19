# helloworld 模块

## 模块职责

提供 HelloWorld 问候 REST API 接口。

## 关键类

| 类 | 类型 | 说明 |
|---|------|------|
| `HelloWorldApplication` | 启动类 | Spring Boot 入口 |
| `HelloWorldController` | 控制器 | REST 接口 `/api/hello_world` |
| `HelloWorldService` | 接口 | 问候业务服务接口 |
| `HelloWorldServiceImpl` | 实现 | 问候业务服务实现 |
| `HelloWorldDTO` | DTO | 问候消息响应对象 |
| `ApiResponse<T>` | 通用模型 | 标准 API 统一响应体 |
| `HelloWorldConstants` | 常量 | 模块常量定义 |

## 依赖关系

- 无外部模块依赖
- 仅依赖 Spring Boot Web Starter

## API 接口列表

| 方法 | 路径 | 说明 | 请求参数 | 响应 |
|------|------|------|---------|------|
| GET | `/api/hello_world` | 获取问候消息 | 无 | `ApiResponse<HelloWorldDTO>` |

### 响应示例

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "message": "Hello, World!"
    }
}
```