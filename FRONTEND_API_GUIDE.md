# AI Model Proxy - 前端 API 调用指南

这是一个 3D 模型生成服务的后端 API，支持文本到 3D 模型和图片到 3D 模型的转换。

## 🚀 基础信息

- **服务地址**: `http://localhost:3000` (开发环境)
- **API 版本**: v1
- **认证方式**: Token 认证（通过表单参数传递）
- **支持格式**: 生成 OBJ 格式的 3D 模型文件

## 📋 API 端点概览

### 健康检查
- `GET /health` - 基础健康检查
- `GET /api/v1/health/detailed` - 详细健康检查

### 3D 模型生成
- `POST /api/v1/models` - 创建模型生成任务
- `GET /api/v1/models/{jobId}/status` - 查询任务状态
- `GET /api/v1/models/{jobId}/result` - 获取生成结果

### API 文档
- `GET /api-docs` - Swagger UI 文档界面

## 🎯 核心 API 详细说明

### 1. 创建 3D 模型生成任务

**端点**: `POST /api/v1/models`

**请求方式**: `multipart/form-data`

**必需参数**:
- `type`: 生成类型
  - `"text"` - 文本到 3D 模型
  - `"image"` - 图片到 3D 模型
- `token`: Tripo AI 认证令牌
- `input`: 输入内容
  - 当 `type="text"` 时：文本描述（如 "a cute red apple"）
  - 当 `type="image"` 时：图片文件

**可选参数**:
- `options[quality]`: 生成质量
  - `"high"` - 高质量（推荐）
  - `"medium"` - 中等质量
  - `"low"` - 低质量

**JavaScript 调用示例**:

```javascript
// 文本到 3D 模型
const createTextTo3D = async (description, token) => {
  const formData = new FormData();
  formData.append('type', 'text');
  formData.append('input', description);
  formData.append('token', token);
  formData.append('options[quality]', 'high');

  const response = await fetch('http://localhost:3000/api/v1/models', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};

// 图片到 3D 模型
const createImageTo3D = async (imageFile, token) => {
  const formData = new FormData();
  formData.append('type', 'image');
  formData.append('input', imageFile); // File 对象
  formData.append('token', token);
  formData.append('options[quality]', 'high');

  const response = await fetch('http://localhost:3000/api/v1/models', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};
```

**成功响应**:
```json
{
  "jobId": "4b58a9bf-04cd-4d65-9bd5-11d8901ca8ab",
  "status": "pending",
  "message": "模型生成请求已提交",
  "estimatedTime": 300
}
```

### 2. 查询任务状态

**端点**: `GET /api/v1/models/{jobId}/status`

**JavaScript 调用示例**:
```javascript
const checkJobStatus = async (jobId) => {
  const response = await fetch(`http://localhost:3000/api/v1/models/${jobId}/status`);
  return await response.json();
};
```

**响应状态说明**:
- `"pending"` - 等待处理
- `"processing"` - 正在生成
- `"completed"` - 生成完成
- `"failed"` - 生成失败

**处理中响应**:
```json
{
  "jobId": "4b58a9bf-04cd-4d65-9bd5-11d8901ca8ab",
  "status": "processing",
  "message": "正在生成模型"
}
```

**完成响应**:
```json
{
  "jobId": "4b58a9bf-04cd-4d65-9bd5-11d8901ca8ab",
  "status": "completed",
  "message": "模型生成已完成",
  "result": {
    "modelUrl": "https://example.com/models/model.obj",
    "metadata": {
      "fileSize": 1024000,
      "format": "obj",
      "generationTime": 79193
    }
  }
}
```

### 3. 获取生成结果

**端点**: `GET /api/v1/models/{jobId}/result`

**JavaScript 调用示例**:
```javascript
const getJobResult = async (jobId) => {
  const response = await fetch(`http://localhost:3000/api/v1/models/${jobId}/result`);
  return await response.json();
};
```

**成功响应**: 与状态查询的完成响应相同

## 🔄 完整的前端集成流程

```javascript
class ModelGenerationClient {
  constructor(baseUrl = 'http://localhost:3000', token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  // 创建文本到 3D 模型任务
  async createTextModel(description, quality = 'high') {
    const formData = new FormData();
    formData.append('type', 'text');
    formData.append('input', description);
    formData.append('token', this.token);
    formData.append('options[quality]', quality);

    const response = await fetch(`${this.baseUrl}/api/v1/models`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // 创建图片到 3D 模型任务
  async createImageModel(imageFile, quality = 'high') {
    const formData = new FormData();
    formData.append('type', 'image');
    formData.append('input', imageFile);
    formData.append('token', this.token);
    formData.append('options[quality]', quality);

    const response = await fetch(`${this.baseUrl}/api/v1/models`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // 轮询任务状态直到完成
  async waitForCompletion(jobId, pollInterval = 5000, maxAttempts = 60) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkStatus(jobId);
      
      if (status.status === 'completed') {
        return status;
      } else if (status.status === 'failed') {
        throw new Error(`任务失败: ${status.message}`);
      }
      
      // 等待指定时间后再次检查
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('任务超时');
  }

  // 检查任务状态
  async checkStatus(jobId) {
    const response = await fetch(`${this.baseUrl}/api/v1/models/${jobId}/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  // 获取任务结果
  async getResult(jobId) {
    const response = await fetch(`${this.baseUrl}/api/v1/models/${jobId}/result`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  // 检查服务健康状态
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }
}

// 使用示例
const client = new ModelGenerationClient('http://localhost:3000', 'your-token-here');

// 文本到 3D 模型的完整流程
async function generateModelFromText(description) {
  try {
    // 1. 创建任务
    const job = await client.createTextModel(description);
    console.log('任务已创建:', job.jobId);
    
    // 2. 等待完成
    const result = await client.waitForCompletion(job.jobId);
    console.log('模型生成完成:', result.result.modelUrl);
    
    return result.result.modelUrl;
  } catch (error) {
    console.error('生成失败:', error.message);
    throw error;
  }
}

// 图片到 3D 模型的完整流程
async function generateModelFromImage(imageFile) {
  try {
    // 1. 创建任务
    const job = await client.createImageModel(imageFile);
    console.log('任务已创建:', job.jobId);
    
    // 2. 等待完成
    const result = await client.waitForCompletion(job.jobId);
    console.log('模型生成完成:', result.result.modelUrl);
    
    return result.result.modelUrl;
  } catch (error) {
    console.error('生成失败:', error.message);
    throw error;
  }
}
```

## 📝 React 组件示例

```jsx
import React, { useState } from 'react';

const ModelGenerator = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState('');
  const [error, setError] = useState('');

  const generateModel = async () => {
    if (!description.trim()) {
      setError('请输入模型描述');
      return;
    }

    setLoading(true);
    setError('');
    setModelUrl('');

    try {
      const client = new ModelGenerationClient('http://localhost:3000', 'your-token-here');
      const url = await generateModelFromText(description);
      setModelUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="model-generator">
      <h2>3D 模型生成器</h2>
      
      <div className="input-section">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述你想要的 3D 模型，例如：一个可爱的红苹果"
          rows={4}
          cols={50}
        />
        <br />
        <button onClick={generateModel} disabled={loading}>
          {loading ? '生成中...' : '生成 3D 模型'}
        </button>
      </div>

      {error && (
        <div className="error">
          错误: {error}
        </div>
      )}

      {modelUrl && (
        <div className="result">
          <h3>生成成功！</h3>
          <p>模型下载地址: <a href={modelUrl} target="_blank" rel="noopener noreferrer">{modelUrl}</a></p>
        </div>
      )}
    </div>
  );
};

export default ModelGenerator;
```

## ⚠️ 重要注意事项

1. **Token 安全**: 不要在前端代码中硬编码 Token，应该通过环境变量或后端接口获取

2. **错误处理**: 始终包含适当的错误处理逻辑

3. **超时处理**: 3D 模型生成可能需要 1-5 分钟，确保设置合适的超时时间

4. **文件大小限制**: 上传的图片文件不应超过 10MB

5. **支持的图片格式**: JPEG, PNG, WebP

6. **CORS 配置**: 确保后端正确配置了 CORS 以支持前端跨域请求

## 🔧 错误码说明

- `400` - 请求参数错误
- `401` - Token 认证失败
- `404` - 任务不存在
- `413` - 文件过大
- `429` - 请求频率过高
- `500` - 服务器内部错误
- `503` - 服务不可用

## 📊 性能参考

- **任务创建**: 通常 < 1 秒
- **文本到 3D**: 通常 60-120 秒
- **图片到 3D**: 通常 90-180 秒
- **文件大小**: 生成的 OBJ 文件通常 100KB - 2MB

这个 API 设计简单易用，支持现代前端框架的集成。记得在生产环境中使用 HTTPS 和适当的认证机制。