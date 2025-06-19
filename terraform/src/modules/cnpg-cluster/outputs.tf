output "username" {
  value = var.username 
}

output "password" {
  value = random_string.password.result
}
