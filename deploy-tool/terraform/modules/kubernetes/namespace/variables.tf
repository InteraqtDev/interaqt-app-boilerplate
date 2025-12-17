variable "namespace_name" {
  description = "The name of the namespace"
  type        = string
}

variable "environment" {
  description = "The environment (dev, prod, test)"
  type        = string
}

variable "labels" {
  description = "Additional labels to add to the namespace"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations to add to the namespace"
  type        = map(string)
  default     = {}
}

