# AI模型代理服务 - 知识库

## 项目概述

AI模型代理服务是一个基于Node.js和TypeScript构建的企业级后端系统，作为前端客户端与Tripo AI 3D模型生成服务之间的代理层，集成腾讯云COS进行文件存储管理。该服务采用现代化的微服务架构模式，提供RESTful API接口，支持图片和文本输入的3D模型生成。

### 核心功能

- **多输入支持**: 接受图片（JPEG、PNG、WebP）或文本输入进行3D模型生成
- **异步处理**: 基于作业队列的异步处理机制，支持长时间运行的模型生成任务
- **自动存储**: 生成的模型自动上传到腾讯云COS，提供持久化存储
- **状态监控**: 实时作业状态监控和轮询机制，支持进度查询
- **安全可靠**: 完整的错误处理、重试机制和安全中间件
- **高性能**: Redis缓存、连接池和速率限制
- **容器化**: 完整的Docker和Docker Compose支持
- **CI/CD**: GitHub Actions自动化流水线

## 技术架构

### 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端客户端    │───▶│  负载均衡器     │───▶│   API网关层     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                AI模型代理服务   │                                 │
                       │                                 ▼                                 │
                       │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
                       │  │   控制器层      │───▶│    服务层       │───▶│  外部集成层     │ │
                       │  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
                       │                                 │                        │         │
                       │                                 ▼                        ▼         │
                       │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
                       │  │    存储层       │    │   缓存层        │    │   监控日志      │ │
                       │  │  (临时文件)     │    │   (Redis)       │    │   (Winston)     │ │
                       │  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
                       └─────────────────────────────────────────────────────────────────────┘
                                                       │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 ▼                                 │
                       │  ┌─────────────────┐                    ┌─────────────────┐       │
                       │  │   Tripo AI      │                    │   腾讯云COS     │       │
                       │  │   API服务       │                    │   对象存储      │       │
                       │  └─────────────────┘                    └─────────────────┘       │
                       └─────────────────────────────────────────────────────────────────────┘
```

### 技术栈

**核心框架**
- **Node.js 18+**: 运行时环境，提供优秀的异步I/O性能
- **Express.js 4.x**: Web框架，轻量级且灵活
- **TypeScript**: 类型安全的JavaScript超集，提高代码质量

**中间件和工具**
- **Helmet**: 安全中间件，设置HTTP安全头
- **Compression**: 响应压缩中间件
- **Morgan**: HTTP请求日志中间件
- **Cors**: 跨域资源共享配置
- **Multer**: 文件上传处理中间件

**外部集成**
- **Axios**: HTTP客户端，用于API调用
- **cos-nodejs-sdk-v5**: 腾讯云COS官方SDK
- **Redis**: 缓存和会话存储
- **Winston**: 结构化日志记录

**开发和部署**
- **Docker**: 容器化部署
- **Docker Compose**: 本地开发环境编排
- **GitHub Actions**: CI/CD自动化
- **Swagger/OpenAPI 3.0**: API文档生成

## 项目结构

```
ai-model-proxy/
├── src/                          # 源代码目录
│   ├── app.ts                    # Express应用主文件
│   ├── index.ts                  # 应用入口文件
│   ├── config/                   # 配置管理
│   │   └── index.ts              # 环境配置和验证
│   ├── controllers/              # 控制器层
│   │   ├── health.ts             # 健康检查控制器
│   │   └── model.ts              # 模型生成控制器
│   ├── services/                 # 业务逻辑层
│   │   ├── modelGeneration.ts    # 模型生成服务
│   │   ├── fileStorage.ts        # 文件存储服务
│   │   └── cache.ts              # 缓存服务
│   ├── clients/                  # 外部服务客户端
│   │   ├── tripoAI.ts            # Tripo AI客户端
│   │   └── tencentCOS.ts         # 腾讯云COS客户端
│   ├── middleware/               # 中间件
│   │   ├── errorHandler.ts       # 全局错误处理
│   │   ├── security.ts           # 安全中间件
│   │   ├── validation.ts         # 输入验证
│   │   └── context.ts            # 请求上下文
│   ├── routes/                   # 路由定义
│   │   ├── index.ts              # 路由汇总
│   │   ├── health.ts             # 健康检查路由
│   │   └── model.ts              # 模型API路由
│   ├── types/                    # TypeScript类型定义
│   │   ├── index.ts              # 核心类型
│   │   ├── errors.ts             # 错误类型
│   │   └── express.ts            # Express扩展类型
│   ├── utils/                    # 工具函数
│   │   ├── logger.ts             # 日志工具
│   │   └── gracefulShutdown.ts   # 优雅关闭
│   ├── docs/                     # API文档
│   │   └── openapi.ts            # OpenAPI规范
│   └── test/                     # 测试文件
├── docs/                         # 项目文档
│   └── knowledge-base.md         # 知识库文档
├── .kiro/                        # Kiro规范文档
│   └── specs/ai-model-proxy/     # 项目规范
│       ├── requirements.md       # 需求文档
│       ├── design.md             # 设计文档
│       └── tasks.md              # 任务清单
├── .github/                      # GitHub配置
│   └── workflows/                # CI/CD工作流
│       └── ci-cd.yml             # 自动化流水线
├── docker-compose.yml            # 生产环境编排
├── docker-compose.dev.yml        # 开发环境编排
├── Dockerfile                    # 生产环境镜像
├── Dockerfile.dev                # 开发环境镜像
├── package.json                  # 项目依赖和脚本
├── tsconfig.json                 # TypeScript配置
├── jest.config.js                # 测试配置
├── .env.example                  # 环境变量模板
└── README.md                     # 项目说明
```

## API文档

### 核心端点

#### 1. 创建模型生成任务
```http
POST /api/v1/models
Content-Type: multipart/form-data (图片) 或 application/json (文本)

