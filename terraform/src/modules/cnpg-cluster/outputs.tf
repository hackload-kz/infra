output "username" {
  value = var.username 
}

output "password" {
  value = random_string.password.result
}

output "host" {
  description = "The hostname of the PostgreSQL cluster"
  value       = "postgres-cluster-rw.${var.namespace}.svc.cluster.local"
}

output "port" {
  description = "The port of the PostgreSQL cluster"
  value       = 5432
}
