terraform {
  required_version = ">= 1.6.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "2.5.2"
    }
  }
}

variable "platform_name" {
  type    = string
  default = "ai-platform-local"
}

variable "environment" {
  type    = string
  default = "local"
}

locals {
  services = {
    inference = {
      name               = "inference"
      kind               = "inference"
      port               = 8000
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "local-echo-1"
      replicas           = 1
    }
    vector = {
      name               = "vector"
      kind               = "vector-store"
      port               = 6333
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    metadata = {
      name               = "metadata"
      kind               = "metadata-store"
      port               = 5432
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    gateway = {
      name               = "gateway"
      kind               = "gateway"
      port               = 8080
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    embedding = {
      name               = "embedding"
      kind               = "embedding"
      port               = 8001
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "local-embed-1"
      replicas           = 1
    }
    evaluation = {
      name               = "evaluation"
      kind               = "evaluation"
      port               = 8002
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    observability = {
      name               = "observability"
      kind               = "observability"
      port               = 8003
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    registry = {
      name               = "registry"
      kind               = "model-registry"
      port               = 8004
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    ingest = {
      name               = "ingest"
      kind               = "data-ingest"
      port               = 8005
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
    policy = {
      name               = "policy"
      kind               = "policy"
      port               = 8006
      bind               = "127.0.0.1"
      exposure           = "private"
      encryption_enabled = true
      api_key            = ""
      model              = "none"
      replicas           = 1
    }
  }
}

resource "local_file" "service" {
  for_each        = local.services
  filename        = "${path.module}/build/${each.key}.json"
  content         = jsonencode(each.value)
  file_permission = "0644"
}

resource "local_file" "platform_manifest" {
  filename        = "${path.module}/build/platform-manifest.json"
  content         = jsonencode({ platform = var.platform_name, environment = var.environment, services = keys(local.services) })
  file_permission = "0644"
}

resource "local_file" "policy_manifest" {
  filename        = "${path.module}/build/policy-manifest.json"
  content         = jsonencode({ policy_version = "1.0.0", rules = ["no-public-data-service", "no-hard-coded-secret", "encryption-required", "no-world-writable"] })
  file_permission = "0644"
}

resource "local_file" "stack_readme" {
  filename        = "${path.module}/build/README.txt"
  content         = "Local AI platform stack. Generated files only. No cloud resources.\n"
  file_permission = "0644"
}

output "platform_name" {
  value = var.platform_name
}

output "service_count" {
  value = length(local.services)
}
