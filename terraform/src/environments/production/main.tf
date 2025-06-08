terraform {
  required_version = ">= 1.5"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    # Настройте бэкенд согласно вашей инфраструктуре
    # bucket = "hackload-terraform-state-production"
    # key    = "production/terraform.tfstate"
    # region = "us-west-2"
  }
}

# Настройка провайдеров для production среды
provider "kubernetes" {
  config_path = var.kubeconfig_path
  config_context = var.kube_context
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
    config_context = var.kube_context
  }
}

# Модуль кластера Kubernetes
module "k8s_cluster" {
  source = "../../modules/k8s-cluster"
  
  environment          = var.environment
  cluster_name         = var.cluster_name
  node_count           = var.node_count
  node_instance_type   = var.node_instance_type
  kubernetes_version   = var.kubernetes_version
  
  tags = merge(var.common_tags, {
    Environment = "production"
    Purpose     = "hackload-production"
    Backup      = "critical"
  })
}

# Модуль CloudNativePG для PostgreSQL
module "cloudnative_pg" {
  source = "../../modules/cloudnative-pg"
  
  namespace           = var.postgres_namespace
  cluster_name        = "${var.environment}-postgres"
  instances           = var.postgres_instances
  storage_size        = var.postgres_storage_size
  storage_class       = var.postgres_storage_class
  postgresql_version  = var.postgresql_version
  
  backup_enabled      = var.postgres_backup_enabled
  backup_schedule     = var.postgres_backup_schedule
  backup_retention    = var.postgres_backup_retention
  
  monitoring_enabled  = var.postgres_monitoring_enabled
  
  # Production-specific settings
  max_connections     = var.postgres_max_connections
  shared_buffers      = var.postgres_shared_buffers
  effective_cache_size = var.postgres_effective_cache_size
  
  depends_on = [module.k8s_cluster]
}

# Модуль приложения HackLoad
module "hackload_app" {
  source = "../../modules/hackload-app"
  
  namespace           = var.app_namespace
  app_name            = var.app_name
  image_tag           = var.app_image_tag
  replicas            = var.app_replicas
  
  database_url        = module.cloudnative_pg.connection_string
  
  ingress_enabled     = var.app_ingress_enabled
  ingress_host        = var.app_ingress_host
  ingress_class       = var.app_ingress_class
  
  # Production resources
  resources = {
    requests = {
      memory = "1Gi"
      cpu    = "500m"
    }
    limits = {
      memory = "4Gi"
      cpu    = "2000m"
    }
  }
  
  # Autoscaling configuration
  autoscaling = {
    enabled                        = var.app_autoscaling_enabled
    min_replicas                  = var.app_min_replicas
    max_replicas                  = var.app_max_replicas
    target_cpu_utilization_percentage = var.app_target_cpu_utilization
    target_memory_utilization_percentage = var.app_target_memory_utilization
  }
  
  depends_on = [module.cloudnative_pg]
}

# Модуль K6 Operator для нагрузочного тестирования
module "k6_operator" {
  source = "../../modules/k6-operator"
  
  namespace          = var.k6_namespace
  operator_version   = var.k6_operator_version
  
  # Production resources for K6 tests
  default_resources = {
    requests = {
      memory = "512Mi"
      cpu    = "250m"
    }
    limits = {
      memory = "4Gi"
      cpu    = "2000m"
    }
  }
  
  depends_on = [module.k8s_cluster]
}

# Модуль Prometheus для мониторинга
module "prometheus" {
  source = "../../modules/prometheus"
  
  namespace           = var.monitoring_namespace
  storage_size        = var.prometheus_storage_size
  storage_class       = var.prometheus_storage_class
  retention_time      = var.prometheus_retention_time
  
  scrape_interval     = var.prometheus_scrape_interval
  evaluation_interval = var.prometheus_evaluation_interval
  
  # Production resources for Prometheus
  resources = {
    requests = {
      memory = "4Gi"
      cpu    = "1000m"
    }
    limits = {
      memory = "16Gi"
      cpu    = "4000m"
    }
  }
  
  # High availability configuration
  replicas = var.prometheus_replicas
  
  depends_on = [module.k8s_cluster]
}

# Модуль Grafana для визуализации
module "grafana" {
  source = "../../modules/grafana"
  
  namespace           = var.monitoring_namespace
  admin_password      = var.grafana_admin_password
  storage_size        = var.grafana_storage_size
  storage_class       = var.grafana_storage_class
  
  prometheus_url      = module.prometheus.service_url
  
  ingress_enabled     = var.grafana_ingress_enabled
  ingress_host        = var.grafana_ingress_host
  ingress_class       = var.grafana_ingress_class
  
  # Production resources for Grafana
  resources = {
    requests = {
      memory = "1Gi"
      cpu    = "500m"
    }
    limits = {
      memory = "4Gi"
      cpu    = "2000m"
    }
  }
  
  # High availability
  replicas = var.grafana_replicas
  
  depends_on = [module.prometheus]
}
