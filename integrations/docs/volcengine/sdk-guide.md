# 注意事项
应该使用 `createJSONAPI` 去访问 json 格式的接口。否则会导致解析 body 中的请求数据不正确。例如出现 `invalid req_key` 错误。