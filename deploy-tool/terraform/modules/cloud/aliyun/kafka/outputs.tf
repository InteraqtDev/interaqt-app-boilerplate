output "instance_id" {
  description = "Kafka 实例 ID"
  value       = alicloud_alikafka_instance.this.id
}

output "instance_name" {
  description = "Kafka 实例名称"
  value       = alicloud_alikafka_instance.this.name
}

# 标准 output：供 generator 引用
output "endpoint" {
  description = "Kafka 连接端点（VPC 内网）"
  value       = alicloud_alikafka_instance.this.vpc_end_point
}

output "connection_string" {
  description = "Kafka 连接字符串"
  value       = alicloud_alikafka_instance.this.vpc_end_point
  sensitive   = true
}

output "endpoint_type" {
  description = "端点类型"
  value       = alicloud_alikafka_instance.this.end_point
}

output "vpc_endpoint" {
  description = "VPC 接入点"
  value       = alicloud_alikafka_instance.this.vpc_end_point
}

output "ssl_endpoint" {
  description = "SSL 接入点"
  value       = alicloud_alikafka_instance.this.ssl_end_point
}

output "topic_names" {
  description = "创建的 Topic 列表"
  value       = [for topic in alicloud_alikafka_topic.topics : topic.topic]
}

output "consumer_group_names" {
  description = "创建的 Consumer Group 列表"
  value       = [for group in alicloud_alikafka_consumer_group.groups : group.consumer_id]
}

output "sasl_username" {
  description = "SASL 用户名"
  value       = var.enable_sasl ? var.sasl_username : ""
}

output "sasl_password" {
  description = "SASL 密码"
  value       = var.enable_sasl ? var.sasl_password : ""
  sensitive   = true
}

output "bootstrap_servers" {
  description = "Bootstrap 服务器地址"
  value       = alicloud_alikafka_instance.this.vpc_end_point
}
