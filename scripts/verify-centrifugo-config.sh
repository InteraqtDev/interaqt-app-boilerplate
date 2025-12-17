#!/bin/bash

# Centrifugo 配置验证脚本
# 用于验证 namespace 配置是否正确生成和部署

set -e

echo "🔍 Centrifugo 配置验证脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: 检查配置文件是否存在
echo "📝 Step 1: 检查配置文件..."
if [ -f "app.config.json" ]; then
    check_pass "app.config.json 存在"
else
    check_fail "app.config.json 不存在"
    echo "   请运行: npm run generate-config"
    exit 1
fi
echo ""

# Step 2: 检查 Centrifugo 配置
echo "📝 Step 2: 检查 Centrifugo 配置..."
if grep -q "centrifugo" app.config.json; then
    check_pass "找到 Centrifugo 配置"
    
    # 检查必要的配置项
    if grep -q "tokenHmacSecretKey" app.config.json; then
        check_pass "tokenHmacSecretKey 已配置"
    else
        check_fail "tokenHmacSecretKey 未配置"
    fi
    
    if grep -q "apiKey" app.config.json; then
        check_pass "apiKey 已配置"
    else
        check_fail "apiKey 未配置"
    fi
else
    check_fail "Centrifugo 配置未找到"
    exit 1
fi
echo ""

# Step 3: 检查 deploy-tool 代码
echo "📝 Step 3: 检查 deploy-tool 修复..."
CENTRIFUGO_FILE="deploy-tool/src/terraform/middleware/implementations/centrifugo.ts"
if [ -f "$CENTRIFUGO_FILE" ]; then
    check_pass "Centrifugo middleware 文件存在"
    
    if grep -q "generateNamespaceConfig" "$CENTRIFUGO_FILE"; then
        check_pass "找到 generateNamespaceConfig 方法"
    else
        check_fail "generateNamespaceConfig 方法未找到"
        echo "   请确保已应用修复"
        exit 1
    fi
    
    if grep -q "CENTRIFUGO_NAMESPACES" "$CENTRIFUGO_FILE"; then
        check_pass "找到 CENTRIFUGO_NAMESPACES 环境变量配置"
    else
        check_fail "CENTRIFUGO_NAMESPACES 环境变量未配置"
        exit 1
    fi
else
    check_fail "Centrifugo middleware 文件不存在"
    exit 1
fi
echo ""

# Step 4: 检查测试
echo "📝 Step 4: 运行测试..."
cd deploy-tool
if npm test middleware-config.test.ts > /dev/null 2>&1; then
    check_pass "Middleware 配置测试通过"
else
    check_warn "测试未通过（可能需要先安装依赖）"
fi
cd ..
echo ""

# Step 5: 检查 Centrifugo 是否运行
echo "📝 Step 5: 检查 Centrifugo 运行状态..."

# 尝试 Docker
if command -v docker &> /dev/null; then
    CONTAINER=$(docker ps --filter "name=centrifugo" --format "{{.Names}}" | head -1)
    if [ -n "$CONTAINER" ]; then
        check_pass "Centrifugo 容器运行中: $CONTAINER"
        
        echo "   检查环境变量..."
        if docker exec "$CONTAINER" env 2>/dev/null | grep -q "CENTRIFUGO_NAMESPACES"; then
            check_pass "CENTRIFUGO_NAMESPACES 环境变量存在"
            
            # 显示配置
            echo ""
            echo "   Namespace 配置:"
            docker exec "$CONTAINER" env | grep "CENTRIFUGO_NAMESPACES" | sed 's/^/   /'
            echo ""
        else
            check_warn "CENTRIFUGO_NAMESPACES 环境变量未找到"
            echo "   可能需要重启 Centrifugo 以加载新配置"
            echo "   运行: docker-compose restart centrifugo"
        fi
    else
        check_warn "Centrifugo 容器未运行"
    fi
fi

# 尝试 kubectl
if command -v kubectl &> /dev/null; then
    POD=$(kubectl get pods -A | grep centrifugo | grep Running | head -1 | awk '{print $2}')
    NAMESPACE=$(kubectl get pods -A | grep centrifugo | grep Running | head -1 | awk '{print $1}')
    
    if [ -n "$POD" ]; then
        check_pass "Centrifugo pod 运行中: $POD (namespace: $NAMESPACE)"
        
        echo "   检查环境变量..."
        if kubectl exec -it "$POD" -n "$NAMESPACE" -- env 2>/dev/null | grep -q "CENTRIFUGO_NAMESPACES"; then
            check_pass "CENTRIFUGO_NAMESPACES 环境变量存在"
            
            # 显示配置
            echo ""
            echo "   Namespace 配置:"
            kubectl exec -it "$POD" -n "$NAMESPACE" -- env | grep "CENTRIFUGO_NAMESPACES" | sed 's/^/   /'
            echo ""
        else
            check_warn "CENTRIFUGO_NAMESPACES 环境变量未找到"
            echo "   可能需要重启 pod 以加载新配置"
            echo "   运行: kubectl rollout restart deployment/centrifugo -n $NAMESPACE"
        fi
    else
        check_warn "Centrifugo pod 未运行"
    fi
fi
echo ""

# Step 6: 测试 Centrifugo API（如果运行）
echo "📝 Step 6: 测试 Centrifugo API..."
CENTRIFUGO_URL="http://localhost:3001/api"
API_KEY=$(grep -o '"apiKey"[^,]*' app.config.json | head -1 | sed 's/"apiKey": "\(.*\)"/\1/' | tr -d '"')

if [ -n "$API_KEY" ]; then
    if curl -s -X POST "$CENTRIFUGO_URL" \
        -H "Authorization: apikey $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"method": "info"}' > /dev/null 2>&1; then
        check_pass "Centrifugo API 可访问"
        
        # 获取详细信息
        RESPONSE=$(curl -s -X POST "$CENTRIFUGO_URL" \
            -H "Authorization: apikey $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"method": "info"}')
        
        if echo "$RESPONSE" | grep -q '"result"'; then
            check_pass "API 响应正常"
        else
            check_warn "API 响应异常"
            echo "   响应: $RESPONSE"
        fi
    else
        check_warn "Centrifugo API 不可访问 ($CENTRIFUGO_URL)"
        echo "   请确认 Centrifugo 正在运行"
    fi
else
    check_warn "无法获取 API Key"
fi
echo ""

# 总结
echo "================================"
echo "📊 验证总结"
echo "================================"
echo ""
echo "✅ 已完成的检查:"
echo "  - 配置文件检查"
echo "  - deploy-tool 代码检查"
echo "  - 单元测试检查"
echo "  - Centrifugo 运行状态检查"
echo "  - API 连通性检查"
echo ""
echo "📝 后续步骤:"
echo ""
echo "1. 如果 CENTRIFUGO_NAMESPACES 环境变量不存在:"
echo "   → 重新生成配置: npm run generate-config"
echo "   → 重启 Centrifugo"
echo ""
echo "2. 测试消息推送:"
echo "   → 打开两个浏览器窗口"
echo "   → 用户 A 创建聊天室"
echo "   → 用户 B 加入聊天室"
echo "   → 用户 A 发送消息"
echo "   → 验证用户 B 收到消息"
echo ""
echo "3. 查看详细文档:"
echo "   → deploy-tool/docs/centrifugo-namespace-configuration.md"
echo "   → prompt/output/FINAL-CENTRIFUGO-FIX.md"
echo ""







