# sora2 生视频服务

python 例子代码：
```python
from openai import AsyncOpenAI

from app.config.settings import settings


class OpenAIClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=OPENAI_API_KEY, # api key
            organization=OPENAI_ORGANIZATION, # orgnization
            project=OPENAI_PROJECT_ID, # project id
        )
        self.video_model = "sora-2"
        self.video_poll_interval_ms = 5000

    async def generate_video(
        self, prompt: str, image_data: bytes, filename: str
    ) -> bytes:
        video_params = {
            "prompt": prompt,
            "model": self.video_model,
            "seconds": "4",
            "size": "1280x720",
            "poll_interval_ms": self.video_poll_interval_ms,
            "input_reference": (filename, image_data),
        }
        video = await self.client.videos.create_and_poll(**video_params)
        if video.status == "failed":
            error_msg = video.error.message if video.error else "Unknown error"
            error_code = video.error.code if video.error else None
            raise ValueError(
                f"OpenAI video {self.video_model} failed: {error_msg} (code: {error_code}), video_id: {video.id}"
            )
        video_result = await self.client.videos.download_content(video.id)
        return video_result.content
```