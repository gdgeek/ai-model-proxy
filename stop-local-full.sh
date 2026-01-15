#!/bin/bash

# 停止完整的本地开发环境

echo "🛑 停止 AI 3D 模型生成器本地环境..."

# 停止服务
docker-compose -f docker-compose.local.yml down

# 可选：清理数据卷（取消注释下面的行来清理数据）
# docker-compose -f docker-compose.local.yml down -v

echo "✅ 服务已停止！"
echo ""
echo "💡 如果需要清理所有数据，请运行:"
echo "  docker-compose -f docker-compose.local.yml down -v"