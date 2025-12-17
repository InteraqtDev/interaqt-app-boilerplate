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
  default     = "cn-beijing"
}

variable "availability_zone" {
  description = "可用区"
  type        = string
  default     = "cn-beijing-a"
}

variable "instance_type" {
  description = "实例类型"
  type        = string
  default     = "HA"
}

variable "storage_type" {
  description = "存储类型"
  type        = string
  default     = "LocalSSD"
}

variable "storage_size" {
  description = "存储大小（GB）"
  type        = number
  default     = 100
}

variable "node_spec" {
  description = "节点规格"
  type        = string
  default     = "rds.postgres.d1.n.1c1g"
}

variable "engine_version" {
  description = "PostgreSQL 版本"
  type        = string
  default     = "PostgreSQL_14"
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