# 图片输入
{
  "type": "image",
  "token": "your-tripo-api-token",
  "file": <图片文件>
}

# 文本输入
{
  "type": "text",
  "input": "A red sports car",
  "token": "your-tripo-api-token"
}

# 响应
{
  "jobId": "uuid-v4",
  "status": "pending",
  "message": "模型生成请求已提交",
  "estimatedTime": 300
}
```

#### 2. 查询模型生成状态
```http
GET /api/v1/models/{jobId}/status

# 响应
{
  "jobId": "uuid-v4",
  "status": "processing",
  "message": "正在生成模型",
  "progress": 45
}
```

#### 3. 获取模型结果
```http
GET /api/v1/models/{jobId}/result

# 响应
{
  "jobId": "uuid-v4",
  "status": "completed",
  "message": "模型生成已完成",
  "result": {
    "modelUrl": "https://cos-url/model.obj",
    "metadata": {
      "fileSize": 1024000,
      "format": "obj",
      "generationTime": 180000
    }
  }
}
```

#### 4. 健康检查端点
```http
GET /health              # 基础健康检查
GET /ready               # 就绪检查
GET /health/detailed     # 详细健康检查
GET /health/info         # 系统信息
```

#### 5. API文档端点
```http
GET /api-docs            # Swagger UI界面
GET /api-docs.json       # OpenAPI规范JSON
```

### 状态码说明

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功获取资源 |
| 201 | Created | 成功创建新任务 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 认证失败 |
| 404 | Not Found | 资源不存在 |
| 413 | Payload Too Large | 文件过大 |
| 415 | Unsupported Media Type | 不支持的文件格式 |
| 422 | Unprocessable Entity | 业务逻辑错误 |
| 429 | Too Many Requests | 请求频率限制 |
| 500 | Internal Server Error | 服务器内部错误 |
| 502 | Bad Gateway | 外部服务不可用 |
| 503 | Service Unavailable | 服务暂时不可用 |
| 504 | Gateway Timeout | 外部服务超时 |

## 环境配置

### 必需环境变量

```bash
# 服务器配置
PORT=3000                          # 服务端口
HOST=0.0.0.0                       # 服务主机
NODE_ENV=development               # 运行环境

# Tripo AI 配置
TRIPO_API_URL=https://api.tripo3d.ai    # Tripo AI API地址
TRIPO_API_TIMEOUT=30000                 # 请求超时时间(ms)
TRIPO_MAX_RETRIES=3                     # 最大重试次数
TRIPO_RETRY_DELAY=1000                  # 重试延迟(ms)

# 腾讯云 COS 配置
TENCENT_COS_SECRET_ID=your_secret_id    # 腾讯云密钥ID
TENCENT_COS_SECRET_KEY=your_secret_key  # 腾讯云密钥Key
TENCENT_COS_REGION=ap-beijing           # COS区域
TENCENT_COS_BUCKET=your-bucket-name     # COS存储桶名称

