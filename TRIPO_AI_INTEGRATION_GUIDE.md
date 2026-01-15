# Tripo AI 集成指南

## 📋 当前状态

### ✅ 已完成
- 应用服务正常运行（Node.js v22.22.0）
- Redis 缓存服务正常
- 腾讯云 COS 存储服务正常
- 模型生成 API 接口已实现并可接收请求
- 健康检查系统完整

### ⚠️ 待解决
- Tripo AI Token 认证失败
- Tripo AI API 端点路径需要更新

## 🔑 Token 问题

### 当前 Token
```
tcli_545fa34fb14f4940989bad67b28e073e
```

### 问题
Token 认证失败，Tripo AI API 返回：
```json
{
    "code": 1002,
    "message": "Authentication failed",
    "suggestion": "Check if your credentials is valid, and ensure you set it correctly"
}
```

### 解决方案

1. **获取新的 Token**
   - 访问：https://platform.tripo3d.ai
   - 登录您的账户
   - 进入 API Keys 或 Settings 页面
   - 生成新的 API Token
   - **注意**：正确的 Token 通常以 `tsk_` 开头，而不是 `tcli_`

2. **检查 Token 权限**
   - 确认 Token 有 API 访问权限
   - 确认账户有足够的余额/配额

3. **更新 Token**
   - 获取新 Token 后，使用它来调用 API
   - Token 不需要存储在 `.env` 文件中
   - 每次请求时作为参数传递

## 🔧 需要修改的代码

### 1. 更新 API 端点路径

**文件**: `src/clients/tripoAI.ts`

**当前实现**:
```typescript
// 提交任务
this.client.post('/generate', payload, ...)

// 查询状态
this.client.get(`/jobs/${jobId}`, ...)
```

**应该改为**:
```typescript
// 提交任务
this.client.post('/v2/openapi/task', {
  type: 'text_to_model',  // 或 'image_to_model'
  prompt: input.data,      // 对于文本输入
  // 或 file: base64Image  // 对于图片输入
}, ...)

// 查询状态
this.client.get(`/v2/openapi/task/${taskId}`, ...)
```

### 2. 更新请求格式

**文本到3D模型**:
```typescript
{
  "type": "text_to_model",
  "prompt": "a red apple",
  "model_version": "v2.5-20250107"  // 可选
}
```

**图片到3D模型**:
```typescript
{
  "type": "image_to_model",
  "file": {
    "type": "png",  // 或 jpg, jpeg, webp
    "file_token": "base64_encoded_image"
  },
  "model_version": "v2.5-20250107"  // 可选
}
```

### 3. 更新响应处理

**任务创建响应**:
```typescript
{
  "code": 0,
  "data": {
    "task_id": "uuid-string",
    "status": "queued"
  }
}
```

**状态查询响应**:
```typescript
{
  "code": 0,
  "data": {
    "task_id": "uuid-string",
    "status": "success",  // 或 queued, running, failed
    "output": {
      "model": "https://...",  // GLB 文件下载链接
      "rendered_image": "https://..."  // 渲染图片
    }
  }
}
```

## 🧪 测试步骤

### 1. 获取有效 Token 后测试

```bash
# 1. 创建文本到3D模型任务
curl -X POST http://localhost:3000/api/v1/models \
  -F "type=text" \
  -F "input=a red apple" \
  -F "token=YOUR_NEW_TOKEN_HERE" \
  -F "options[quality]=high"

# 2. 查询任务状态（使用返回的 jobId）
curl http://localhost:3000/api/v1/models/{jobId}/status

# 3. 获取结果（任务完成后）
curl http://localhost:3000/api/v1/models/{jobId}/result
```

### 2. 测试图片到3D模型

```bash
curl -X POST http://localhost:3000/api/v1/models \
  -F "type=image" \
  -F "image=@/path/to/your/image.jpg" \
  -F "token=YOUR_NEW_TOKEN_HERE" \
  -F "options[quality]=high"
```

## 📚 参考资源

- **Tripo AI 官网**: https://www.tripo3d.ai
- **API 平台**: https://platform.tripo3d.ai
- **API 文档**: https://www.tripo3d.ai/api
- **API Base URL**: https://api.tripo3d.ai/v2/openapi

## 🎯 下一步行动

1. **立即执行**:
   - [ ] 访问 https://platform.tripo3d.ai 获取新的 API Token
   - [ ] 确认 Token 格式正确（以 `tsk_` 开头）
   - [ ] 确认账户有足够余额

2. **代码更新**（获取有效 Token 后）:
   - [ ] 更新 `src/clients/tripoAI.ts` 中的 API 端点
   - [ ] 更新请求和响应格式
   - [ ] 测试完整流程

3. **验证**:
   - [ ] 测试文本到3D模型生成
   - [ ] 测试图片到3D模型生成
   - [ ] 验证模型下载功能
   - [ ] 更新 API 测试报告

## 💡 提示

- Token 是敏感信息，不要提交到 Git
- 每次 API 调用都需要传递 Token
- Tripo AI 是按使用量计费的，注意控制成本
- 生成3D模型通常需要几分钟时间，需要轮询状态
