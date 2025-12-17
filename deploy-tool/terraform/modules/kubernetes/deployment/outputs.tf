output "deployment_name" {
  description = "The name of the created deployment"
  value       = kubernetes_deployment.this.metadata[0].name
}

output "deployment_id" {
  description = "The ID of the created deployment"
  value       = kubernetes_deployment.this.id
}

