# google nana banana 2 image generation api

我们是通过自建的 litellm 来调用的 nano banana 接口。
- api 地址：`https://llm.jp.one2x.ai`
- nano banana2 模型名称：`vertex_ai/gemini-3-pro-image-preview`

python 调用代码示例：
```python
import openai
import base64
# 初始化客户端
client = openai.OpenAI(
    api_key=API_KEY, # 使用自己的 apiKey
    base_url=API_URL
)
# 调用 API 生成图片
response = client.chat.completions.create(
    model="vertex_ai/gemini-3-pro-image-preview",
    messages=[
        {"role": "user", "content": "a cat"}
    ]
)
# 提取并保存图片
for choice in response.choices:
    images = choice.message.model_extra.get('images', [])
    for i, img in enumerate(images):
        # 获取 base64 数据
        image_url = img['image_url']
        if isinstance(image_url, dict):
            image_url = image_url['url']
        # 解码并保存
        base64_data = image_url.split(',', 1)[1]
        image_data = base64.b64decode(base64_data)
        filename = f"cat_{i}.png"
        with open(filename, 'wb') as f:
            f.write(image_data)
        print(f"✓ 已保存: {filename}")
```