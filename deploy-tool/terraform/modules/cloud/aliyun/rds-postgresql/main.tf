terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
}

# RDS PostgreSQL 实例
resource "alicloud_db_instance" "this" {
  engine               = "PostgreSQL"
  engine_version       = var.engine_version
  instance_type        = var.instance_type
  instance_storage     = var.storage_size
  instance_charge_type = var.charge_type
  instance_name        = var.resource_name

  vswitch_id   = var.vswitch_id
  security_ips = var.security_ips

  zone_id         = var.availability_zone
  zone_id_slave_a = var.slave_zone_id

  db_instance_storage_type = var.storage_type

  tags = {
    app         = "lit"
    environment = var.environment
    managed-by  = "deploy-tool"
  }
}

# 创建数据库账号
resource "alicloud_rds_account" "this" {
  depends_on       = [alicloud_db_instance.this]
  db_instance_id   = alicloud_db_instance.this.id
  account_name     = var.username
  account_password = var.password
  account_type     = "Super"
}

# 创建数据库
resource "alicloud_db_database" "this" {
  depends_on    = [alicloud_rds_account.this]
  instance_id   = alicloud_db_instance.this.id
  name          = var.database_name
  character_set = "UTF8"
}

# 授予账号数据库权限
resource "alicloud_db_account_privilege" "this" {
  depends_on   = [alicloud_db_database.this]
  instance_id  = alicloud_db_instance.this.id
  account_name = alicloud_rds_account.this.account_name
  privilege    = "DBOwner"
  db_names     = [alicloud_db_database.this.name]
}

# 等待实例可用
resource "time_sleep" "wait_for_rds" {
  depends_on = [
    alicloud_db_instance.this,
    alicloud_db_database.this,
    alicloud_db_account_privilege.this
  ]

  create_duration = "5m"
}