# Redis 配置
REDIS_HOST=localhost                    # Redis主机
REDIS_PORT=6379                         # Redis端口
REDIS_PASSWORD=                         # Redis密码(可选)
REDIS_DB=0                              # Redis数据库编号

# 文件上传配置
MAX_FILE_SIZE=10485760                  # 最大文件大小(10MB)
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp  # 支持的图片格式

# 日志配置
LOG_LEVEL=info                          # 日志级别
LOG_FORMAT=json                         # 日志格式

# 安全配置
CORS_ORIGIN=*                           # CORS允许的源
RATE_LIMIT_WINDOW_MS=900000             # 速率限制窗口(15分钟)
RATE_LIMIT_MAX_REQUESTS=100             # 速率限制最大请求数
```

### 配置验证

系统启动时会自动验证所有必需的环境变量，如果缺少必需配置或格式不正确，会抛出详细的错误信息。

## 部署指南

### 本地开发

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **运行测试**
```bash
npm test                # 运行所有测试
npm run test:watch      # 监视模式
npm run test:coverage   # 生成覆盖率报告
```

### Docker部署

#### 使用Docker Compose（推荐）

1. **生产环境部署**
```bash
docker-compose up -d
```

2. **开发环境部署**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

#### 单独构建Docker镜像

1. **构建镜像**
```bash
docker build -t ai-model-proxy .
```

2. **运行容器**
```bash
docker run -p 3000:3000 --env-file .env ai-model-proxy
```

### 生产环境部署

1. **环境准备**
   - Node.js 18+
   - Redis服务器
   - 腾讯云COS账户和配置
   - Tripo AI API访问权限

2. **构建和启动**
```bash
npm run build
npm start
```

3. **使用PM2管理进程**
```bash
npm install -g pm2
pm2 start dist/index.js --name ai-model-proxy
pm2 startup
pm2 save
```

4. **Nginx反向代理配置**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 监控和日志

### 日志系统

系统使用Winston进行结构化日志记录，支持多种日志级别和格式：

- **日志级别**: error, warn, info, debug
- **日志格式**: JSON（生产环境）, simple（开发环境）
- **日志内容**: 请求追踪ID、时间戳、错误堆栈、性能指标

### 健康检查

系统提供多层次的健康检查端点：

1. **基础健康检查** (`/health`)
   - 检查应用程序基本状态
   - 返回简单的状态信息

2. **就绪检查** (`/ready`)
   - 检查所有依赖服务状态
   - 包括Redis、Tripo AI、腾讯云COS连接状态

3. **详细健康检查** (`/health/detailed`)
   - 提供详细的系统状态信息
   - 包括内存使用、CPU负载、依赖服务状态

4. **系统信息** (`/health/info`)
   - 返回系统版本、环境信息
   - 用于运维监控和故障排查

### 性能监控

- **请求追踪**: 每个请求都有唯一的追踪ID
- **响应时间**: 记录API响应时间
- **错误率**: 统计错误发生频率
- **外部服务调用**: 监控Tripo AI和COS的调用状态

## 错误处理

### 错误分类

系统采用分层错误处理机制，将错误分为以下类别：

1. **客户端错误 (4xx)**
   - 输入验证错误
   - 认证授权错误
   - 资源不存在错误

2. **服务器错误 (5xx)**
   - 内部系统错误
   - 外部服务不可用
   - 网络超时错误

### 错误响应格式

所有错误响应都遵循统一的格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "用户友好的错误消息",
    "details": "详细错误信息（开发环境）",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

### 重试机制

系统实现了智能重试机制：

- **指数退避**: 重试间隔逐渐增加
- **最大重试次数**: 默认3次
- **可重试错误**: 网络超时、5xx服务器错误
- **不可重试错误**: 4xx客户端错误、认证失败

## 安全措施

### 安全中间件

1. **Helmet**: 设置安全HTTP头
2. **CORS**: 跨域资源共享控制
3. **速率限制**: 防止API滥用
4. **请求大小限制**: 防止大文件攻击
5. **输入验证**: 严格的参数验证

### 数据安全

1. **敏感信息**: 环境变量中的密钥不会记录到日志
2. **文件验证**: 上传文件的格式和大小验证
3. **请求追踪**: 每个请求都有唯一标识符
4. **错误信息**: 生产环境不暴露敏感的错误详情

## 测试策略

### 测试类型

1. **单元测试**: 测试单个函数和类的功能
2. **集成测试**: 测试组件间的交互
3. **属性测试**: 使用fast-check进行基于属性的测试
4. **端到端测试**: 测试完整的API流程

### 测试覆盖率

- 目标覆盖率: 90%以上
- 关键路径: 100%覆盖
- 错误处理: 完整的异常场景测试

### 运行测试

```bash
npm test                # 运行所有测试
npm run test:watch      # 监视模式
npm run test:coverage   # 生成覆盖率报告
```

## 故障排除

### 常见问题

1. **服务启动失败**
   - 检查环境变量配置
   - 确认端口是否被占用
   - 验证Redis连接

2. **外部服务连接失败**
   - 检查网络连接
   - 验证API密钥和权限
   - 查看服务状态

3. **文件上传失败**
   - 检查文件大小限制
   - 验证文件格式
   - 确认COS配置

4. **性能问题**
   - 检查Redis缓存状态
   - 监控内存使用
   - 分析日志中的响应时间

### 调试技巧

1. **启用调试日志**
```bash
LOG_LEVEL=debug npm start
```

2. **查看详细健康检查**
```bash
curl http://localhost:3000/health/detailed
```

3. **监控系统资源**
```bash
curl http://localhost:3000/health/info
```

## 开发指南

### 代码规范

项目使用ESLint和Prettier进行代码规范检查：

```bash
npm run lint        # 检查代码规范
npm run lint:fix    # 自动修复
npm run format      # 格式化代码
```

### 提交规范

使用约定式提交格式：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

### 开发流程

1. **创建功能分支**
```bash
git checkout -b feature/new-feature
```

2. **开发和测试**
```bash
npm run dev         # 启动开发服务器
npm test            # 运行测试
```

3. **提交代码**
```bash
git add .
git commit -m "feat: 添加新功能"
git push origin feature/new-feature
```

4. **创建Pull Request**
   - 描述变更内容
   - 确保所有测试通过
   - 等待代码审查

## CI/CD流水线

### GitHub Actions工作流

项目使用GitHub Actions进行自动化CI/CD：

1. **代码检查**
   - ESLint代码规范检查
   - TypeScript类型检查
   - 单元测试和集成测试

2. **构建和部署**
   - Docker镜像构建
   - 镜像推送到注册表
   - 自动部署到测试环境

3. **质量门禁**
   - 测试覆盖率检查
   - 安全漏洞扫描
   - 性能基准测试

### 部署策略

- **开发环境**: 每次推送到develop分支自动部署
- **测试环境**: 每次创建Pull Request自动部署
- **生产环境**: 手动触发或标签推送部署

## 性能优化

### 缓存策略

1. **Redis缓存**: 作业状态和结果缓存
2. **HTTP缓存**: 静态资源缓存头设置
3. **连接池**: 数据库和外部服务连接复用

### 性能监控

1. **响应时间**: API响应时间监控
2. **吞吐量**: 请求处理能力监控
3. **资源使用**: CPU和内存使用监控
4. **外部依赖**: 第三方服务响应时间

### 优化建议

1. **异步处理**: 长时间任务异步执行
2. **批量操作**: 减少外部服务调用次数
3. **资源清理**: 定期清理过期数据
4. **负载均衡**: 多实例部署和负载分发

## 扩展指南

### 添加新的模型提供商

1. **创建客户端类**
```typescript
// src/clients/newProvider.ts
export class NewProviderClient {
  async submitRequest(input: ModelInput): Promise<ProviderResponse> {
    // 实现提供商API调用
  }
}
```

2. **更新服务层**
```typescript
// src/services/modelGeneration.ts
// 添加新提供商的处理逻辑
```

3. **添加配置**
```typescript
// src/config/index.ts
// 添加新提供商的配置项
```

### 添加新的存储后端

1. **实现存储接口**
```typescript
// src/clients/newStorage.ts
export class NewStorageClient implements StorageInterface {
  async uploadFile(file: Buffer): Promise<UploadResult> {
    // 实现存储逻辑
  }
}
```

2. **更新配置和服务**
   - 添加配置选项
   - 更新文件存储服务
   - 添加相应测试

## 许可证

MIT License - 详见LICENSE文件

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支
3. 提交变更
4. 推送到分支
5. 创建Pull Request

## 联系方式

- 项目维护者: AI Model Proxy Team
- 问题反馈: GitHub Issues
- 技术支持: 通过GitHub Discussions

---

*最后更新: 2024年1月*