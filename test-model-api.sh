#!/bin/bash

# 简化的模型生成 API 测试脚本 - GLB 格式

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "测试模型生成 API (GLB 格式)"
echo "=========================================="
echo ""

# 测试 1: 文本生成模型 (不带 options)
echo "测试 1: 文本生成模型（默认格式）"
echo "----------------------------------------"
curl -X POST "$BASE_URL/api/v1/models" \
  -F "type=text" \
  -F "input=a cute robot toy" \
  -F "token=tsk_RqPvdTYxQqPvdTYxQqPvdTYxQqPvdTYx" \
  | jq '.'

echo -e "\n"

# 测试 2: 查看当前所有作业
echo "测试 2: 查看所有作业状态"
echo "----------------------------------------"
JOBS_RESPONSE=$(curl -s "$BASE_URL/api/v1/models/debug/jobs")
echo "$JOBS_RESPONSE" | jq '.'

# 获取最新的作业ID
LATEST_JOB_ID=$(echo "$JOBS_RESPONSE" | jq -r '.jobs[0].jobId // empty')

if [ -n "$LATEST_JOB_ID" ]; then
    echo -e "\n"
    echo "测试 3: 查询作业状态"
    echo "----------------------------------------"
    echo "作业ID: $LATEST_JOB_ID"
    curl -s "$BASE_URL/api/v1/models/$LATEST_JOB_ID/status" | jq '.'
    
    echo -e "\n"
    echo "测试 4: 获取作业结果"
    echo "----------------------------------------"
    RESULT=$(curl -s "$BASE_URL/api/v1/models/$LATEST_JOB_ID/result")
    echo "$RESULT" | jq '.'
    
    # 提取模型下载链接
    MODEL_URL=$(echo "$RESULT" | jq -r '.data.result.modelUrl // empty')
    if [ -n "$MODEL_URL" ]; then
        echo -e "\n模型下载链接:"
        echo "$MODEL_URL"
    fi
fi

echo -e "\n=========================================="
echo "测试完成"
echo "=========================================="
