terraform {
  required_providers {
    volcengine = {
      source  = "volcengine/volcengine"
      version = "~> 0.0.1"
    }
  }
}

# 火山引擎 Kafka 实例
resource "volcengine_kafka_instance" "this" {
  instance_name    = var.resource_name
  instance_type    = var.instance_type
  version          = var.version_id
  zone_id          = var.availability_zone
  storage_type     = var.storage_type
  storage_space    = var.storage_size
  partition_number = var.partition_num

  vpc_id    = var.vpc_id
  subnet_id = var.subnet_id

  charge_info {
    charge_type = var.charge_type
    period      = var.period
  }

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

# 创建 Topic
resource "volcengine_kafka_topic" "topics" {
  for_each = toset(var.topic_names)

  instance_id      = volcengine_kafka_instance.this.id
  topic_name       = each.value
  partition_number = var.topic_partition_num
  replica_number   = var.topic_replica_num
  description      = "Topic created by deploy-tool"
}

# 创建 Consumer Group
resource "volcengine_kafka_consumer_group" "groups" {
  for_each = toset(var.consumer_group_names)

  instance_id = volcengine_kafka_instance.this.id
  group_id    = each.value
  description = "Consumer group created by deploy-tool"
}

# 创建 SASL 用户（用于认证）
resource "volcengine_kafka_sasl_user" "this" {
  count = var.enable_sasl ? 1 : 0

  instance_id   = volcengine_kafka_instance.this.id
  user_name     = var.sasl_username
  user_password = var.sasl_password
  description   = "SASL user created by deploy-tool"
}

# 等待实例可用
resource "time_sleep" "wait_for_kafka" {
  depends_on = [
    volcengine_kafka_instance.this,
    volcengine_kafka_topic.topics
  ]

  create_duration = "3m"
}
