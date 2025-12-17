#!/bin/bash

# Docker 镜像构建和推送脚本
# 使用方法：./BUILD_IMAGE.sh

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Docker 镜像构建和推送脚本${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# 检查必需的环境变量
if [ -z "$IMAGE_REGISTRY" ]; then
    echo -e "${YELLOW}IMAGE_REGISTRY 未设置，使用默认值：cr-cn-beijing.volces.com${NC}"
    export IMAGE_REGISTRY="cr-cn-beijing.volces.com"
fi

if [ -z "$IMAGE_NAMESPACE" ]; then
    echo -e "${RED}错误：IMAGE_NAMESPACE 未设置${NC}"
    echo "请设置你的镜像命名空间："
    echo "  export IMAGE_NAMESPACE='your-namespace'"
    exit 1
fi

if [ -z "$IMAGE_NAME" ]; then
    echo -e "${YELLOW}IMAGE_NAME 未设置，使用默认值：lit${NC}"
    export IMAGE_NAME="lit"
fi

if [ -z "$IMAGE_TAG" ]; then
    echo -e "${YELLOW}IMAGE_TAG 未设置，使用默认值：v1.0.0${NC}"
    export IMAGE_TAG="v1.0.0"
fi

# 显示配置
echo -e "${GREEN}当前配置：${NC}"
echo "  镜像仓库: ${IMAGE_REGISTRY}"
echo "  命名空间: ${IMAGE_NAMESPACE}"
echo "  镜像名称: ${IMAGE_NAME}"
echo "  镜像标签: ${IMAGE_TAG}"
echo ""
echo "  完整镜像地址: ${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误：Docker 未运行或无法访问${NC}"
    echo "请启动 Docker Desktop 或检查 Docker 服务"
    exit 1
fi

# 检查是否已登录
echo -e "${BLUE}步骤 1/4: 检查 Docker 登录状态${NC}"
if ! docker info 2>&1 | grep -q "Username"; then
    echo -e "${YELLOW}未检测到登录信息，尝试登录...${NC}"
    docker login ${IMAGE_REGISTRY}
    if [ $? -ne 0 ]; then
        echo -e "${RED}登录失败！${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Docker 已登录${NC}"
echo ""

# 构建镜像
echo -e "${BLUE}步骤 2/4: 构建 Docker 镜像${NC}"
echo "这可能需要几分钟时间..."

# 平台设置：不指定则使用本机架构，指定 BUILD_PLATFORM=linux/amd64 用于云端部署
if [ -n "$BUILD_PLATFORM" ]; then
    echo "目标平台: ${BUILD_PLATFORM}"
    PLATFORM_FLAG="--platform ${BUILD_PLATFORM}"
else
    echo "目标平台: 本机架构 (未指定 BUILD_PLATFORM)"
    PLATFORM_FLAG=""
fi
echo ""

docker build \
    ${PLATFORM_FLAG} \
    -t ${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} \
    -t ${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}:latest \
    --progress=plain \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像构建失败！${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ 镜像构建成功${NC}"
echo ""

# 显示镜像信息
echo -e "${BLUE}镜像信息：${NC}"
docker images | grep "${IMAGE_NAMESPACE}/${IMAGE_NAME}" | head -2
echo ""

# 推送镜像
echo -e "${BLUE}步骤 3/4: 推送镜像到仓库${NC}"
echo "推送 ${IMAGE_TAG} 标签..."
docker push ${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像推送失败！${NC}"
    exit 1
fi

echo ""
echo "推送 latest 标签..."
docker push ${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像推送失败！${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ 镜像推送成功${NC}"
echo ""

# 设置部署环境变量
echo -e "${BLUE}步骤 4/4: 设置部署环境变量${NC}"
echo ""
echo "请将以下环境变量添加到你的 deploy.env 文件中："
echo ""
echo -e "${YELLOW}export APP_IMAGE=\"${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}\"${NC}"
echo -e "${YELLOW}export APP_IMAGE_TAG=\"${IMAGE_TAG}\"${NC}"
echo ""

# 完成
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  镜像构建和推送完成！${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}下一步：${NC}"
echo "1. 在火山引擎控制台验证镜像已上传"
echo "2. 使用 Terraform 部署基础设施和应用"
echo ""
