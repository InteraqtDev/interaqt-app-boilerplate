terraform {
  required_providers {
    volcengine = {
      source  = "volcengine/volcengine"
      version = "~> 0.0.1"
    }
  }
}

# TOS Bucket
resource "volcengine_tos_bucket" "this" {
  bucket_name   = var.bucket_name
  storage_class = var.storage_class

  # 公共访问控制
  public_acl = var.acl

  # 版本控制
  enable_version = var.versioning_enabled

  tags {
    key   = "app"
    value = "lit"
  }

  tags {
    key   = "environment"
    value = var.environment
  }

  tags {
    key   = "managed-by"
    value = "deploy-tool"
  }
}

# CORS 配置
resource "volcengine_tos_bucket_cors" "this" {
  count = var.enable_cors ? 1 : 0

  bucket_name = volcengine_tos_bucket.this.bucket_name

  cors_rules {
    allowed_origins = var.cors_allowed_origins
    allowed_methods = var.cors_allowed_methods
    allowed_headers = var.cors_allowed_headers
    expose_headers  = var.cors_expose_headers
    max_age_seconds = var.cors_max_age
  }
}

# 生命周期规则
resource "volcengine_tos_bucket_lifecycle" "this" {
  count = var.enable_lifecycle ? 1 : 0

  bucket_name = volcengine_tos_bucket.this.bucket_name

  rule {
    id      = "expire-old-objects"
    enabled = true
    prefix  = var.lifecycle_prefix

    expiration {
      days = var.lifecycle_expiration_days
    }
  }
}
