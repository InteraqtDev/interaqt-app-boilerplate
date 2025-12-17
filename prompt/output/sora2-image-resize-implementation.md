# Sora2 图片自动伸缩和黑边处理实现

## 概述

为了满足 OpenAI Sora2 API 对输入图片尺寸的严格要求，我们在 `volcfangzhou-video` 集成中实现了自动图片伸缩和黑边处理功能。当输入图片的尺寸与视频目标尺寸不匹配时，系统会自动调整图片并添加黑边（letterbox/pillarbox），确保符合 API 要求。

## 实现的功能

### 1. 图片处理功能

在 `integrations/volcfangzhou-video/volcApi.ts` 中新增：

- **`parseSize(size: string)`**: 解析尺寸字符串（如 "1280x720"）为宽度和高度数值
- **`fetchAndResizeImageToFit(imageUrl: string, targetSize: string)`**: 核心图片处理函数
  - 从 URL 获取图片
  - 检测原始图片尺寸
  - 如果尺寸不匹配，自动调整：
    - 保持宽高比缩放图片
    - 添加黑边填充到目标尺寸
  - 返回处理后的 base64 编码图片

### 2. 处理逻辑

图片处理遵循以下步骤：

1. **获取原始图片**：从 URL 下载图片
2. **检测尺寸**：使用 sharp 库获取图片元数据
3. **计算缩放**：
   - 计算宽度和高度的缩放比例
   - 选择较小的缩放比例以确保图片完全适配
4. **缩放图片**：按计算的比例缩放图片，保持宽高比
5. **添加黑边**：
   - 如果缩放后的宽度小于目标宽度，添加左右黑边（pillarbox）
   - 如果缩放后的高度小于目标高度，添加上下黑边（letterbox）
6. **输出验证**：确保最终输出尺寸精确匹配目标尺寸

### 3. 集成到 API 调用流程

在 `integrations/volcfangzhou-video/index.ts` 中：

- 将原来的 `fetchImageAsBase64` 替换为 `fetchAndResizeImageToFit`
- 自动传入目标视频尺寸（`requestParams.size`）
- 处理后的图片符合 Sora2 API 要求，直接提交

## 技术细节

### 依赖库

- **sharp**: 高性能 Node.js 图片处理库
  - 版本：`^0.33.0`
  - 添加位置：根目录 `package.json` 的 `dependencies`

### 处理示例

假设输入图片为 1024x768，目标尺寸为 1280x720：

1. 原始尺寸：1024x768 (4:3)
2. 目标尺寸：1280x720 (16:9)
3. 计算缩放比例：
   - 宽度比例：1280/1024 = 1.25
   - 高度比例：720/768 = 0.9375
   - 选择：0.9375（较小值）
4. 缩放后尺寸：960x720
5. 添加黑边：
   - 左边：160px
   - 右边：160px
6. 最终输出：1280x720 ✅

## 代码修改列表

### 1. 修复 Workspace 命名冲突

为了解决 npm workspace 命名冲突问题，修改了以下文件：

- `integrations/example_volcfangzhou-video/package.json`: 
  - 名称改为 `@interaqt-integrations/example-volcfangzhou-video`
  
- `integrations/example_volcfangzhou_image/package.json`: 
  - 名称改为 `@interaqt-integrations/example-volcfangzhou-image`
  
- `integrations/nanobanana2-image/package.json`: 
  - 名称改为 `@interaqt-integrations/nanobanana2-image`

### 2. 添加 Sharp 依赖

- `package.json`: 在根目录添加 `sharp: ^0.33.0` 依赖
- `integrations/volcfangzhou-video/package.json`: 添加 `sharp: ^0.33.0` 依赖

### 3. 实现图片处理功能

**文件**: `integrations/volcfangzhou-video/volcApi.ts`

- 导入 sharp 库
- 新增 `parseSize()` 函数
- 新增 `fetchAndResizeImageToFit()` 函数（150+ 行实现）
- 完整的错误处理和日志记录

### 4. 集成到 API 调用流程

**文件**: `integrations/volcfangzhou-video/index.ts`

- 更新导入：将 `fetchImageAsBase64` 改为 `fetchAndResizeImageToFit`
- 更新调用：传入目标尺寸参数
- 更新日志：记录图片处理信息

## 测试建议

### 单元测试场景

1. **完全匹配**：输入图片尺寸已经符合目标尺寸
2. **需要 Letterbox**：输入图片更宽，需要上下黑边
3. **需要 Pillarbox**：输入图片更高，需要左右黑边
4. **大幅缩放**：输入图片远大于目标尺寸
5. **放大场景**：输入图片小于目标尺寸

### 集成测试

1. 使用不同尺寸的图片调用视频生成 API
2. 验证提交到 Sora2 的图片尺寸正确
3. 检查生成的视频质量

## 优势

1. **自动化处理**：无需手动调整图片尺寸
2. **保持质量**：使用高质量 JPEG 编码（quality: 95）
3. **透明操作**：详细的日志记录，便于调试
4. **性能优化**：使用 sharp 库，处理速度快
5. **错误处理**：完善的异常处理和验证机制

## 注意事项

1. **内存使用**：处理大图片时可能消耗较多内存
2. **处理时间**：图片处理会增加 API 调用时间（通常几百毫秒）
3. **图片质量**：添加黑边可能影响视觉效果，但保证了 API 兼容性
4. **支持格式**：sharp 支持常见图片格式（JPEG, PNG, WebP 等）

## 后续优化建议

1. **缓存机制**：对于相同的图片和尺寸，缓存处理结果
2. **异步处理**：如果图片处理耗时较长，考虑异步队列
3. **智能裁剪**：提供选项支持智能裁剪而非黑边
4. **质量参数**：允许配置 JPEG 质量参数
5. **格式选择**：支持输出不同格式（PNG, WebP）

## 参考资源

- [Sharp 文档](https://sharp.pixelplumbing.com/)
- [OpenAI Sora2 API 文档](https://platform.openai.com/docs/api-reference/videos)
- [Letterboxing 概念](https://en.wikipedia.org/wiki/Letterboxing_(filming))

