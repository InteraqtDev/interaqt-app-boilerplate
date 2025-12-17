terraform {
  required_providers {
    volcengine = {
      source  = "volcengine/volcengine"
      version = "~> 0.0.1"
    }
  }
}

# Redis 实例
resource "volcengine_redis_instance" "this" {
  instance_name     = var.resource_name
  zone_id           = var.availability_zone
  instance_class    = var.instance_type
  shard_capacity    = var.memory_size
  shard_number      = var.shard_number
  engine_version    = var.engine_version
  password          = var.password
  charge_type       = var.charge_type
  period            = var.period
  
  vpc_id            = var.vpc_id
  subnet_id         = var.subnet_id
  
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

# 等待实例可用
resource "time_sleep" "wait_for_redis" {
  depends_on = [volcengine_redis_instance.this]
  
  create_duration = "5m"
}

