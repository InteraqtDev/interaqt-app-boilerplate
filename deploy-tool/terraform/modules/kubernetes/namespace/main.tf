resource "kubernetes_namespace" "this" {
  metadata {
    name = var.namespace_name

    labels = merge(
      {
        environment = var.environment
        managed-by  = "deploy-tool"
      },
      var.labels
    )

    annotations = var.annotations
  }
}

