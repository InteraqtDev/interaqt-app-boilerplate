output "bucket_name" {
  description = "Bucket 名称"
  value       = volcengine_tos_bucket.this.bucket_name
}

# 标准 output：供 generator 引用
output "endpoint" {
  description = "Bucket 内网端点"
  value       = "https://${volcengine_tos_bucket.this.bucket_name}.tos-${var.region}.ivolces.com"
}

output "extranet_endpoint" {
  description = "Bucket 外网端点"
  value       = "https://${volcengine_tos_bucket.this.bucket_name}.tos-${var.region}.volces.com"
}

output "connection_string" {
  description = "TOS 连接字符串（内网端点）"
  value       = "https://${volcengine_tos_bucket.this.bucket_name}.tos-${var.region}.ivolces.com"
  sensitive   = true
}

output "bucket_domain" {
  description = "Bucket 域名"
  value       = "${volcengine_tos_bucket.this.bucket_name}.tos-${var.region}.ivolces.com"
}
