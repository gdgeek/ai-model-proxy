#!/bin/bash

# 启动完整的本地开发环境（前端 + 后端 + 数据库）

echo "🚀 启动完整的 AI 3D 模型生成器本地环境..."

# 检查环境变量文件
if [ ! -f ".env.local.private" ]; then
    echo "⚠️  警告: .env.local.private 文件不存在"
    echo "请复制 .env.local 文件并重命名为 .env.local.private，然后填入真实的配置值"
    
    # 创建示例文件
    if [ ! -f ".env.local.private" ]; then
        cp .env.local .env.local.private
        echo "✅ 已创建 .env.local.private 示例文件，请编辑并填入真实配置"
    fi
    
    read -p "是否继续启动？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 加载环境变量
if [ -f ".env.local.private" ]; then
    export $(cat .env.local.private | grep -v '^#' | xargs)
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未找到 Docker，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未找到 docker-compose，请先安装 docker-compose"
    exit 1
fi

# 停止可能存在的服务
echo "🛑 停止现有服务..."
docker-compose -f docker-compose.local.yml down

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose -f docker-compose.local.yml up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.local.yml ps

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📋 访问信息:"
echo "  🌐 完整应用: http://localhost:8080"
echo "  📱 前端页面: http://localhost:8080"
echo "  🔧 API 接口: http://localhost:8080/api"
echo "  📚 API 文档: http://localhost:8080/api-docs"
echo "  ❤️  健康检查: http://localhost:8080/health"
echo ""
echo "🐳 Docker 服务:"
echo "  - ai-model-web-local (前端)"
echo "  - ai-model-api-local (后端)"
echo "  - ai-model-db-local (Redis)"
echo "  - ai-model-proxy-local (Nginx)"
echo ""
echo "🔍 常用命令:"
echo "  查看日志: docker-compose -f docker-compose.local.yml logs -f"
echo "  查看状态: docker-compose -f docker-compose.local.yml ps"
echo "  停止服务: docker-compose -f docker-compose.local.yml down"
echo "  重启服务: docker-compose -f docker-compose.local.yml restart"
echo ""
echo "💡 使用提示:"
echo "  1. 在浏览器中打开 http://localhost:8080"
echo "  2. 输入有效的 Tripo AI Token"
echo "  3. 开始生成 3D 模型！"