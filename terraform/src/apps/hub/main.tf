provider "kubernetes" {
  config_path = "./kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "./kubeconfig"
  }
}

module "cnpg_operator" {
  source = "../../modules/cnpg-operator"
}

module "cnpg_cluster" {
  source             = "../../modules/cnpg-cluster"
  storage_class      = var.storage_class
  storage_size       = var.cnpg_storage_size
  backup_destination = var.cnpg_backup_destination
  username           = "hackload"
  backup_retention   = var.cnpg_backup_retention
}

module "cert_manager" {
  source = "../../modules/cert-manager"

  create_cluster_issuer = true
  acme_email            = var.acme_email
}

module "traefik" {
  source = "../../modules/traefik"

  namespace               = "traefik-system"
  service_type            = var.traefik_service_type
  enable_dashboard        = var.traefik_enable_dashboard
  dashboard_host          = var.traefik_dashboard_host
  dashboard_tls_enabled   = var.traefik_dashboard_tls_enabled
  dashboard_cert_resolver = module.cert_manager.cluster_issuer_name

  persistence = {
    enabled      = true
    storageClass = var.storage_class
    size         = "128Mi"
    path         = "/data"
  }

  depends_on = [module.cert_manager]
}

resource "kubernetes_namespace" "nginx" {
  metadata {
    name = "nginx"
  }
}

resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx"
    namespace = kubernetes_namespace.nginx.metadata[0].name
    labels = {
      app = "nginx"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        container {
          image = "nginx:1.25-alpine"
          name  = "nginx"

          port {
            container_port = 80
          }

          resources {
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }

          volume_mount {
            name       = "nginx-config"
            mount_path = "/etc/nginx/conf.d"
          }

          volume_mount {
            name       = "nginx-html"
            mount_path = "/usr/share/nginx/html"
          }
        }

        volume {
          name = "nginx-config"
          config_map {
            name = kubernetes_config_map.nginx_config.metadata[0].name
          }
        }

        volume {
          name = "nginx-html"
          config_map {
            name = kubernetes_config_map.nginx_html.metadata[0].name
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "nginx" {
  metadata {
    name      = "nginx"
    namespace = kubernetes_namespace.nginx.metadata[0].name
  }

  spec {
    selector = {
      app = "nginx"
    }

    port {
      port        = 80
      target_port = 80
    }

    type = "ClusterIP"
  }
}

resource "kubernetes_config_map" "nginx_config" {
  metadata {
    name      = "nginx-config"
    namespace = kubernetes_namespace.nginx.metadata[0].name
  }

  data = {
    "default.conf" = <<EOF
server {
    listen 80;
    server_name hub.hackload.kz;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
  }
}

resource "kubernetes_config_map" "nginx_html" {
  metadata {
    name      = "nginx-html"
    namespace = kubernetes_namespace.nginx.metadata[0].name
  }

  data = {
    "index.html" = <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hackload Hub</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #fff, #f0f0f0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .status {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: rgba(76, 175, 80, 0.3);
            border: 2px solid #4CAF50;
            border-radius: 25px;
            font-weight: bold;
        }
        .info {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Hackload Hub</h1>
        <p>Welcome to the Hackload platform hub!</p>
        <div class="status">✅ System Online</div>
        <div class="info">
            <p>Powered by Kubernetes • Traefik • NGINX</p>
            <p>Secured with Let's Encrypt TLS</p>
        </div>
    </div>
</body>
</html>
EOF
  }
}

resource "kubernetes_manifest" "nginx_certificate" {
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "nginx-tls"
      namespace = kubernetes_namespace.nginx.metadata[0].name
    }
    spec = {
      secretName = "nginx-tls"
      issuerRef = {
        name = module.cert_manager.cluster_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = "hub.hackload.kz"
      dnsNames = ["hub.hackload.kz"]
    }
  }

  depends_on = [module.cert_manager]
}

resource "kubernetes_manifest" "nginx_ingressroute" {
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "nginx-ingressroute"
      namespace = kubernetes_namespace.nginx.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`hub.hackload.kz`)"
          kind  = "Rule"
          services = [
            {
              name = kubernetes_service.nginx.metadata[0].name
              port = 80
            }
          ]
        }
      ]
      tls = {
        secretName = "nginx-tls"
      }
    }
  }

  depends_on = [module.traefik, kubernetes_manifest.nginx_certificate]
}

resource "kubernetes_manifest" "nginx_redirect" {
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "nginx-redirect"
      namespace = kubernetes_namespace.nginx.metadata[0].name
    }
    spec = {
      entryPoints = ["web"]
      routes = [
        {
          match = "Host(`hub.hackload.kz`)"
          kind  = "Rule"
          services = [
            {
              name = "api@internal"
              kind = "TraefikService"
            }
          ]
          middlewares = [
            {
              name = kubernetes_manifest.redirect_middleware.manifest.metadata.name
            }
          ]
        }
      ]
    }
  }

  depends_on = [module.traefik]
}

resource "kubernetes_manifest" "redirect_middleware" {
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "redirect-to-https"
      namespace = kubernetes_namespace.nginx.metadata[0].name
    }
    spec = {
      redirectScheme = {
        scheme    = "https"
        permanent = true
      }
    }
  }
}

output "traefik_namespace" {
  description = "Namespace where Traefik is installed"
  value       = module.traefik.namespace
}

output "traefik_service_name" {
  description = "Name of the Traefik service"
  value       = module.traefik.service_name
}

output "traefik_load_balancer_ip" {
  description = "Load balancer IP for Traefik (if applicable)"
  value       = module.traefik.load_balancer_ip
}

output "traefik_dashboard_url" {
  description = "URL for Traefik dashboard"
  value       = module.traefik.dashboard_url
}

output "nginx_namespace" {
  description = "Namespace where NGINX is deployed"
  value       = kubernetes_namespace.nginx.metadata[0].name
}

output "nginx_service_name" {
  description = "Name of the NGINX service"
  value       = kubernetes_service.nginx.metadata[0].name
}

output "nginx_url" {
  description = "URL for the NGINX application"
  value       = "https://hub.hackload.kz"
}
