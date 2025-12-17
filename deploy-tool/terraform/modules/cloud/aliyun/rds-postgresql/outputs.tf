output "instance_id" {
  description = "RDS 实例 ID"
  value       = alicloud_db_instance.this.id
}

output "endpoint" {
  description = "RDS 连接地址（内网）"
  value       = alicloud_db_instance.this.connection_string
}

output "port" {
  description = "RDS 端口"
  value       = alicloud_db_instance.this.port
}

output "username" {
  description = "超级用户名"
  value       = var.username
}

output "password" {
  description = "超级用户密码"
  value       = var.password
  sensitive   = true
}

output "database" {
  description = "数据库名称"
  value       = var.database_name
}

output "connection_string" {
  description = "完整连接字符串"
  value       = "postgresql://${var.username}:${var.password}@${alicloud_db_instance.this.connection_string}:${alicloud_db_instance.this.port}/${var.database_name}"
  sensitive   = true
}
