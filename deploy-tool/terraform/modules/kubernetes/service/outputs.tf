output "service_name" {
  description = "The name of the created service"
  value       = kubernetes_service.this.metadata[0].name
}

output "service_id" {
  description = "The ID of the created service"
  value       = kubernetes_service.this.id
}

output "load_balancer_ip" {
  description = "The external IP or hostname of the LoadBalancer (null if not LoadBalancer type or not yet assigned)"
  value = var.service_type == "LoadBalancer" ? (
    length(kubernetes_service.this.status) > 0 &&
    length(kubernetes_service.this.status[0].load_balancer) > 0 &&
    length(kubernetes_service.this.status[0].load_balancer[0].ingress) > 0
    ? coalesce(
      kubernetes_service.this.status[0].load_balancer[0].ingress[0].ip,
      kubernetes_service.this.status[0].load_balancer[0].ingress[0].hostname
    )
    : null
  ) : null
}
