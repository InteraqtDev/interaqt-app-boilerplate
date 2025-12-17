terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
}

# OSS Bucket
resource "alicloud_oss_bucket" "this" {
  bucket        = var.bucket_name
  acl           = var.acl
  storage_class = var.storage_class

  # 跨域配置
  dynamic "cors_rule" {
    for_each = var.enable_cors ? [1] : []
    content {
      allowed_origins = var.cors_allowed_origins
      allowed_methods = var.cors_allowed_methods
      allowed_headers = var.cors_allowed_headers
      expose_headers  = var.cors_expose_headers
      max_age_seconds = var.cors_max_age
    }
  }

  # 生命周期规则
  dynamic "lifecycle_rule" {
    for_each = var.enable_lifecycle ? [1] : []
    content {
      id      = "expire-old-objects"
      enabled = true
      prefix  = var.lifecycle_prefix

      expiration {
        days = var.lifecycle_expiration_days
      }
    }
  }

  # 服务端加密
  dynamic "server_side_encryption_rule" {
    for_each = var.enable_encryption ? [1] : []
    content {
      sse_algorithm = var.encryption_algorithm
    }
  }

  # 版本控制
  versioning {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }

  tags = {
    app         = "lit"
    environment = var.environment
    managed-by  = "deploy-tool"
  }
}

# RAM 用户（用于访问 OSS）
resource "alicloud_ram_user" "oss_user" {
  count        = var.create_access_key ? 1 : 0
  name         = "${var.bucket_name}-user"
  display_name = "OSS User for ${var.bucket_name}"
}

# RAM 策略
resource "alicloud_ram_policy" "oss_policy" {
  count       = var.create_access_key ? 1 : 0
  policy_name = "${var.bucket_name}-policy"
  policy_document = jsonencode({
    Version = "1"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "oss:GetObject",
          "oss:PutObject",
          "oss:DeleteObject",
          "oss:ListObjects",
          "oss:GetObjectAcl",
          "oss:PutObjectAcl"
        ]
        Resource = [
          "acs:oss:*:*:${var.bucket_name}",
          "acs:oss:*:*:${var.bucket_name}/*"
        ]
      }
    ]
  })
}

# 关联策略到用户
resource "alicloud_ram_user_policy_attachment" "oss_policy_attachment" {
  count       = var.create_access_key ? 1 : 0
  policy_name = alicloud_ram_policy.oss_policy[0].policy_name
  policy_type = alicloud_ram_policy.oss_policy[0].type
  user_name   = alicloud_ram_user.oss_user[0].name
}

# 创建 AccessKey
resource "alicloud_ram_access_key" "oss_access_key" {
  count     = var.create_access_key ? 1 : 0
  user_name = alicloud_ram_user.oss_user[0].name
}
