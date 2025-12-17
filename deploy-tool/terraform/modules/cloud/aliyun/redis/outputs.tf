output "instance_id" {
  description = "Redis 实例 ID"
  value       = alicloud_kvstore_instance.this.id
}

output "endpoint" {
  description = "Redis 连接地址（内网）"
  value       = alicloud_kvstore_instance.this.connection_domain
}

output "port" {
  description = "Redis 端口"
  value       = alicloud_kvstore_instance.this.private_connection_port
}

output "password" {
  description = "Redis 密码"
  value       = var.password
  sensitive   = true
}

output "connection_string" {
  description = "完整连接字符串"
  value       = "redis://:${var.password}@${alicloud_kvstore_instance.this.connection_domain}:${alicloud_kvstore_instance.this.private_connection_port}"
  sensitive   = true
}
