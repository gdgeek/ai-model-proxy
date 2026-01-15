#!/bin/bash

# 完整的 API 测试脚本 - 包含 GLB 格式模型生成
BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="API_TEST_REPORT_GLB_${TIMESTAMP}.md"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================" | tee $REPORT_FILE
echo "API 接口完整测试报告 (GLB 格式)" | tee -a $REPORT_FILE
echo "测试时间: $(date)" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${YELLOW}测试 #${TOTAL_TESTS}: ${test_name}${NC}" | tee -a $REPORT_FILE
    echo "方法: $method" | tee -a $REPORT_FILE
    echo "端点: $endpoint" | tee -a $REPORT_FILE
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" $data)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "HTTP 状态码: $http_code" | tee -a $REPORT_FILE
    echo "响应内容:" | tee -a $REPORT_FILE
    echo "$body" | jq '.' 2>/dev/null || echo "$body" | tee -a $REPORT_FILE
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 测试通过${NC}" | tee -a $REPORT_FILE
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ 测试失败 (期望: $expected_status, 实际: $http_code)${NC}" | tee -a $REPORT_FILE
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo -e "\n${BLUE}=== 第一部分：健康检查接口测试 ===${NC}\n" | tee -a $REPORT_FILE

# 1. 基本健康检查
test_api "基本健康检查" "GET" "/health" "" "200"

# 2. 就绪检查
test_api "就绪检查" "GET" "/api/v1/health/ready" "" "200"

# 3. 详细健康检查
test_api "详细健康检查" "GET" "/api/v1/health/detailed" "" "200"

# 4. 系统信息
test_api "系统信息" "GET" "/api/v1/health/info" "" "200"

# 5. 存活检查
test_api "存活检查" "GET" "/api/v1/health/live" "" "200"

# 6. 启动检查
test_api "启动检查" "GET" "/api/v1/health/startup" "" "200"

echo -e "\n${BLUE}=== 第二部分：模型生成接口测试 (GLB 格式) ===${NC}\n" | tee -a $REPORT_FILE

# 7. 创建文本生成任务（GLB 格式）
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${YELLOW}测试 #${TOTAL_TESTS}: 创建文本生成任务 (GLB 格式)${NC}" | tee -a $REPORT_FILE
echo "方法: POST" | tee -a $REPORT_FILE
echo "端点: /api/v1/models" | tee -a $REPORT_FILE
echo "格式: GLB" | tee -a $REPORT_FILE

TEXT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
  -F "type=text" \
  -F "input=a cute robot toy sitting on a table" \
  -F "token=tsk_RqPvdTYxQqPvdTYxQqPvdTYxQqPvdTYx" \
  -F 'options={"format":"glb","quality":"medium"}')

echo "响应内容:" | tee -a $REPORT_FILE
echo "$TEXT_RESPONSE" | jq '.' | tee -a $REPORT_FILE

JOB_ID=$(echo "$TEXT_RESPONSE" | jq -r '.jobId // empty')

