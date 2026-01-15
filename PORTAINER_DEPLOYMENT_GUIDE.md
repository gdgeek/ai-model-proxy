# Portainer 部署指南

这个指南将帮助你在 Portainer 中部署 AI 3D 模型生成器。

## 📋 部署概览

### 服务组件
- **ai-api** - 后端 API 服务 (端口 3000)
- **ai-web** - 前端 Web 服务 (端口 5173)
- **db** - Redis 数据库 (端口 6379)

### 网络架构
- 所有服务在同一个 Docker 网络中
- 通过 Portainer 管理端口映射和外部访问
- 不使用 Nginx 反向代理，简化架构

## 🚀 Portainer 部署步骤

### 1. 准备部署文件

将以下文件上传到你的服务器：
- `docker-compose.portainer.yml`
- `Dockerfile`
- `frontend-demo/Dockerfile.prod`
- `frontend-demo/nginx.conf`
- 整个项目源代码

### 2. 在 Portainer 中创建 Stack

1. 登录 Portainer 管理界面
2. 选择 "Stacks" → "Add stack"
3. 输入 Stack 名称：`ai-model-generator`
4. 选择部署方式：

#### 方式 A：上传 Compose 文件
- 上传 `docker-compose.portainer.yml` 文件

#### 方式 B：Git Repository
- Repository URL: `https://github.com/gdgeek/ai-model-proxy.git`
- Compose path: `docker-compose.portainer.yml`

### 3. 配置环境变量

在 Portainer Stack 配置中添加以下环境变量：

```bash
# Tripo AI 配置
TRIPO_API_TOKEN=your_tripo_api_token

# 腾讯云 COS 配置
TENCENT_COS_SECRET_ID=your_secret_id
TENCENT_COS_SECRET_KEY=your_secret_key
TENCENT_COS_REGION=ap-nanjing
TENCENT_COS_BUCKET=your_bucket_name
```

### 4. 部署 Stack

1. 点击 "Deploy the stack"
2. 等待所有服务启动完成
3. 检查服务状态

## 🔧 端口配置

### 默认端口映射
- **前端**: `5173:80` - Web 界面
- **后端**: `3000:3000` - API 服务
- **Redis**: `6379:6379` - 数据库（可选）

### 自定义端口
你可以在 Portainer 中修改端口映射：
- 前端：`8080:80` (推荐用于生产环境)
- 后端：`8081:3000`

## 🌐 访问服务

部署完成后，你可以通过以下地址访问：

- **Web 界面**: `http://your-server:5173`
- **API 文档**: `http://your-server:3000/api-docs`
- **健康检查**: `http://your-server:3000/health`

## 📊 监控和管理

### 在 Portainer 中监控
1. **Containers** - 查看容器状态和日志
2. **Networks** - 管理网络配置
3. **Volumes** - 管理数据持久化
4. **Images** - 管理镜像版本

### 健康检查
所有服务都配置了健康检查：
- API 服务：`GET /health`
- Redis：`redis-cli ping`
- Web 服务：`GET /health`

### 日志查看
在 Portainer 中可以直接查看各服务的日志：
- 选择对应的容器
- 点击 "Logs" 标签页
- 实时查看日志输出

## 🔄 更新部署

### 方式 1：通过 Portainer
1. 在 Stacks 页面选择你的 stack
2. 点击 "Editor" 标签页
3. 修改配置后点击 "Update the stack"

### 方式 2：Git 自动更新
如果使用 Git Repository 部署：
1. 推送代码到 Git 仓库
2. 在 Portainer 中点击 "Pull and redeploy"

## 🛠️ 故障排除

### 常见问题

1. **服务启动失败**
   - 检查环境变量是否正确设置
   - 查看容器日志确认错误信息
   - 确认端口没有被占用

2. **API 调用失败**
   - 检查 Tripo AI Token 是否有效
   - 确认网络连接正常
   - 查看 API 服务日志

3. **前端无法访问后端**
   - 确认服务在同一网络中
   - 检查 CORS 配置
   - 验证服务名称解析

### 调试命令

在 Portainer 的容器控制台中执行：

```bash
# 检查 API 服务
curl http://ai-api:3000/health

# 检查 Redis 连接
redis-cli -h db ping

# 查看网络配置
docker network ls
docker network inspect ai-model-network
```

## 📈 性能优化

### 资源限制
已在 compose 文件中配置了资源限制：
- API 服务：最大 1GB 内存，1 CPU
- Web 服务：最大 256MB 内存，0.5 CPU
- Redis：最大 512MB 内存，0.5 CPU

### 扩展建议
1. **负载均衡**: 可以通过 Portainer 创建多个 API 服务实例
2. **数据备份**: 定期备份 Redis 数据卷
3. **监控告警**: 集成 Prometheus + Grafana 监控

## 🔒 安全建议

1. **环境变量**: 使用 Portainer 的 Secrets 管理敏感信息
2. **网络隔离**: 考虑使用自定义网络隔离服务
3. **访问控制**: 配置防火墙规则限制访问
4. **HTTPS**: 在生产环境中使用 HTTPS

## 📝 备份和恢复

### 备份
```bash
# 备份 Redis 数据
docker exec ai-model-redis redis-cli BGSAVE

# 备份数据卷
docker run --rm -v ai-model-generator_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .
```

### 恢复
```bash
# 恢复数据卷
docker run --rm -v ai-model-generator_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data
```

这个配置专门为 Portainer 优化，去除了 Nginx 复杂性，让你可以直接通过 Portainer 的界面管理所有服务！