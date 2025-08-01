resource "kubernetes_namespace" "cnpg-cluster" {
  metadata {
    name = var.namespace
  }
}

resource "random_string" "password" {
  length  = 16
  special = false
}

resource "kubernetes_secret" "cnpg-cluster" {
  metadata {
    name      = "cnpg-cluster"
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
  }

  type = "kubernetes.io/basic-auth"

  data = {
    username = var.username
    password = random_string.password.result
  }
}

resource "kubernetes_manifest" "cnpg-cluster" {
  manifest = yamldecode(templatefile("${path.module}/crd/postgres-cluster.yaml", {
    namespace            = kubernetes_namespace.cnpg-cluster.metadata[0].name,
    storage_class        = var.storage_class,
    storage_size         = var.storage_size,
    instances            = var.instances,
    backup_destination   = var.backup_destination,
    backup_retention     = var.backup_retention,
    username             = var.username,
    user_password_secret = kubernetes_secret.cnpg-cluster.metadata[0].name,
  }))
}

resource "kubernetes_manifest" "cnpg-role" {
  manifest = yamldecode(templatefile("${path.module}/crd/postgres-cluster-role.yaml", {
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name,
  }))
}

resource "kubernetes_manifest" "cnpg-role-binding" {
  manifest = yamldecode(templatefile("${path.module}/crd/postgres-cluster-role-binding.yaml", {
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name,
  }))
}

resource "kubernetes_manifest" "cnpg-scheduled-backup" {
  manifest = yamldecode(templatefile("${path.module}/crd/scheduled-backup.yaml", {
    namespace       = kubernetes_namespace.cnpg-cluster.metadata[0].name,
    backup_schedule = var.backup_schedule,
  }))
}

# External access service for PostgreSQL
resource "kubernetes_service" "postgres-external" {
  count = var.expose_external ? 1 : 0
  
  metadata {
    name      = "postgres-external"
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
  }
  
  spec {
    selector = {
      "cnpg.io/cluster"      = "postgres-cluster"
      "cnpg.io/instanceRole" = "primary"
    }
    
    port {
      name        = "postgres"
      port        = 5432
      target_port = 5432
      protocol    = "TCP"
    }
    
    type = "ClusterIP"
  }
  
  depends_on = [kubernetes_manifest.cnpg-cluster]
}

# Traefik IngressRouteTCP for external PostgreSQL access
resource "kubernetes_manifest" "postgres-ingressroute-tcp" {
  count = var.expose_external ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRouteTCP"
    metadata = {
      name      = "postgres-external"
      namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
    }
    spec = {
      entryPoints = ["postgres"]
      routes = [
        {
          match = "HostSNI(`*`)"
          services = [
            {
              name = kubernetes_service.postgres-external[0].metadata[0].name
              port = 5432
            }
          ]
        }
      ]
    }
  }
  
  depends_on = [kubernetes_service.postgres-external]
}

# PostgreSQL Exporter for metrics collection
resource "kubernetes_deployment" "postgres_exporter" {
  count = var.enable_metrics ? 1 : 0
  
  metadata {
    name      = "postgres-exporter"
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
    labels = {
      app = "postgres-exporter"
    }
  }
  
  spec {
    replicas = 1
    
    selector {
      match_labels = {
        app = "postgres-exporter"
      }
    }
    
    template {
      metadata {
        labels = {
          app = "postgres-exporter"
        }
      }
      
      spec {
        container {
          name  = "postgres-exporter"
          image = "prometheuscommunity/postgres-exporter:v0.15.0"
          
          port {
            name           = "metrics"
            container_port = 9187
          }
          
          env {
            name  = "DATA_SOURCE_NAME"
            value = "postgresql://${var.username}:${random_string.password.result}@postgres-cluster-rw.${kubernetes_namespace.cnpg-cluster.metadata[0].name}.svc.cluster.local:5432/app?sslmode=disable"
          }
          
          env {
            name  = "PG_EXPORTER_WEB_LISTEN_ADDRESS"
            value = ":9187"
          }
          
          env {
            name  = "PG_EXPORTER_EXTEND_QUERY_PATH"
            value = ""
          }
          
          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
  
  depends_on = [kubernetes_manifest.cnpg-cluster]
}

# PostgreSQL Exporter Service
resource "kubernetes_service" "postgres_exporter" {
  count = var.enable_metrics ? 1 : 0
  
  metadata {
    name      = "postgres-exporter"
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
    labels = {
      app = "postgres-exporter"
    }
  }
  
  spec {
    selector = {
      app = "postgres-exporter"
    }
    
    port {
      name        = "metrics"
      port        = 9187
      target_port = 9187
      protocol    = "TCP"
    }
    
    type = "ClusterIP"
  }
  
  depends_on = [kubernetes_deployment.postgres_exporter]
}

# ServiceMonitor for PostgreSQL metrics
resource "kubernetes_manifest" "postgres_servicemonitor" {
  count = var.enable_metrics ? 1 : 0
  
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "postgres-exporter"
      namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
      labels = {
        app = "postgres-exporter"
        release = "prometheus"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "postgres-exporter"
        }
      }
      endpoints = [
        {
          port = "metrics"
          path = "/metrics"
          interval = "30s"
        }
      ]
    }
  }
  
  depends_on = [kubernetes_service.postgres_exporter]
}
