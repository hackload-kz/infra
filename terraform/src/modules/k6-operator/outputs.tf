output "namespace" {
  description = "Namespace where k6 operator is deployed"
  value       = var.namespace
}

output "release_name" {
  description = "Name of the Helm release"
  value       = helm_release.k6_operator.name
}

output "chart_version" {
  description = "Version of the deployed k6-operator chart"
  value       = helm_release.k6_operator.version
}

output "service_account_name" {
  description = "Name of the k6 test service account (if created)"
  value       = var.create_test_service_account ? kubernetes_service_account.k6_tests[0].metadata[0].name : null
}

output "service_account_namespace" {
  description = "Namespace of the k6 test service account (if created)"
  value       = var.create_test_service_account ? kubernetes_service_account.k6_tests[0].metadata[0].namespace : null
}