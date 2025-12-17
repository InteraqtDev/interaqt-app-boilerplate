variable "resource_name" {
  description = "Kafka 实例名称"
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
  default     = "kafka.20xrate.hw"
}

variable "storage_type" {
  description = "存储类型"
  type        = string
  default     = "ESSD_PL0"
}

variable "storage_size" {
  description = "存储大小（GB）"
  type        = number
  default     = 100
}

variable "partition_num" {
  description = "分区数量"
  type        = number
  default     = 50
}

variable "version_id" {
  description = "Kafka 版本"
  type        = string
  default     = "2.8.2"
}

variable "charge_type" {
  description = "计费类型"
  type        = string
  default     = "PostPaid"
}

variable "period" {
  description = "购买时长（预付费，月）"
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

# Topic 配置
variable "topic_names" {
  description = "要创建的 Topic 列表"
  type        = list(string)
  default     = []
}

variable "topic_partition_num" {
  description = "Topic 分区数"
  type        = number
  default     = 12
}

variable "topic_replica_num" {
  description = "Topic 副本数"
  type        = number
  default     = 3
}

# Consumer Group 配置
variable "consumer_group_names" {
  description = "要创建的 Consumer Group 列表"
  type        = list(string)
  default     = []
}

# SASL 认证配置
variable "enable_sasl" {
  description = "是否启用 SASL 认证"
  type        = bool
  default     = true
}

variable "sasl_username" {
  description = "SASL 用户名"
  type        = string
  default     = "kafkaadmin"
}

variable "sasl_password" {
  description = "SASL 密码"
  type        = string
  sensitive   = true
  default     = ""
}
