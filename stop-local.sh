#!/bin/bash

# 停止本地开发环境脚本

set -e

echo "🛑 停止本地开发环境..."

# 停止服务
docker-compose -f docker-compose.dev.yml down

echo ""
echo "✅ 服务已停止"
echo ""
echo "💡 提示："
echo "   - 重新启动: ./start-local.sh"
echo "   - 清理数据: docker-compose -f docker-compose.dev.yml down -v"
