#!/bin/bash

# 本地开发环境快速启动脚本

set -e

echo "🚀 启动本地开发环境..."

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.local .env
    echo "✅ .env 文件已创建"
    echo "⚠️  请根据需要修改 .env 文件中的配置"
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 启动服务
echo "🐳 启动 Docker Compose 服务..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "✅ 服务启动成功！"
echo ""
echo "📍 访问地址："
echo "   - 应用: http://localhost:3000"
echo "   - 健康检查: http://localhost:3000/health"
echo "   - API 文档: http://localhost:3000/api-docs"
echo "   - Redis: localhost:6380"
echo ""
echo "📋 常用命令："
echo "   - 查看日志: docker-compose -f docker-compose.dev.yml logs -f"
echo "   - 停止服务: docker-compose -f docker-compose.dev.yml down"
echo "   - 重启服务: docker-compose -f docker-compose.dev.yml restart"
echo ""
echo "🔍 查看实时日志..."
docker-compose -f docker-compose.dev.yml logs -f
