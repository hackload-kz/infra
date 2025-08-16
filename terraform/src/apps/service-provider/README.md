# Service Provider Application

This Terraform configuration deploys a standalone service-provider application with its own Kafka and PostgreSQL infrastructure.

## Architecture

The service-provider app includes:

- **Kafka**: Message queue for async processing
- **PostgreSQL**: Dedicated database cluster (single replica, no backups, no external access)
- **Service Provider**: The main application

## Features

- Single replica PostgreSQL cluster (optimized for development/testing)
- Backups disabled for reduced resource usage
- No external database access for security
- Dedicated Kafka instance
- TLS/SSL enabled with automatic certificate management
- Configurable resource limits
- Support for multiple instances (25 as requested)

## Deployment

### Prerequisites

1. Kubernetes cluster with:
   - Traefik ingress controller
   - cert-manager for TLS certificates
   - StorageClass configured

2. Required permissions:
   - Cluster admin access for CRD management
   - Namespace creation permissions

### Configuration

1. Copy the example configuration:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   ```hcl
   namespace = "service-provider-1"  # Use unique namespaces for multiple instances
   service_provider_host = "your-domain.com"
   service_provider_path = "/service-provider"
   cert_issuer_name = "letsencrypt-prod"
   
   # GitHub Container Registry credentials
   ghcr_username = "your-username"
   ghcr_token = "ghp_xxxxxxxxxxxx"
   ghcr_email = "your-email@example.com"
   ```

### Deploy

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

### Scaling to Multiple Instances

To create 25 instances as requested, you can use Terraform workspaces or modules:

#### Option 1: Using Workspaces
```bash
for i in {1..25}; do
  terraform workspace new service-provider-$i
  terraform workspace select service-provider-$i
  
  # Modify terraform.tfvars to set unique values:
  # namespace = "service-provider-$i"
  # service_provider_host = "service-provider-$i.your-domain.com"
  # service_provider_path = "/service-provider-$i"
  
  terraform apply -auto-approve
done
```

#### Option 2: Using a parent module
Create a parent module that instantiates this configuration 25 times with different variables.

## Outputs

After deployment, the following outputs are available:

- `kafka_bootstrap_server`: Internal Kafka endpoint
- `postgres_host`: PostgreSQL cluster hostname
- `postgres_port`: PostgreSQL cluster port
- `service_provider_namespace`: Kubernetes namespace
- `service_provider_service_name`: Service name for internal access

## Resource Usage

### PostgreSQL Configuration
- **Instances**: 1 (single replica)
- **Backups**: Disabled
- **External Access**: Disabled
- **Storage**: Configurable (default: 10Gi)

### Kafka Configuration
- **Single broker** for simplicity
- **Metrics**: Optional (disabled by default)
- **Storage**: Configurable

### Service Provider
- **CPU**: 200m requests, 500m limits
- **Memory**: 256Mi requests, 512Mi limits
- **Replicas**: 1 (configurable)

## Security

- No external database access
- TLS encryption for all external traffic
- Container images pulled from authenticated registry
- Network policies can be added as needed

## Monitoring

Optional metrics collection is available for:
- Kafka JMX metrics
- PostgreSQL metrics via postgres_exporter

Enable by setting `enable_metrics = true` in terraform.tfvars.

## Troubleshooting

### Common Issues

1. **CRD conflicts**: If CloudNative-PG operator is already installed, comment out the `cnpg_operator` module.

2. **Storage class not found**: Verify your cluster has the specified storage class:
   ```bash
   kubectl get storageclass
   ```

3. **Certificate issues**: Ensure cert-manager is properly configured and the issuer exists:
   ```bash
   kubectl get clusterissuer
   ```

### Logs

Check component logs:
```bash
# Service Provider logs
kubectl logs -n <namespace> deployment/service-provider

# Kafka logs
kubectl logs -n <namespace> statefulset/kafka

# PostgreSQL logs
kubectl logs -n <namespace> postgres-cluster-1
```

## Cleanup

To remove all resources:
```bash
terraform destroy
```

**Warning**: This will delete all data in the PostgreSQL cluster since backups are disabled.