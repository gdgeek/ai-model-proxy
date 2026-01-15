#!/bin/bash

# 启动内部网络版本的 AI Model Proxy 服务

echo "🚀 启动 AI Model Proxy 内部网络服务..."

# 检查环境变量文件
if [ ! -f ".env.internal.local" ]; then
    echo "⚠️  警告: .env.internal.local 文件不存在"
    echo "请复制 .env.internal 文件并重命名为 .env.internal.local，然后填入真实的配置值"
    exit 1
fi

# 加载环境变量
export $(cat .env.internal.local | grep -v '^#' | xargs)

# 启动服务
docker-compose -f docker-compose.internal.yml up -d

echo "✅ 服务启动完成！"
echo ""
echo "📋 服务信息:"
echo "  - 服务只在内部网络中可访问"
echo "  - 内部网络地址: http://ai-model-proxy:3000"
echo "  - Nginx 代理地址: http://nginx:80"
echo "  - 网络名称: ai-model-internal-network"
echo ""
echo "🔍 查看服务状态:"
echo "  docker-compose -f docker-compose.internal.yml ps"
echo ""
echo "📝 查看日志:"
echo "  docker-compose -f docker-compose.internal.yml logs -f"
echo ""
echo "🛑 停止服务:"
echo "  docker-compose -f docker-compose.internal.yml down"