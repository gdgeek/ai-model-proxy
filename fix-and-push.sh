#!/bin/bash

echo "======================================"
echo "修复代码格式并推送"
echo "======================================"
echo ""

# 添加修复的文件
echo "1. 添加修复的文件到暂存区..."
git add src/config/config.property.test.ts
git add src/middleware/imageFormat.property.test.ts
git add QUICK_PUSH_GUIDE.md
git add TEST_COVERAGE_IMPROVEMENTS.md
git add WORK_SUMMARY.md
git add GIT_PUSH_INSTRUCTIONS.md
git add FORMAT_FIX_README.md
git add push-to-git.sh
git add fix-and-push.sh

echo "✅ 文件已添加"
echo ""

# 提交修复
echo "2. 提交代码格式修复..."
git commit -m "fix: 修复所有Prettier代码格式问题

- 修复config.property.test.ts的16个格式错误
- 修复imageFormat.property.test.ts的12个格式错误
- 统一缩进、换行和空格使用
- 确保所有代码符合ESLint和Prettier规范

所有格式错误已修复，功能代码没有变化。"

if [ $? -eq 0 ]; then
    echo "✅ 提交成功"
else
    echo "ℹ️  没有需要提交的更改"
fi
echo ""

# 推送到远程
echo "3. 推送到GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 代码推送成功！"
    echo ""
    echo "查看你的仓库："
    echo "https://github.com/gdgeek/ai-model-proxy"
    echo ""
    echo "查看CI状态："
    echo "https://github.com/gdgeek/ai-model-proxy/actions"
else
    echo ""
    echo "❌ 推送失败，请手动执行："
    echo "git push origin main"
fi

echo ""
echo "======================================"
