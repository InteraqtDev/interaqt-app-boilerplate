output "instance_id" {
  description = "Kafka 实例 ID"
  value       = volcengine_kafka_instance.this.id
}

output "instance_name" {
  description = "Kafka 实例名称"
  value       = volcengine_kafka_instance.this.instance_name
}

# 标准 output：供 generator 引用
output "endpoint" {
  description = "Kafka 连接端点（VPC 内网）"
  value       = volcengine_kafka_instance.this.connection_info[0].endpoint
}

output "connection_string" {
  description = "Kafka 连接字符串"
  value       = volcengine_kafka_instance.this.connection_info[0].endpoint
  sensitive   = true
}

output "public_endpoint" {
  description = "Kafka 公网端点"
  value       = volcengine_kafka_instance.this.connection_info[0].public_endpoint
}

output "topic_names" {
  description = "创建的 Topic 列表"
  value       = [for topic in volcengine_kafka_topic.topics : topic.topic_name]
}

output "consumer_group_names" {
  description = "创建的 Consumer Group 列表"
  value       = [for group in volcengine_kafka_consumer_group.groups : group.group_id]
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
  value       = volcengine_kafka_instance.this.connection_info[0].endpoint
}
