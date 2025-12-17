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
  default     = "cn-hongkong"
}

variable "partition_num" {
  description = "分区数量"
  type        = number
  default     = 50
}

variable "disk_type" {
  description = "磁盘类型"
  type        = number
  default     = 1 # 1: 高效云盘
}

variable "disk_size" {
  description = "磁盘大小（GB）"
  type        = number
  default     = 500
}

variable "deploy_type" {
  description = "部署类型"
  type        = number
  default     = 5 # 5: VPC 实例
}

variable "io_max" {
  description = "流量峰值（MB/s）"
  type        = number
  default     = 20
}

variable "eip_max" {
  description = "公网流量峰值（MB/s），0 表示不开启公网"
  type        = number
  default     = 0
}

variable "spec_type" {
  description = "规格类型"
  type        = string
  default     = "normal"
}

variable "charge_type" {
  description = "计费类型"
  type        = string
  default     = "PostPaid"
}

variable "vswitch_id" {
  description = "虚拟交换机 ID"
  type        = string
  default     = ""
}

variable "security_group_id" {
  description = "安全组 ID"
  type        = string
  default     = ""
}

# Topic 配置
variable "topic_names" {
  description = "要创建的 Topic 列表"
  type        = list(string)
  default     = []
}

variable "local_topic" {
  description = "是否为本地 Topic"
  type        = bool
  default     = false
}

variable "compact_topic" {
  description = "是否为压缩 Topic"
  type        = bool
  default     = false
}

variable "topic_partition_num" {
  description = "Topic 分区数"
  type        = number
  default     = 12
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