if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
    echo -e "${GREEN}✓ 测试通过 - 作业ID: $JOB_ID${NC}" | tee -a $REPORT_FILE
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # 8. 查询任务状态
    sleep 2
    test_api "查询任务状态" "GET" "/api/v1/models/$JOB_ID/status" "" "200"
    
    # 9. 等待任务完成
    echo -e "\n${YELLOW}等待模型生成完成（最多等待90秒）...${NC}" | tee -a $REPORT_FILE
    COMPLETED=false
    for i in {1..18}; do
        sleep 5
        STATUS_RESPONSE=$(curl -s "$BASE_URL/api/v1/models/$JOB_ID/status")
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // empty')
        
        # 尝试从不同的位置获取进度
        PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.data.progress // .progress // 0')
        
        echo "[$i/18] 状态: $STATUS - 进度: $PROGRESS%" | tee -a $REPORT_FILE
        
        if [ "$STATUS" = "completed" ]; then
            echo -e "${GREEN}✓ 模型生成完成${NC}" | tee -a $REPORT_FILE
            COMPLETED=true
            
            # 10. 获取模型结果
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            echo -e "\n${YELLOW}测试 #${TOTAL_TESTS}: 获取模型结果${NC}" | tee -a $REPORT_FILE
            RESULT_RESPONSE=$(curl -s "$BASE_URL/api/v1/models/$JOB_ID/result")
            echo "$RESULT_RESPONSE" | jq '.' | tee -a $REPORT_FILE
            
            # 提取模型下载链接
            MODEL_URL=$(echo "$RESULT_RESPONSE" | jq -r '.result.modelUrl // .data.result.modelUrl // empty')
            
            if [ -n "$MODEL_URL" ] && [ "$MODEL_URL" != "null" ]; then
                echo -e "\n${GREEN}✓ 测试通过${NC}" | tee -a $REPORT_FILE
                echo -e "\n${GREEN}模型下载链接 (GLB格式):${NC}" | tee -a $REPORT_FILE
                echo "$MODEL_URL" | tee -a $REPORT_FILE
                PASSED_TESTS=$((PASSED_TESTS + 1))
                
                # 检查文件扩展名
                if [[ "$MODEL_URL" == *.glb* ]]; then
                    echo -e "${GREEN}✓ 确认文件格式为 GLB${NC}" | tee -a $REPORT_FILE
                else
                    echo -e "${YELLOW}⚠ 警告: URL 中未包含 .glb 扩展名${NC}" | tee -a $REPORT_FILE
                fi
            else
                echo -e "${RED}✗ 测试失败 - 未获取到模型URL${NC}" | tee -a $REPORT_FILE
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
            break
        elif [ "$STATUS" = "failed" ]; then
            echo -e "${RED}✗ 模型生成失败${NC}" | tee -a $REPORT_FILE
            ERROR=$(echo "$STATUS_RESPONSE" | jq -r '.error.message // .data.error.message // "未知错误"')
            echo "错误信息: $ERROR" | tee -a $REPORT_FILE
            FAILED_TESTS=$((FAILED_TESTS + 1))
            break
        fi
    done
    
    if [ "$COMPLETED" = false ]; then
        echo -e "${YELLOW}⚠ 模型生成超时（90秒内未完成）${NC}" | tee -a $REPORT_FILE
        echo "最终状态: $STATUS" | tee -a $REPORT_FILE
    fi
else
    echo -e "${RED}✗ 测试失败 - 未获取到作业ID${NC}" | tee -a $REPORT_FILE
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "\n${BLUE}=== 第三部分：其他接口测试 ===${NC}\n" | tee -a $REPORT_FILE

# 11. 获取所有作业状态（调试接口）
test_api "获取所有作业状态" "GET" "/api/v1/models/debug/jobs" "" "200"

# 12. 测试无效的作业ID
test_api "查询不存在的作业" "GET" "/api/v1/models/invalid-job-id/status" "" "400"

# 13. 测试缺少必需参数
test_api "缺少必需参数" "POST" "/api/v1/models" "-F 'type=text'" "400"

# 14. 测试不支持的格式
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${YELLOW}测试 #${TOTAL_TESTS}: 测试不支持的格式${NC}" | tee -a $REPORT_FILE
INVALID_FORMAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
  -F "type=text" \
  -F "input=test" \
  -F "token=tsk_test" \
  -F 'options={"format":"stl"}')

echo "$INVALID_FORMAT_RESPONSE" | jq '.' | tee -a $REPORT_FILE

if echo "$INVALID_FORMAT_RESPONSE" | grep -q "VALIDATION_ERROR"; then
    echo -e "${GREEN}✓ 测试通过 - 正确拒绝了不支持的格式${NC}" | tee -a $REPORT_FILE
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ 测试失败 - 应该拒绝不支持的格式${NC}" | tee -a $REPORT_FILE
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "\n========================================" | tee -a $REPORT_FILE
echo -e "${BLUE}测试总结${NC}" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "总测试数: $TOTAL_TESTS" | tee -a $REPORT_FILE
echo -e "${GREEN}通过: $PASSED_TESTS${NC}" | tee -a $REPORT_FILE
echo -e "${RED}失败: $FAILED_TESTS${NC}" | tee -a $REPORT_FILE

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; ($PASSED_TESTS/$TOTAL_TESTS)*100" | bc)
    echo "成功率: ${SUCCESS_RATE}%" | tee -a $REPORT_FILE
fi

echo "========================================" | tee -a $REPORT_FILE

echo -e "\n完整测试报告已保存到: $REPORT_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi
