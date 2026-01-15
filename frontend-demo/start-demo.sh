#!/bin/bash

# 启动 Vue 3 前端示例

echo "🚀 启动 AI 3D 模型生成器前端示例..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 frontend-demo 目录中运行此脚本"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "✅ 依赖安装完成！"
echo ""
echo "🌐 启动开发服务器..."
echo "📍 前端地址: http://localhost:5173"
echo "📍 后端地址: http://localhost:3000 (需要先启动后端服务)"
echo ""
echo "💡 使用提示:"
echo "  1. 确保后端服务已启动 (npm run dev 或 docker-compose up)"
echo "  2. 在界面中输入有效的 Tripo AI Token"
echo "  3. 输入文字描述或上传图片生成 3D 模型"
echo ""

# 启动开发服务器
npm run dev