terraform {
  required_version = ">= 1.8.1"

  backend "azurerm" {
    resource_group_name  = "hackload-prod"
    storage_account_name = "hackloadprodtf"
    container_name       = "terraformstate"
    key                  = "terraform.tfstate"
  }
}
