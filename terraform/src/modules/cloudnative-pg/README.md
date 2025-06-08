# Модуль CloudNativePG

## Обзор

Этот модуль развертывает CloudNativePG (CNPG), оператор Kubernetes для PostgreSQL, чтобы предоставить высокодоступное и масштабируемое решение базы данных для платформы HackLoad 2025. CloudNativePG предлагает автоматизированное резервное копирование, восстановление и функции высокой доступности, необходимые для продакшн окружения.

## Функции

- **Кластер PostgreSQL** с основными и репликными экземплярами
- **Автоматизированные резервные копии** в объектное хранилище
- **Восстановление на момент времени** (PITR) возможности
- **Высокая доступность** с автоматическим переключением отказоустойчивости
- **Пул соединений** с PgBouncer
- **Интеграция мониторинга** с Prometheus
- **TLS шифрование** для безопасных соединений

## Использование

```hcl
module "cloudnative_pg" {
  source = "../../modules/cloudnative-pg"
  
  namespace     = "hackload"
  environment   = "production"
  cluster_name  = "hackload-postgres"
  
  # Конфигурация кластера
  instances            = 3
  postgresql_version   = "15"
  storage_size        = "100Gi"
  storage_class       = "gp3"
  
  # Высокая доступность
  enable_replicas     = true
  replica_count       = 2
  
  # Конфигурация резервного копирования
  enable_backup       = true
  backup_schedule     = "0 2 * * *"  # Ежедневно в 2 утра
  backup_retention    = "30d"
  backup_storage_bucket = "hackload-postgres-backups"
  
  # Конфигурация базы данных
  databases = [
    {
      name  = "hackload"
      owner = "hackload_app"
    }
  ]
  
  users = [
    {
      name     = "hackload_app"
      database = "hackload"
      password_secret = "hackload-app-db-password"
    }
  ]
  
  # Resources
  cpu_request    = "500m"
  cpu_limit      = "2"
  memory_request = "1Gi"
  memory_limit   = "4Gi"
  
  # Monitoring
  enable_monitoring = true
  
  tags = {
    Component = "database"
    Project   = "HackLoad2025"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| namespace | Kubernetes namespace | string | "default" | no |
| environment | Environment name | string | - | yes |
| cluster_name | PostgreSQL cluster name | string | - | yes |
| instances | Number of PostgreSQL instances | number | 1 | no |
| postgresql_version | PostgreSQL version | string | "15" | no |
| storage_size | Storage size per instance | string | "20Gi" | no |
| storage_class | Kubernetes storage class | string | "gp2" | no |
| enable_replicas | Enable read replicas | bool | false | no |
| replica_count | Number of read replicas | number | 1 | no |
| enable_backup | Enable automated backups | bool | true | no |
| backup_schedule | Backup cron schedule | string | "0 2 * * *" | no |
| backup_retention | Backup retention period | string | "7d" | no |
| backup_storage_bucket | S3 bucket for backups | string | "" | no |
| databases | List of databases to create | list(object) | [] | no |
| users | List of users to create | list(object) | [] | no |
| cpu_request | CPU request | string | "250m" | no |
| cpu_limit | CPU limit | string | "1" | no |
| memory_request | Memory request | string | "512Mi" | no |
| memory_limit | Memory limit | string | "2Gi" | no |
| enable_monitoring | Enable Prometheus monitoring | bool | true | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_name | PostgreSQL cluster name |
| cluster_rw_service | Read-write service name |
| cluster_ro_service | Read-only service name |
| cluster_status | Cluster status |
| connection_secret | Secret containing connection details |
| backup_status | Backup configuration status |

## PostgreSQL Configuration

### Default Configuration
```sql
-- Performance tuning for load testing workloads
shared_preload_libraries = 'pg_stat_statements'
max_connections = 200
shared_buffers = '256MB'
effective_cache_size = '1GB'
maintenance_work_mem = '64MB'
checkpoint_completion_target = 0.9
wal_buffers = '16MB'
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Connection Pooling
```yaml
# PgBouncer configuration
pool_mode: transaction
max_client_conn: 100
default_pool_size: 25
max_db_connections: 50
```

## Database Schema

The module can automatically create databases and users:

```hcl
databases = [
  {
    name  = "hackload"
    owner = "hackload_app"
  },
  {
    name  = "prometheus"
    owner = "prometheus"
  }
]

users = [
  {
    name     = "hackload_app"
    database = "hackload"
    password_secret = "hackload-app-password"
  },
  {
    name     = "prometheus"
    database = "prometheus"
    password_secret = "prometheus-password"
  }
]
```

