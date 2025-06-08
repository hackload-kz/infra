# HackLoad 2025 - Окружение разработки
# Базовая конфигурация для разработки и тестирования

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Модуль Kubernetes кластера
module "k8s_cluster" {
  source = "../../modules/k8s-cluster"
  
  cluster_name       = "hackload-dev"
  environment        = "dev"
  node_count         = 1
  node_instance_type = "t3.medium"
  
  # Минимальные ресурсы для разработки
  enable_autoscaling = false
  
  tags = {
    Project     = "HackLoad2025"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}

# Модуль базы данных
module "cloudnative_pg" {
  source = "../../modules/cloudnative-pg"
  
  namespace     = "hackload"
  environment   = "dev"
  cluster_name  = "hackload-postgres-dev"
  
  # Конфигурация для разработки
  instances          = 1
  postgresql_version = "15"
  storage_size      = "20Gi"
  
  # Отключаем реплики для dev
  enable_replicas = false
  
  # Базовое резервное копирование
  enable_backup = true
  backup_schedule = "0 3 * * 0"  # Еженедельно
  backup_retention = "7d"
  
  databases = [
    {
      name  = "hackload"
      owner = "hackload_app"
    }
  ]
  
  depends_on = [module.k8s_cluster]
}

# Модуль веб-приложения
module "hackload_app" {
  source = "../../modules/hackload-app"
  
  namespace     = "hackload"
  environment   = "dev"
  image_tag     = "dev-latest"
  replica_count = 1
  
  # Подключение к базе данных
  database_host   = module.cloudnative_pg.cluster_rw_service
  database_name   = "hackload"
  database_user   = "hackload_app"
  database_secret = "hackload-db-credentials"
  
  # Конфигурация для разработки
  max_concurrent_tests = 2
  test_timeout_minutes = 10
  
  # Минимальные ресурсы
  cpu_request    = "100m"
  cpu_limit      = "200m"
  memory_request = "128Mi"
  memory_limit   = "256Mi"
  
  depends_on = [module.cloudnative_pg]
}

# Модуль Prometheus
module "prometheus" {
  source = "../../modules/prometheus"
  
  namespace   = "monitoring"
  environment = "dev"
  
  # Конфигурация для разработки
  prometheus_version = "v2.45.0"
  retention_time     = "7d"
  storage_size       = "20Gi"
  
  # Базовые ресурсы
  cpu_request    = "200m"
  cpu_limit      = "500m"
  memory_request = "512Mi"
  memory_limit   = "2Gi"
  
  # Отключаем HA для dev
  enable_ha     = false
  replica_count = 1
  
  depends_on = [module.k8s_cluster]
}

# Модуль Grafana
module "grafana" {
  source = "../../modules/grafana"
  
  namespace   = "monitoring"
  environment = "dev"
  
  # Конфигурация для разработки
  grafana_version = "10.0.0"
  admin_user      = "admin"
  admin_password  = "dev123!"
  
  # Источники данных
  prometheus_url = module.prometheus.prometheus_url
  database_url   = module.cloudnative_pg.connection_url
  
  # Базовые ресурсы
  cpu_request    = "100m"
  cpu_limit      = "200m"
  memory_request = "128Mi"
  memory_limit   = "512Mi"
  
  # Простое хранение для dev
  enable_persistence = false
  
  depends_on = [module.prometheus]
}

# Модуль K6 Operator
module "k6_operator" {
  source = "../../modules/k6-operator"
  
  namespace   = "k6-operator-system"
  environment = "dev"
  
  # Ограниченная конфигурация для разработки
  max_concurrent_tests = 2
  default_parallelism  = 2
  max_parallelism     = 4
  
  # Базовые ресурсы оператора
  operator_cpu_request    = "50m"
  operator_cpu_limit      = "200m"
  operator_memory_request = "64Mi"
  operator_memory_limit   = "256Mi"
  
  # Простое хранение результатов
  enable_test_results_storage = true
  results_storage_size       = "5Gi"
  
  depends_on = [module.k8s_cluster]
}
