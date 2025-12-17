output "instance_id" {
  description = "Redis 实例 ID"
  value       = volcengine_redis_instance.this.id
}

output "endpoint" {
  description = "Redis 连接地址"
  value       = volcengine_redis_instance.this.connection_info[0].internal_endpoint
}

output "port" {
  description = "Redis 端口"
  value       = volcengine_redis_instance.this.connection_info[0].port
}

output "password" {
  description = "Redis 密码"
  value       = var.password
  sensitive   = true
}

output "connection_string" {
  description = "完整连接字符串"
  value       = "redis://:${var.password}@${volcengine_redis_instance.this.connection_info[0].internal_endpoint}:${volcengine_redis_instance.this.connection_info[0].port}"
  sensitive   = true
}

