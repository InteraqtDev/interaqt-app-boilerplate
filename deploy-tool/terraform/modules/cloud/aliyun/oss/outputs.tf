output "bucket_id" {
  description = "Bucket ID"
  value       = alicloud_oss_bucket.this.id
}

output "bucket_name" {
  description = "Bucket 名称"
  value       = alicloud_oss_bucket.this.bucket
}

output "endpoint" {
  description = "Bucket 内网端点"
  value       = alicloud_oss_bucket.this.intranet_endpoint
}

output "extranet_endpoint" {
  description = "Bucket 外网端点"
  value       = alicloud_oss_bucket.this.extranet_endpoint
}

output "access_key_id" {
  description = "AccessKey ID"
  value       = var.create_access_key ? alicloud_ram_access_key.oss_access_key[0].id : ""
  sensitive   = true
}

output "access_key_secret" {
  description = "AccessKey Secret"
  value       = var.create_access_key ? alicloud_ram_access_key.oss_access_key[0].secret : ""
  sensitive   = true
}

output "bucket_domain" {
  description = "Bucket 域名"
  value       = "${alicloud_oss_bucket.this.bucket}.${alicloud_oss_bucket.this.intranet_endpoint}"
}

# 标准 output：供 generator 引用
output "connection_string" {
  description = "OSS 连接字符串（内网端点）"
  value       = "https://${alicloud_oss_bucket.this.bucket}.${alicloud_oss_bucket.this.intranet_endpoint}"
  sensitive   = true
}
