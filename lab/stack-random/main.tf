terraform {
  required_version = ">= 1.6.0"
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }
  }
}

# D12 amendment stack. Same shape as lab/stack: the same 10 service keys
# plus three standalone resources, 13 addresses in total. The service name,
# kind and port are carried in keepers so the configuration is fixed; only
# the generated values differ per rebuild, which is the property under test.
locals {
  services = {
    inference     = { name = "inference", kind = "inference", port = 8000 }
    vector        = { name = "vector", kind = "vector-store", port = 6333 }
    metadata      = { name = "metadata", kind = "metadata-store", port = 5432 }
    gateway       = { name = "gateway", kind = "gateway", port = 8080 }
    embedding     = { name = "embedding", kind = "embedding", port = 8001 }
    evaluation    = { name = "evaluation", kind = "evaluation", port = 8002 }
    observability = { name = "observability", kind = "observability", port = 8003 }
    registry      = { name = "registry", kind = "model-registry", port = 8004 }
    ingest        = { name = "ingest", kind = "data-ingest", port = 8005 }
    policy        = { name = "policy", kind = "policy", port = 8006 }
  }
}

resource "random_id" "service" {
  for_each    = local.services
  byte_length = 8
  keepers = {
    name = each.value.name
    kind = each.value.kind
    port = tostring(each.value.port)
  }
}

resource "random_uuid" "platform_manifest" {
}

resource "random_uuid" "policy_manifest" {
}

resource "random_pet" "stack_readme" {
  length    = 2
  separator = "-"
}
