variable "resource_name" {
  description = "资源名称（用于标识）"
  type        = string
}

variable "bucket_name" {
  description = "OSS Bucket 名称"
  type        = string
}

variable "environment" {
  description = "环境名称"
  type        = string
}

variable "region" {
  description = "区域"
  type        = string
  default     = "cn-hongkong"
}

variable "acl" {
  description = "访问控制列表"
  type        = string
  default     = "private"
}

variable "storage_class" {
  description = "存储类型"
  type        = string
  default     = "Standard"
}

# CORS 配置
variable "enable_cors" {
  description = "是否启用跨域"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "允许的来源"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_methods" {
  description = "允许的 HTTP 方法"
  type        = list(string)
  default     = ["GET", "PUT", "POST", "DELETE", "HEAD"]
}

variable "cors_allowed_headers" {
  description = "允许的请求头"
  type        = list(string)
  default     = ["*"]
}

variable "cors_expose_headers" {
  description = "暴露的响应头"
  type        = list(string)
  default     = ["ETag", "x-oss-request-id"]
}

variable "cors_max_age" {
  description = "预检请求缓存时间（秒）"
  type        = number
  default     = 3600
}

# 生命周期配置
variable "enable_lifecycle" {
  description = "是否启用生命周期规则"
  type        = bool
  default     = false
}

variable "lifecycle_prefix" {
  description = "生命周期规则前缀"
  type        = string
  default     = ""
}

variable "lifecycle_expiration_days" {
  description = "对象过期天数"
  type        = number
  default     = 365
}

# 加密配置
variable "enable_encryption" {
  description = "是否启用服务端加密"
  type        = bool
  default     = true
}

variable "encryption_algorithm" {
  description = "加密算法"
  type        = string
  default     = "AES256"
}

# 版本控制
variable "versioning_enabled" {
  description = "是否启用版本控制"
  type        = bool
  default     = false
}

# AccessKey
variable "create_access_key" {
  description = "是否创建访问密钥"
  type        = bool
  default     = true
}
