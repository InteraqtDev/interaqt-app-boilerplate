terraform {
  required_providers {
    volcengine = {
      source  = "volcengine/volcengine"
      version = "~> 0.0.1"
    }
  }
}

# RDS PostgreSQL 实例
resource "volcengine_rds_postgresql_instance" "this" {
  instance_name         = var.resource_name
  zone_id               = var.availability_zone
  instance_type         = var.instance_type
  storage_type          = var.storage_type
  storage_space         = var.storage_size
  node_spec             = var.node_spec
  
  db_engine_version     = var.engine_version
  super_account_name    = var.username
  super_account_password = var.password
  
  charge_info {
    charge_type = var.charge_type
    period      = var.period
  }
  
  vpc_id                = var.vpc_id
  subnet_id             = var.subnet_id
  
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

# 创建数据库
resource "volcengine_rds_postgresql_database" "this" {
  depends_on    = [volcengine_rds_postgresql_instance.this]
  instance_id   = volcengine_rds_postgresql_instance.this.id
  db_name       = var.database_name
  character_set_name = "utf8"
}

# 等待实例可用
resource "time_sleep" "wait_for_rds" {
  depends_on = [
    volcengine_rds_postgresql_instance.this,
    volcengine_rds_postgresql_database.this
  ]
  
  create_duration = "5m"
}

