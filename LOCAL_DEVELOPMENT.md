# 本地开发指南

## 快速开始

### 方式一：使用 Docker Compose（推荐）

这是最简单的方式，会自动启动应用和 Redis。

```bash
# 1. 复制环境变量文件
cp .env.local .env

# 2. 启动开发环境（包括 Redis）
npm run docker:dev

# 3. 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 4. 停止服务
docker-compose -f docker-compose.dev.yml down
```

服务将在以下端口运行：
- 应用：http://localhost:3000
- Redis：localhost:6380
- 调试端口：9229

### 方式二：本地直接运行

如果你想在本地直接运行（不使用 Docker）：

```bash
# 1. 安装依赖
npm install

# 2. 启动 Redis（使用 Docker）
docker run -d -p 6380:6379 --name redis-local redis:7-alpine

# 3. 复制环境变量文件
cp .env.local .env

# 4. 启动开发服务器
npm run dev
```

### 方式三：只运行 Redis，本地运行应用

```bash
# 1. 只启动 Redis
docker-compose -f docker-compose.dev.yml up -d redis-dev

# 2. 复制环境变量文件
cp .env.local .env

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev
```

## 可用的 npm 命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start

# 运行测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 运行测试（带覆盖率）
npm run test:coverage

# 代码检查
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run type-check
```

## 访问服务

启动后，你可以访问：

- **健康检查**: http://localhost:3000/health
- **API 文档**: http://localhost:3000/api-docs
- **API 规范**: http://localhost:3000/api-docs.json

## 测试 API

### 健康检查

```bash
curl http://localhost:3000/health
```

### 详细健康检查

```bash
curl http://localhost:3000/api/v1/health/detailed
```

### 系统信息

```bash
curl http://localhost:3000/api/v1/health/info
```

## 调试

### VS Code 调试配置

如果使用 Docker Compose 开发模式，调试端口 9229 已经暴露。

在 `.vscode/launch.json` 中添加：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Docker: Attach to Node",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app",
      "protocol": "inspector",
      "restart": true
    }
  ]
}
```

### 查看日志

```bash
# Docker Compose 日志
docker-compose -f docker-compose.dev.yml logs -f ai-model-proxy-dev

# 本地日志文件
tail -f logs/combined.log
tail -f logs/error.log
```

## 常见问题

### Redis 连接失败

确保 Redis 正在运行：

```bash
# 检查 Redis 容器
docker ps | grep redis

# 测试 Redis 连接
redis-cli -h localhost -p 6380 ping
```

### 端口已被占用

如果端口 3000 或 6380 已被占用，可以修改 `.env` 文件中的端口配置。

### 权限问题

如果遇到文件权限问题：

```bash
# 修复 logs 目录权限
mkdir -p logs
chmod 755 logs
```

## 环境变量说明

### 必需配置

- `PORT`: 应用端口（默认 3000）
- `HOST`: 监听地址（默认 0.0.0.0）
- `NODE_ENV`: 运行环境（development/production/test）

### 可选配置

- `TRIPO_API_URL`: Tripo AI API 地址
- `TENCENT_COS_*`: 腾讯云 COS 配置（本地测试可留空）
- `REDIS_*`: Redis 连接配置
- `LOG_LEVEL`: 日志级别（debug/info/warn/error）

## 下一步

- 查看 [API 文档](http://localhost:3000/api-docs)
- 阅读 [README.md](./README.md) 了解更多信息
- 查看 [测试文档](./TEST_COVERAGE_IMPROVEMENTS.md)
