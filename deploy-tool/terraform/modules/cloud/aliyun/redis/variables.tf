variable "resource_name" {
  description = "Redis 实例名称"
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

variable "availability_zone" {
  description = "可用区"
  type        = string
  default     = "cn-hongkong-b"
}

variable "secondary_zone_id" {
  description = "备可用区（高可用版需要）"
  type        = string
  default     = "cn-hongkong-c"
}

variable "instance_class" {
  description = "实例规格"
  type        = string
  default     = "redis.master.small.default"
}

variable "architecture_type" {
  description = "架构类型：Redis 或 Memcache"
  type        = string
  default     = "Redis"
}

variable "engine_version" {
  description = "Redis 版本"
  type        = string
  default     = "7.0"
}

variable "password" {
  description = "Redis 密码"
  type        = string
  sensitive   = true
}

variable "charge_type" {
  description = "计费类型"
  type        = string
  default     = "PostPaid"
}

variable "period" {
  description = "购买时长（预付费，月）"
  type        = string
  default     = "1"
}

variable "vswitch_id" {
  description = "虚拟交换机 ID"
  type        = string
  default     = ""
}

variable "security_ips" {
  description = "白名单 IP 列表"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

variable "ssl_enable" {
  description = "是否启用 SSL"
  type        = bool
  default     = false
}

# 账号配置
variable "create_account" {
  description = "是否创建账号"
  type        = bool
  default     = false
}

variable "account_name" {
  description = "账号名称"
  type        = string
  default     = "redisadmin"
}

variable "account_privilege" {
  description = "账号权限"
  type        = string
  default     = "RoleReadWrite"
}
