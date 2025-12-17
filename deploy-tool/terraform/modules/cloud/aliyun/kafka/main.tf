terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
}

# 阿里云消息队列 Kafka 版实例
resource "alicloud_alikafka_instance" "this" {
  name          = var.resource_name
  partition_num = var.partition_num
  disk_type     = var.disk_type
  disk_size     = var.disk_size
  deploy_type   = var.deploy_type
  io_max        = var.io_max
  eip_max       = var.eip_max
  spec_type     = var.spec_type

  vswitch_id     = var.vswitch_id
  security_group = var.security_group_id

  paid_type = var.charge_type

  tags = {
    app         = "lit"
    environment = var.environment
    managed-by  = "deploy-tool"
  }
}

# 创建 Topic
resource "alicloud_alikafka_topic" "topics" {
  for_each = toset(var.topic_names)

  instance_id   = alicloud_alikafka_instance.this.id
  topic         = each.value
  local_topic   = var.local_topic
  compact_topic = var.compact_topic
  partition_num = var.topic_partition_num
  remark        = "Topic created by deploy-tool"
}

# 创建 Consumer Group
resource "alicloud_alikafka_consumer_group" "groups" {
  for_each = toset(var.consumer_group_names)

  instance_id = alicloud_alikafka_instance.this.id
  consumer_id = each.value
}

# 创建 SASL 用户（用于认证）
resource "alicloud_alikafka_sasl_user" "this" {
  count = var.enable_sasl ? 1 : 0

  instance_id = alicloud_alikafka_instance.this.id
  username    = var.sasl_username
  password    = var.sasl_password
  type        = "plain"
}

# 创建 SASL ACL（访问控制）
resource "alicloud_alikafka_sasl_acl" "topic_acl" {
  count = var.enable_sasl ? 1 : 0

  instance_id               = alicloud_alikafka_instance.this.id
  username                  = alicloud_alikafka_sasl_user.this[0].username
  acl_resource_type         = "Topic"
  acl_resource_name         = "*"
  acl_resource_pattern_type = "LITERAL"
  acl_operation_type        = "Write"
}

resource "alicloud_alikafka_sasl_acl" "group_acl" {
  count = var.enable_sasl ? 1 : 0

  instance_id               = alicloud_alikafka_instance.this.id
  username                  = alicloud_alikafka_sasl_user.this[0].username
  acl_resource_type         = "Group"
  acl_resource_name         = "*"
  acl_resource_pattern_type = "LITERAL"
  acl_operation_type        = "Read"
}

# 等待实例可用
resource "time_sleep" "wait_for_kafka" {
  depends_on = [
    alicloud_alikafka_instance.this,
    alicloud_alikafka_topic.topics
  ]

  create_duration = "3m"
}
