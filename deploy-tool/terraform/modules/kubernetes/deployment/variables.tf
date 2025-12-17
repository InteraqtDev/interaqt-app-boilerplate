variable "deployment_name" {
  description = "The name of the deployment"
  type        = string
}

variable "namespace" {
  description = "The namespace to deploy to"
  type        = string
}

variable "app_name" {
  description = "The app name for labels and selectors"
  type        = string
}

variable "component_type" {
  description = "The component type (middleware, component)"
  type        = string
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 1
}

variable "labels" {
  description = "Additional labels for the deployment"
  type        = map(string)
  default     = {}
}

variable "pod_labels" {
  description = "Additional labels for the pods"
  type        = map(string)
  default     = {}
}

variable "pod_annotations" {
  description = "Annotations for the pods"
  type        = map(string)
  default     = {}
}

variable "init_containers" {
  description = "Init container specifications"
  type = list(object({
    name    = string
    image   = string
    command = list(string)
    args    = list(string)
    env = list(object({
      name  = string
      value = string
    }))
    volume_mounts = list(object({
      name       = string
      mount_path = string
    }))
  }))
  default = []
}

variable "containers" {
  description = "List of containers in the pod"
  type = list(object({
    name    = string
    image   = string
    command = list(string)
    args    = list(string)
    ports = list(object({
      container_port = number
      name           = string
      protocol       = string
    }))
    env = list(object({
      name  = string
      value = string
    }))
    volume_mounts = list(object({
      name       = string
      mount_path = string
      sub_path   = optional(string)
      read_only  = bool
    }))
    resources = object({
      limits = map(string)
      requests = map(string)
    })
    liveness_probe = object({
      http_get = object({
        path   = string
        port   = number
        scheme = string
      })
      initial_delay_seconds = number
      period_seconds        = number
      timeout_seconds       = number
      failure_threshold     = number
    })
    readiness_probe = object({
      http_get = object({
        path   = string
        port   = number
        scheme = string
      })
      initial_delay_seconds = number
      period_seconds        = number
      timeout_seconds       = number
      failure_threshold     = number
    })
  }))
}

variable "volumes" {
  description = "List of volumes for the pod"
  type = list(object({
    name = string
    config_map = object({
      name = string
    })
    secret = object({
      secret_name = string
    })
    persistent_volume_claim = object({
      claim_name = string
    })
    empty_dir = object({
      medium = string
    })
  }))
  default = []
}
