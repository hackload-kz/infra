resource "random_uuid" "cluster_id" {}

resource "kubernetes_service" "kafka_headless" {
  metadata {
    name      = "kafka-headless"
    namespace = var.namespace
  }
  spec {
    selector = {
      app = "kafka"
    }
    port {
      name = "broker"
      port = 9092
    }
    port {
      name = "controller"
      port = 9093
    }
    cluster_ip = "None" # This makes it a headless service
    type       = "ClusterIP"
  }
}

resource "kubernetes_service" "kafka_client" {
  metadata {
    name      = "kafka-client"
    namespace = var.namespace
  }
  spec {
    selector = {
      app = "kafka"
    }
    port {
      name        = "kafka-broker"
      port        = 9092
      target_port = 9092
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_stateful_set" "kafka" {
  metadata {
    name      = "kafka"
    namespace = var.namespace
  }

  spec {
    replicas    = 1
    service_name = kubernetes_service.kafka_headless.metadata[0].name
    selector {
      match_labels = {
        app = "kafka"
      }
    }

    template {
      metadata {
        labels = {
          app = "kafka"
        }
      }
      spec {
        security_context {
          fs_group = 1001
        }
        container {
          name  = "kafka"
          image = var.kafka_image

          port {
            name           = "broker"
            container_port = 9092
          }
          port {
            name           = "controller"
            container_port = 9093
          }

          env {
            name  = "KAFKA_CFG_PROCESS_ROLES"
            value = "broker,controller"
          }
          env {
            name  = "KAFKA_CFG_NODE_ID"
            value = "0"
          }
          env {
            name  = "KAFKA_CFG_CONTROLLER_QUORUM_VOTERS"
            value = "0@kafka-0.${kubernetes_service.kafka_headless.metadata[0].name}.${var.namespace}.svc.cluster.local:9093"
          }
          env {
            name  = "KAFKA_CFG_LISTENERS"
            value = "BROKER://:9092,CONTROLLER://:9093"
          }
          env {
            name  = "KAFKA_CFG_ADVERTISED_LISTENERS"
            value = "BROKER://${kubernetes_service.kafka_client.metadata[0].name}.${var.namespace}.svc.cluster.local:9092"
          }
          env {
            name  = "KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP"
            value = "CONTROLLER:PLAINTEXT,BROKER:PLAINTEXT"
          }
          env {
            name = "KAFKA_CFG_CONTROLLER_LISTENER_NAMES"
            value = "CONTROLLER"
          }
          env {
            name = "KAFKA_CFG_INTER_BROKER_LISTENER_NAME"
            value = "BROKER"
          }
          env {
            name = "KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR"
            value = "1"
          }
          env {
            name = "KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR"
            value = "1"
          }
          env {
            name = "KAFKA_CFG_TRANSACTION_STATE_LOG_MIN_ISR"
            value = "1"
          }
          env {
            name  = "KAFKA_CFG_LOG_DIRS"
            value = "/kafka/data"
          }
          env {
            name  = "KAFKA_CLUSTER_ID"
            value = random_uuid.cluster_id.result
          }
          
          # JMX metrics configuration
          dynamic "env" {
            for_each = var.enable_metrics ? [1] : []
            content {
              name  = "KAFKA_CFG_JMX_PORT"
              value = "9999"
            }
          }
          
          dynamic "env" {
            for_each = var.enable_metrics ? [1] : []
            content {
              name  = "KAFKA_JMX_OPTS"
              value = "-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.port=9999 -Dcom.sun.management.jmxremote.rmi.port=9999"
            }
          }
          
          dynamic "port" {
            for_each = var.enable_metrics ? [1] : []
            content {
              name           = "jmx"
              container_port = 9999
            }
          }

          volume_mount {
            name       = "kafka-data"
            mount_path = "/kafka"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "kafka-data"
      }
      spec {
        access_modes = ["ReadWriteOnce"]
        storage_class_name = var.storage_class
        resources {
          requests = {
            storage = var.storage_size
          }
        }
      }
    }
  }
}

# Kafka JMX Exporter Service
resource "kubernetes_service" "kafka_jmx" {
  count = var.enable_metrics ? 1 : 0
  
  metadata {
    name      = "kafka-jmx"
    namespace = var.namespace
    labels = {
      app = "kafka"
    }
  }
  
  spec {
    selector = {
      app = "kafka"
    }
    
    port {
      name        = "jmx"
      port        = 9999
      target_port = 9999
      protocol    = "TCP"
    }
    
    type = "ClusterIP"
  }
}

# Kafka JMX Exporter Deployment
resource "kubernetes_deployment" "kafka_jmx_exporter" {
  count = var.enable_metrics ? 1 : 0
  
  metadata {
    name      = "kafka-jmx-exporter"
    namespace = var.namespace
    labels = {
      app = "kafka-jmx-exporter"
    }
  }
  
  spec {
    replicas = 1
    
    selector {
      match_labels = {
        app = "kafka-jmx-exporter"
      }
    }
    
    template {
      metadata {
        labels = {
          app = "kafka-jmx-exporter"
        }
      }
      
      spec {
        container {
          name  = "jmx-exporter"
          image = "bitnami/jmx-exporter:0.20.0"
          
          port {
            name           = "metrics"
            container_port = 8080
          }
          
          command = ["java"]
          
          args = [
            "-jar",
            "/opt/bitnami/jmx-exporter/jmx_prometheus_httpserver.jar",
            "8080",
            "/etc/jmx-exporter/config.yaml"
          ]
          
          volume_mount {
            name       = "jmx-config"
            mount_path = "/etc/jmx-exporter"
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
        
        volume {
          name = "jmx-config"
          config_map {
            name = kubernetes_config_map.kafka_jmx_config[0].metadata[0].name
          }
        }
      }
    }
  }
}

# Kafka JMX Exporter ConfigMap
resource "kubernetes_config_map" "kafka_jmx_config" {
  count = var.enable_metrics ? 1 : 0
  
  metadata {
    name      = "kafka-jmx-config"
    namespace = var.namespace
  }
  
  data = {
    "config.yaml" = <<-EOT
jmxUrl: service:jmx:rmi:///jndi/rmi://kafka-0.kafka-headless.${var.namespace}.svc.cluster.local:9999/jmxrmi
rules:
  # Kafka broker metrics
  - pattern: kafka.server<type=(.+), name=(.+)><>Value
    name: kafka_server_$1_$2
    type: GAUGE
  
  # Kafka controller metrics
  - pattern: kafka.controller<type=(.+), name=(.+)><>Value
    name: kafka_controller_$1_$2
    type: GAUGE
  
  # Kafka network metrics
  - pattern: kafka.network<type=(.+), name=(.+)><>Value
    name: kafka_network_$1_$2
    type: GAUGE
  
  # Kafka log metrics
  - pattern: kafka.log<type=(.+), name=(.+)><>Value
    name: kafka_log_$1_$2
    type: GAUGE
    
  # Topic metrics
  - pattern: kafka.server<type=BrokerTopicMetrics, name=(.+), topic=(.+)><>Count
    name: kafka_server_brokertopicmetrics_$1_total
    labels:
      topic: "$2"
    type: COUNTER
    
  # Partition metrics  
  - pattern: kafka.log<type=Log, name=(.+), topic=(.+), partition=(.+)><>Value
    name: kafka_log_$1
    labels:
      topic: "$2"
      partition: "$3"
    type: GAUGE
EOT
  }
}

# Kafka JMX Exporter Service
resource "kubernetes_service" "kafka_jmx_exporter" {
  count = var.enable_metrics ? 1 : 0
  
  metadata {
    name      = "kafka-jmx-exporter"
    namespace = var.namespace
    labels = {
      app = "kafka-jmx-exporter"
    }
  }
  
  spec {
    selector = {
      app = "kafka-jmx-exporter"
    }
    
    port {
      name        = "metrics"
      port        = 8080
      target_port = 8080
      protocol    = "TCP"
    }
    
    type = "ClusterIP"
  }
}

# ServiceMonitor for Kafka metrics
resource "kubernetes_manifest" "kafka_servicemonitor" {
  count = var.enable_metrics ? 1 : 0
  
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "kafka-jmx-exporter"
      namespace = var.namespace
      labels = {
        app = "kafka-jmx-exporter"
        release = "prometheus"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "kafka-jmx-exporter"
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
  
  depends_on = [kubernetes_service.kafka_jmx_exporter]
}