## Backup and Recovery

### Automated Backups
- **WAL Archiving**: Continuous WAL archiving to object storage
- **Base Backups**: Regular full backups
- **Retention**: Configurable retention policies
- **Compression**: Automatic backup compression

### Point-in-Time Recovery
```bash
# Example recovery to specific timestamp
kubectl cnpg restore cluster hackload-postgres-restored \
  --from-backup hackload-postgres-backup-20250530 \
  --pitr-target "2025-05-30 14:30:00"
```

## High Availability

### Automatic Failover
- **Health Checks**: Continuous health monitoring
- **Leader Election**: Automatic primary election
- **Split-Brain Protection**: Prevents data corruption
- **Zero-Downtime**: Minimal service interruption

### Replica Configuration
- **Streaming Replication**: Real-time data replication
- **Read-Only Access**: Distribute read workloads
- **Automatic Switchover**: Promote replica if needed

## Monitoring

### Metrics Exposed
- PostgreSQL performance metrics
- Connection pool statistics
- Backup and recovery status
- High availability events
- Resource utilization

### Prometheus Integration
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cnpg-cluster
spec:
  selector:
    matchLabels:
      cnpg.io/cluster: hackload-postgres
  endpoints:
  - port: metrics
```

## Security

### Network Security
- **Network Policies**: Restrict database access
- **TLS Encryption**: Encrypted client connections
- **Certificate Management**: Automatic cert rotation

### Authentication
- **SCRAM-SHA-256**: Strong password authentication
- **Client Certificates**: Certificate-based auth
- **Connection Limits**: Per-user connection limits

### Authorization
```sql
-- Example RBAC configuration
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hackload_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hackload_app;
```

## Performance Tuning

### Resource Allocation
- **CPU**: Optimized for concurrent connections
- **Memory**: Adequate buffer pool sizing
- **Storage**: High IOPS for transaction workloads

### PostgreSQL Tuning
```sql
-- Load testing optimizations
work_mem = '32MB'
maintenance_work_mem = '256MB'
checkpoint_segments = 64
checkpoint_completion_target = 0.9
wal_writer_delay = '10ms'
```

## Kubernetes Resources Created

- **Cluster**: CloudNativePG cluster definition
- **Secrets**: Database credentials and certificates
- **Services**: Read-write and read-only endpoints
- **ConfigMaps**: PostgreSQL configuration
- **PersistentVolumeClaims**: Database storage
- **ServiceMonitor**: Prometheus monitoring
- **NetworkPolicy**: Network access control

## Operations

### Scaling
```bash
# Scale cluster instances
kubectl cnpg scale cluster hackload-postgres --replicas=5

# Add read replica
kubectl cnpg replica create hackload-replica \
  --source-cluster hackload-postgres
```

### Maintenance
```bash
# Check cluster status
kubectl cnpg status hackload-postgres

# Manual backup
kubectl cnpg backup hackload-postgres

# Show configuration
kubectl cnpg config hackload-postgres
```

## Troubleshooting

### Common Issues

1. **Cluster Not Starting**
   - Check storage class availability
   - Verify RBAC permissions
   - Review operator logs

2. **Backup Failures**
   - Verify S3 bucket permissions
   - Check network connectivity
   - Review backup configuration

3. **Connection Issues**
   - Verify service endpoints
   - Check network policies
   - Review authentication settings

### Useful Commands

```bash
# Check cluster status
kubectl get cluster -n hackload

# View cluster events
kubectl describe cluster hackload-postgres -n hackload

# Check operator logs
kubectl logs -f deployment/cnpg-controller-manager -n cnpg-system

# Connect to database
kubectl cnpg psql hackload-postgres -n hackload
```

## Migration

### From External PostgreSQL
1. Create cluster with restore capability
2. Use pg_dump/pg_restore for data migration
3. Update application connection strings
4. Verify data integrity

### Between Environments
```bash
# Export from source
kubectl cnpg backup source-cluster

# Import to target
kubectl cnpg restore target-cluster \
  --from-backup source-backup
```

## Requirements

- CloudNativePG operator installed
- Kubernetes cluster with storage classes
- S3-compatible storage for backups (optional)
- Prometheus operator for monitoring (optional)

## Related Modules

- `hackload-app`: Primary consumer of this database
- `prometheus`: Monitors database performance
- `k8s-cluster`: Provides the underlying infrastructure
