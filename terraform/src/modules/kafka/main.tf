resource "random_uuid" "cluster_id" {}

resource "kubernetes_namespace" "kafka" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_service" "kafka_headless" {
  metadata {
    name      = "kafka-headless"
    namespace = kubernetes_namespace.kafka.metadata[0].name
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
    namespace = kubernetes_namespace.kafka.metadata[0].name
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
    namespace = kubernetes_namespace.kafka.metadata[0].name
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
            value = "0@kafka-0.${kubernetes_service.kafka_headless.metadata[0].name}.${kubernetes_namespace.kafka.metadata[0].name}.svc.cluster.local:9093"
          }
          env {
            name  = "KAFKA_CFG_LISTENERS"
            value = "BROKER://:9092,CONTROLLER://:9093"
          }
          env {
            name  = "KAFKA_CFG_ADVERTISED_LISTENERS"
            value = "BROKER://${kubernetes_service.kafka_client.metadata[0].name}.${kubernetes_namespace.kafka.metadata[0].name}.svc.cluster.local:9092"
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
