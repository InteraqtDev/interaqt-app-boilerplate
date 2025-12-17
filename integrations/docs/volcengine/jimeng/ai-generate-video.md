Title: 即梦AI-视频生成3.0 Pro-接口文档--即梦AI-火山引擎

URL Source: https://www.volcengine.com/docs/85621/1777001

Markdown Content:
接口简介​

即梦视频3.0Pro —— 即梦同源的文生视频与图生视频能力，在视频生成效果上实现飞跃，各维度均表现优异。该版本具备 多镜头叙事能力，能更 精准遵循指令，动态表现流畅自然，支持生成 1080P高清 且具专业级质感的视频，还可实现更丰富多元的风格化表达。​

即梦视频3.0Pro支持功能含：​

*   文生视频：输入文本提示词，生成视频；​

*   图生视频-首帧：输入首帧图片和对应的文本提示词，生成视频。​

​

接入说明​

请求说明​

​

名称​内容​
接口地址​[https://visual.volcengineapi.com](https://visual.volcengineapi.com/)​
请求方式​POST​
Content-Type​application/json​

​

提交任务​

提交任务请求参数​

Query参数​

​

参数​类型​可选/必选​说明​
Action​string​必选​接口名，取值：CVSync2AsyncSubmitTask​
Version​string​必选​版本号，取值：2022-08-31​

​

Header参数​

注意​

本服务固定值：Region为cn-north-1，Service为cv​

主要用于鉴权，详见 [公共参数](https://www.volcengine.com/docs/6369/67268) - 签名参数 - 在Header中的场景部分​

Body参数​

注意​

业务请求参数，放到request.body中，MIME-Type为 application/json​

​

参数​类型​可选/必选​说明​
req_key​string​必选​服务标识​

取固定值: jimeng_ti2v_v30_pro​
prompt​string​可选​

*   文生视频场景必选​用于生成视频的提示词 ，中英文均可输入。建议在400字以内，不超过800字，prompt过长有概率出现效果异常或不生效​
binary_data_base64​array of string​可选​

*   图生视频场景图片和prompt二选一必选​

*   传图时binary_data_base64和image_urls参数二选一​图片文件base64编码，仅支持输入1张图片（图生视频仅支持传入首帧），仅支持JPEG、PNG格式；​

注意：​

*   图片文件大小：最大 4.7MB​

*   图片分辨率：最大 4096 * 4096，最短边不低于320；​

*   图片长边与短边比例在3以内；​
image_urls​​​图片文件URL，仅支持输入1张图片（图生视频仅支持传入首帧）​

注意：​

*   图片长边与短边比例在3以内；​

frames​int​可选​生成的总帧数（帧数 = 24 * n + 1，其中n为秒数，支持5s、10s）​

可选取值：[121, 241]​

默认值：121​
aspect_ratio​string​可选​生成视频的长宽比，只在文生视频场景下生效，图生视频场景会根据输入图的长宽比从可选取值中选择最接近的比例生成；​

可选取值：["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]​

默认值："16:9"​

​

生成视频长宽与比例的对应关系如下：​

*   2176 * 928（21:9）​

*   1920 * 1088（16:9）​

*   1664 * 1248（4:3）​

*   1440 * 1440 （1:1）​

*   1248 * 1664（3:4）​

*   1088 * 1920（9:16）​

​

图片裁剪规则​

​

图生视频场景，当传入的图片与可选的取值["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]的宽高比不一致时，系统会对图片进行裁剪，裁剪时会居中裁剪，详细规则如下：​

说明​

如果希望呈现较好的视频效果，建议上传图片宽高比与可选的宽高比取值["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]尽可能接近。​

1.   输入参数：​

*   输入图片宽度记为 W，高度记为 H。​

*   假设输入图片最接近的目标比例记为 A:B（例如：16:9），则裁剪后的宽度与高度之比应为 A:B。​

1.   比较宽高比：​

*   计算输入图片的宽高比 Ratio_原始=W/H。​

*   计算目标比例的比值 Ratio_目标=A/B。​

*   根据比较结果，决策裁剪基准：​

*   如果 Ratio_原始 < Ratio_目标(即传入图片“太高”或“竖高”)，则以宽度为基准裁剪。​

*   如果 Ratio_原始 > Ratio_目标(即传入图片“太宽”或“横宽”)，则以高度为基准裁剪。​

*   如果相等，则无需裁剪，直接使用全图。​

1.   裁剪尺寸计算：​

*   以宽度为基准（适用于传入图片“太高”或“竖高”场景）：​

*   裁剪宽度 Crop_W=W（使用输入图片原始宽度）。​

*   裁剪高度 Crop_H=W*(B/A)（根据目标比例等比例计算高度）。​

*   裁剪区域的起始坐标（居中定位）：​

*   X坐标（水平）：总是0（因为宽度全用，从左侧开始）。​

*   Y坐标（垂直）：(H-Crop_H)/2（确保垂直居中，从顶部开始）。​

*   以高度为基准（适用于传入图片“太宽”或“横宽”）：​

*   裁剪高度 Crop_H=H（使用整个原始高度）。​

*   裁剪宽度 Crop_W=H*(A/B)（根据目标比例等比例计算宽度）。​

*   裁剪区域的起始坐标（居中定位）：​

*   X坐标（水平）：(W-Crop_W)/2（确保水平居中，从左侧开始）。​

*   Y坐标（垂直）：总是0（因为高度全用，从顶部开始）。​

1.   裁剪结果：​

*   最终裁剪出的图片尺寸为 Crop_W*Crop_H，比例严格等于 A:B，且完全位于原始图片内部，无黑边。​

*   裁剪区域总是以原始图片中心为基准，因此内容居中。​

1.   裁剪示例：​

​

输入图片​生成的视频结果​
*   输入图片宽高：3380*1072​

*   与输入图片接近的宽高比：21:9​

​![Image 1](https://portal.volccdn.com/obj/volcfe/cloud-universal-doc/upload_b04ff44f251ef30500662b9b633cb482.png)​​

​​

不支持的音频/视频格式 请试试 刷新

重播
播放

00:00/00:00 直播

00:00

进入全屏

进入样式全屏

1x

*   2x
*   1.5x
*   1x
*   0.75x
*   0.5x

​​
*   输入图片宽高：936*1664​

*   与输入图片接近的宽高比：9:16​

​![Image 2](https://portal.volccdn.com/obj/volcfe/cloud-universal-doc/upload_9b34efbbfb01e4032ac692bb57e59c17.png)​​​

不支持的音频/视频格式 请试试 刷新

重播
播放

00:00/00:00 直播

00:00

进入全屏

进入样式全屏

1x

*   2x
*   1.5x
*   1x
*   0.75x
*   0.5x

​​

​

​

​

​

​

​

提交任务返回参数​

通用返回参数​

业务返回参数​

重点关注data中以下字段，其他字段为公共返回(可忽略或不做解析)​

​

字段​类型​说明​
task_id​string​任务ID，用于查询结果​

​

提交任务请求&返回完整示例​

请求示例：​

​

{​

"req_key":"jimeng_ti2v_v30_pro",​

​

"image_urls":[​

"https://xxx"​

],​

"prompt":"千军万马",​

"seed":-1,​

"frames":121,​

"aspect_ratio":"16:9"​

}​

​

返回示例：​

​

{​

"code":10000,​

"data":{​

"task_id":"7392616336519610409"​

},​

"message":"Success",​

"request_id":"20240720103939AF0029465CF6A74E51EC",​

"status":10000,​

"time_elapsed":"104.852309ms"​

}​

​

查询任务​

查询任务请求参数​

Query参数​

​

参数​类型​可选/必选​说明​
Action​string​必选​接口名，固定值：CVSync2AsyncGetResult​
Version​string​必选​版本号，固定值：2022-08-31​

​

Header参数​

注意​

本服务固定值：Region为cn-north-1，Service为cv​

主要用于鉴权，详见 [公共参数](https://www.volcengine.com/docs/6369/67268) - 签名参数 - 在Header中的场景部分​

Body参数​

注意​

业务请求参数，放到request.body中，MIME-Type为 application/json​

​

参数​类型​可选/必选​说明​​
req_key​String​必选​服务标识​

取固定值: jimeng_ti2v_v30_pro​​
task_id​String​必选​任务ID，此字段的取值为 提交任务接口 的返回​​
req_json​JSON String​可选​json序列化后的字符串,目前支持隐性水印配置，可在返回结果中添加​示例："{\"aigc_meta\": {\"content_producer\": \"xxxxxx\", \"producer_id\": \"xxxxxx\", \"content_propagator\": \"xxxxxx\", \"propagate_id\": \"xxxxxx\"}}"​

​

ReqJson(序列化后的结果再赋值给req_json)​

配置信息​

​

参数​类型​可选/必选​说明​​
aigc_meta​AIGCMeta​可选​隐式标识​隐式标识验证方式：​

*   https://www.gcmark.com/web/index.html#/mark/check/video​

*   验证，先注册帐号 上传打标后的视频 点击开始检测 输出检测结果如下图即代表成功​

​![Image 3](https://portal.volccdn.com/obj/volcfe/cloud-universal-doc/upload_37d8115b3de900fec9b697787ea51d86.png)​​

​

AIGCMeta​

隐式标识，依据《人工智能生成合成内容标识办法》&《网络安全技术人工智能生成合成内容标识方法》​

​

名称​类型​可选/必选​描述​
content_producer​string​可选​内容生成服务ID（长度 <= 256字符）​
producer_id​string​必选​内容生成服务商给此图片数据的唯一ID（长度 <= 256字符）​
content_propagator​string​必选​内容传播服务商ID（长度 <= 256字符）​
propagate_id​string​可选​传播服务商给此图片数据的唯一ID（长度 <= 256字符）​

​

查询任务返回参数​

通用返回参数​

业务返回参数​

说明​

重点关注data中以下字段，其他字段为公共返回(可忽略或不做解析)​

​

参数名​类型​​
video_url​string​生成的视频URL（有效期为 1 小时）​
aigc_meta_tagged​bool​隐式标识是否打标成功​
status​string​任务执行状态​

*   in_queue：任务已提交​

*   generating：任务已被消费，处理中​

*   done：处理完成，成功或者失败，可根据外层code&message进行判断​

*   not_found：任务未找到，可能原因是无此任务或任务已过期(12小时)​

*   expired：任务已过期，请尝试重新提交任务请求​

​

查询任务请求&返回完整示例​

请求示例：​

​

{​

"req_key":"jimeng_ti2v_v30_pro",​

"task_id":"7491596536074305586",​

"req_json":"{\"aigc_meta\": {\"content_producer\": \"001191440300192203821610000\", \"producer_id\": \"producer_id_test123\", \"content_propagator\": \"001191440300192203821610000\", \"propagate_id\": \"propagate_id_test123\"}}"​

}​

​

返回示例：​

​

{​

"code":10000,​

"data":{​

"aigc_meta_tagged":true,​

"status":"done",​

"video_url":"https://xxxx"​

},​

"message":"Success",​

"request_id":"20250805144938F6E5264E9D24EB0C4E0A",​

"status":10000,​

"time_elapsed":"57.354545ms"​

}​

​

错误码​

通用错误码​

业务错误码​

​

HttpCode​错误码​错误消息​描述​是否需要重试​
200​10000​无​请求成功​不需要​
400​50411​Pre Img Risk Not Pass​输入图片前审核未通过​不需要​
400​50511​Post Img Risk Not Pass​输出图片后审核未通过​可重试​
400​50412​Text Risk Not Pass​输入文本前审核未通过​不需要​
400​50512​Post Text Risk Not Pass​输出文本后审核未通过​不需要​
400​50413​Post Text Risk Not Pass​输入文本含敏感词、版权词等审核不通过​不需要​
429​50429​Request Has Reached API Limit, Please Try Later​QPS超限​可重试​
429​50430​Request Has Reached API Concurrent Limit, Please Try Later​并发超限​可重试​
500​50500​Internal Error​内部错误​可重试​
500​50501​Internal RPC Error​内部算法错误​可重试​

​

接入说明​

SDK使用说明​

HTTP方式接入说明​

​

​

