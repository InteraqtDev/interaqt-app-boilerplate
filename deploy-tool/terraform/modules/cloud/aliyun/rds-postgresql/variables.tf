variable "resource_name" {
  description = "RDS 实例名称"
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

variable "slave_zone_id" {
  description = "备可用区（高可用版需要）"
  type        = string
  default     = "cn-hongkong-c"
}

variable "instance_type" {
  description = "实例规格"
  type        = string
  default     = "pg.n2.small.1"
}

variable "storage_type" {
  description = "存储类型"
  type        = string
  default     = "cloud_essd"
}

variable "storage_size" {
  description = "存储大小（GB）"
  type        = number
  default     = 100
}

variable "engine_version" {
  description = "PostgreSQL 版本"
  type        = string
  default     = "14.0"
}

variable "username" {
  description = "超级用户名"
  type        = string
  default     = "pgadmin"
}

variable "password" {
  description = "超级用户密码"
  type        = string
  sensitive   = true
}

variable "database_name" {
  description = "数据库名称"
  type        = string
}

variable "charge_type" {
  description = "计费类型"
  type        = string
  default     = "Postpaid"
}

variable "period" {
  description = "购买时长（预付费，月）"
  type        = number
  default     = 1
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
