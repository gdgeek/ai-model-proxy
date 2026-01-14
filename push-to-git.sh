#!/bin/bash

# 推送代码到GitHub的脚本

echo "======================================"
echo "推送代码到GitHub"
echo "======================================"
echo ""

# 检查Git状态
echo "1. 检查Git状态..."
git status
echo ""

# 显示最近的提交
echo "2. 显示最近的提交..."
git log --oneline -3
echo ""

# 推送到远程仓库
echo "3. 推送到远程仓库..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 代码推送成功！"
    echo ""
    echo "查看你的仓库："
    echo "https://github.com/gdgeek/ai-model-proxy"
else
    echo ""
    echo "❌ 代码推送失败"
    echo ""
    echo "可能的原因："
    echo "1. 需要GitHub认证（请配置SSH密钥或Personal Access Token）"
    echo "2. 网络连接问题"
    echo "3. 没有推送权限"
    echo ""
    echo "解决方案："
    echo "1. 配置SSH密钥: https://docs.github.com/en/authentication/connecting-to-github-with-ssh"
    echo "2. 或使用Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
fi

echo ""
echo "======================================"
