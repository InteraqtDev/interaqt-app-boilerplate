terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
}

# Redis 实例
resource "alicloud_kvstore_instance" "this" {
  instance_name  = var.resource_name
  instance_class = var.instance_class
  instance_type  = var.architecture_type
  engine_version = var.engine_version
  password       = var.password

  zone_id           = var.availability_zone
  secondary_zone_id = var.secondary_zone_id

  vswitch_id   = var.vswitch_id
  security_ips = var.security_ips

  payment_type = var.charge_type
  period       = var.period

  ssl_enable = var.ssl_enable

  tags = {
    app         = "lit"
    environment = var.environment
    managed-by  = "deploy-tool"
  }
}

# 创建账号（如果需要）
resource "alicloud_kvstore_account" "this" {
  count             = var.create_account ? 1 : 0
  account_name      = var.account_name
  account_password  = var.password
  account_privilege = var.account_privilege
  account_type      = "Normal"
  instance_id       = alicloud_kvstore_instance.this.id
}

# 等待实例可用
resource "time_sleep" "wait_for_redis" {
  depends_on = [alicloud_kvstore_instance.this]

  create_duration = "5m"
}
