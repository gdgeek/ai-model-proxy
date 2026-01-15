# 安全配置指南

AI Model Proxy 现在支持 API Key 认证，为你的 3D 模型生成服务提供安全保护。

## 🔐 认证机制

### API Key 认证
- 使用简单的 API Key 进行身份验证
- 支持多种传递方式：请求头、查询参数、请求体
- 可选配置：如果不设置 API Key，服务将开放访问

### 认证级别
1. **必需认证** - 创建模型任务、调试接口
2. **可选认证** - 查询状态、获取结果（提供更多信息）
3. **无需认证** - 健康检查接口

## ⚙️ 配置方法

### 1. 环境变量配置

在环境变量文件中添加：
```bash
# API 安全密钥
API_KEY=your_secure_api_key_here
```

### 2. 推荐的 API Key 格式
```bash
# 开发环境
API_KEY=ai-model-proxy-dev-2024-secure

# 生产环境
API_KEY=ai-model-proxy-prod-$(openssl rand -hex 16)

# 或使用 UUID
API_KEY=ai-model-proxy-$(uuidgen)
```

### 3. Docker 环境配置

#### 本地开发
```bash
# .env.local.private
API_KEY=ai-model-proxy-local-2024-secure
```

#### Portainer 部署
在 Portainer Stack 环境变量中添加：
```bash
API_KEY=your_production_api_key_here
```

## 🌐 前端集成

### 1. 请求头方式（推荐）
```javascript
const response = await axios.post('/api/v1/models', formData, {
  headers: {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'multipart/form-data'
  }
})
```

### 2. Authorization 头方式
```javascript
const response = await axios.post('/api/v1/models', formData, {
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'multipart/form-data'
  }
})
```

### 3. 查询参数方式
```javascript
const response = await axios.post('/api/v1/models?apiKey=your-api-key', formData)
```

### 4. 请求体方式
```javascript
const formData = new FormData()
formData.append('apiKey', 'your-api-key')
formData.append('type', 'text')
// ... 其他参数
```

## 🔒 安全最佳实践

### 1. API Key 管理
- ✅ 使用强随机字符串作为 API Key
- ✅ 定期轮换 API Key
- ✅ 不要在代码中硬编码 API Key
- ✅ 使用环境变量或密钥管理系统
- ❌ 不要在客户端代码中暴露 API Key

### 2. 传输安全
- ✅ 在生产环境中使用 HTTPS
- ✅ 使用请求头传递 API Key（推荐）
- ❌ 避免在 URL 中传递敏感信息

### 3. 访问控制
- ✅ 配置适当的 CORS 策略
- ✅ 设置合理的速率限制
- ✅ 监控异常访问模式
- ✅ 记录认证失败日志

### 4. 环境隔离
- ✅ 开发、测试、生产环境使用不同的 API Key
- ✅ 限制 API Key 的访问范围
- ✅ 定期审计 API Key 使用情况

## 📊 API 端点认证要求

| 端点 | 认证要求 | 说明 |
|------|----------|------|
| `POST /api/v1/models` | 必需 | 创建模型生成任务 |
| `GET /api/v1/models/{jobId}/status` | 可选 | 查询任务状态 |
| `GET /api/v1/models/{jobId}/result` | 可选 | 获取生成结果 |
| `GET /api/v1/models/debug/jobs` | 必需 | 调试接口 |
| `GET /health` | 无需 | 健康检查 |
| `GET /api/v1/health/*` | 无需 | 详细健康检查 |

## 🚨 错误响应

### 401 Unauthorized - 缺少 API Key
```json
{
  "error": "Unauthorized",
  "message": "API Key is required",
  "code": "MISSING_API_KEY"
}
```

### 401 Unauthorized - 无效 API Key
```json
{
  "error": "Unauthorized",
  "message": "Invalid API Key",
  "code": "INVALID_API_KEY"
}
```

## 🔧 故障排除

### 1. 认证失败
- 检查 API Key 是否正确设置
- 确认请求头格式正确
- 查看服务器日志确认错误原因

### 2. 前端集成问题
- 确保 API Key 正确传递
- 检查 CORS 配置
- 验证请求格式

### 3. 环境配置问题
- 确认环境变量正确加载
- 检查 Docker 容器环境变量
- 验证配置文件语法

## 📝 示例配置

### 完整的环境变量示例
```bash
# 服务器配置
NODE_ENV=production
PORT=3000

# API 安全
API_KEY=ai-model-proxy-prod-a1b2c3d4e5f6g7h8

# Tripo AI 配置
TRIPO_API_TOKEN=your_tripo_token

# 腾讯云 COS 配置
TENCENT_COS_SECRET_ID=your_cos_id
TENCENT_COS_SECRET_KEY=your_cos_key
TENCENT_COS_REGION=ap-nanjing
TENCENT_COS_BUCKET=your_bucket

# 安全配置
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Vue 3 前端集成示例
```javascript
// composables/useAuth.js
import { ref } from 'vue'

const apiKey = ref(localStorage.getItem('apiKey') || '')

export function useAuth() {
  const setApiKey = (key) => {
    apiKey.value = key
    localStorage.setItem('apiKey', key)
  }

  const getAuthHeaders = () => {
    return apiKey.value ? { 'X-API-Key': apiKey.value } : {}
  }

  return {
    apiKey,
    setApiKey,
    getAuthHeaders
  }
}
```

## 🔄 迁移指南

### 从无认证版本升级
1. 设置 `API_KEY` 环境变量
2. 更新前端代码添加 API Key 传递
3. 测试所有 API 端点
4. 部署到生产环境

### 禁用认证（不推荐）
如果需要临时禁用认证，可以：
1. 不设置 `API_KEY` 环境变量
2. 或设置为空字符串：`API_KEY=`

这个安全配置为你的 AI 模型生成服务提供了基础但有效的保护！