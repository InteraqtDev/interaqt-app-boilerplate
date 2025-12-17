variable "service_name" {
  description = "The name of the service"
  type        = string
}

variable "namespace" {
  description = "The namespace to deploy to"
  type        = string
}

variable "app_name" {
  description = "The app name for selector"
  type        = string
}

variable "labels" {
  description = "Additional labels for the service"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations for the service"
  type        = map(string)
  default     = {}
}

variable "ports" {
  description = "List of service ports"
  type = list(object({
    name        = string
    port        = number
    target_port = number
    protocol    = string
  }))
}

variable "service_type" {
  description = "The type of service (ClusterIP, NodePort, LoadBalancer)"
  type        = string
  default     = "ClusterIP"
}

variable "wait_for_load_balancer" {
  description = "Wait for LoadBalancer to get an EXTERNAL-IP. Should be false for local environments, true for cloud environments."
  type        = bool
  default     = true
}

