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
  default     = "cn-beijing"
}

variable "availability_zone" {
  description = "可用区"
  type        = string
  default     = "cn-beijing-a"
}

variable "instance_type" {
  description = "实例规格"
  type        = string
  default     = "redis.shard.1g.basic"
}

variable "memory_size" {
  description = "内存大小（GB）"
  type        = number
  default     = 1
}

variable "shard_number" {
  description = "分片数量"
  type        = number
  default     = 1
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
  description = "购买时长（预付费）"
  type        = number
  default     = 1
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "子网 ID"
  type        = string
  default     = ""
}

