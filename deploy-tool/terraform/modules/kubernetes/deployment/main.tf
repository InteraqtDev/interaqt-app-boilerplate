resource "kubernetes_deployment" "this" {
  wait_for_rollout = false

  metadata {
    name      = var.deployment_name
    namespace = var.namespace

    labels = merge(
      {
        app        = var.app_name
        component  = var.component_type
        managed-by = "deploy-tool"
      },
      var.labels
    )
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = merge(
          {
            app       = var.app_name
            component = var.component_type
          },
          var.pod_labels
        )

        annotations = var.pod_annotations
      }

      spec {
        dynamic "init_container" {
          for_each = var.init_containers

          content {
            name    = init_container.value.name
            image   = init_container.value.image
            command = init_container.value.command
            args    = init_container.value.args

            dynamic "env" {
              for_each = init_container.value.env

              content {
                name  = env.value.name
                value = env.value.value
              }
            }

            dynamic "volume_mount" {
              for_each = init_container.value.volume_mounts

              content {
                name       = volume_mount.value.name
                mount_path = volume_mount.value.mount_path
              }
            }
          }
        }

        dynamic "container" {
          for_each = var.containers

          content {
            name    = container.value.name
            image   = container.value.image
            command = container.value.command
            args    = container.value.args

            dynamic "port" {
              for_each = container.value.ports

              content {
                container_port = port.value.container_port
                name           = port.value.name
                protocol       = port.value.protocol
              }
            }

            dynamic "env" {
              for_each = container.value.env

              content {
                name  = env.value.name
                value = env.value.value
              }
            }

            dynamic "volume_mount" {
              for_each = container.value.volume_mounts

              content {
                name       = volume_mount.value.name
                mount_path = volume_mount.value.mount_path
                sub_path   = lookup(volume_mount.value, "sub_path", null)
                read_only  = volume_mount.value.read_only
              }
            }

            resources {
              limits = container.value.resources.limits
              requests = container.value.resources.requests
            }

            dynamic "liveness_probe" {
              for_each = container.value.liveness_probe != null ? [container.value.liveness_probe] : []

              content {
                http_get {
                  path   = liveness_probe.value.http_get.path
                  port   = liveness_probe.value.http_get.port
                  scheme = liveness_probe.value.http_get.scheme
                }

                initial_delay_seconds = liveness_probe.value.initial_delay_seconds
                period_seconds        = liveness_probe.value.period_seconds
                timeout_seconds       = liveness_probe.value.timeout_seconds
                failure_threshold     = liveness_probe.value.failure_threshold
              }
            }

            dynamic "readiness_probe" {
              for_each = container.value.readiness_probe != null ? [container.value.readiness_probe] : []

              content {
                http_get {
                  path   = readiness_probe.value.http_get.path
                  port   = readiness_probe.value.http_get.port
                  scheme = readiness_probe.value.http_get.scheme
                }

                initial_delay_seconds = readiness_probe.value.initial_delay_seconds
                period_seconds        = readiness_probe.value.period_seconds
                timeout_seconds       = readiness_probe.value.timeout_seconds
                failure_threshold     = readiness_probe.value.failure_threshold
              }
            }
          }
        }

        dynamic "volume" {
          for_each = var.volumes

          content {
            name = volume.value.name

            dynamic "config_map" {
              for_each = volume.value.config_map != null ? [volume.value.config_map] : []

              content {
                name = config_map.value.name
              }
            }

            dynamic "secret" {
              for_each = volume.value.secret != null ? [volume.value.secret] : []

              content {
                secret_name = secret.value.secret_name
              }
            }

            dynamic "persistent_volume_claim" {
              for_each = volume.value.persistent_volume_claim != null ? [volume.value.persistent_volume_claim] : []

              content {
                claim_name = persistent_volume_claim.value.claim_name
              }
            }

            dynamic "empty_dir" {
              for_each = volume.value.empty_dir != null ? [volume.value.empty_dir] : []

              content {
                medium = empty_dir.value.medium
              }
            }
          }
        }
      }
    }
  }
}
