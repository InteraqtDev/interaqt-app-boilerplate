resource "kubernetes_service" "this" {
  wait_for_load_balancer = var.wait_for_load_balancer
  
  metadata {
    name      = var.service_name
    namespace = var.namespace

    labels = merge(
      {
        app        = var.app_name
        managed-by = "deploy-tool"
      },
      var.labels
    )

    annotations = var.annotations
  }

  spec {
    selector = {
      app = var.app_name
    }

    dynamic "port" {
      for_each = var.ports

      content {
        name        = port.value.name
        port        = port.value.port
        target_port = port.value.target_port
        protocol    = port.value.protocol
      }
    }

    type = var.service_type
  }
}

