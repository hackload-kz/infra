# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Terraform Infrastructure
```bash
# Initialize Terraform
cd terraform/src/environments/production
terraform init

# Plan infrastructure changes
terraform plan

# Apply infrastructure changes
terraform apply

# Format Terraform files
terraform fmt -recursive

# Validate Terraform configuration
terraform validate
```

### Organizer App Development
```bash
# Navigate to the organizer app
cd organizer-app

# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database operations
npx prisma generate
npx prisma db push
npx prisma studio

# Run tests
./test-app.sh
./test-docker.sh
./deployment-check.sh
```

## Architecture Overview

### Repository Structure
This is a monorepo containing two main components:
1. **Organizer App** (`organizer-app/`) - Next.js hackathon management application
2. **Terraform Infrastructure** (`terraform/`) - Kubernetes infrastructure as code

### Technology Stack

#### Organizer App
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with server actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google/GitHub OAuth
- **Deployment**: Docker with standalone output

#### Infrastructure
- **Orchestration**: Kubernetes
- **Database**: PostgreSQL with CloudNative-PG operator
- **SSL/TLS**: cert-manager with Let's Encrypt
- **Ingress**: Traefik
- **Container Registry**: GitHub Container Registry (ghcr.io)
- **Cloud Provider**: OpenStack-based cloud

### Infrastructure Architecture

The Terraform infrastructure uses a modular approach:

```
terraform/src/
├── environments/
│   └── production/       # Production environment configuration
├── apps/
│   └── hub/             # Hub application deployment
└── modules/
    ├── kubernetes/      # Kubernetes cluster setup
    ├── cert-manager/    # SSL certificate management
    ├── traefik/         # Ingress controller
    ├── cnpg-operator/   # PostgreSQL operator
    ├── cnpg-cluster/    # PostgreSQL cluster
    └── hub/             # Hub application resources
```

#### Key Infrastructure Components

1. **Kubernetes Module**: Sets up the base Kubernetes cluster
2. **cert-manager**: Manages SSL certificates with Let's Encrypt
3. **Traefik**: Ingress controller for HTTP/HTTPS routing
4. **CloudNative-PG**: PostgreSQL operator for database management
5. **Hub Module**: Deploys the organizer app with proper configuration

### Application Deployment Flow

1. **Build**: GitHub Actions builds Docker images for organizer app
2. **Registry**: Images pushed to ghcr.io with both `latest` and commit SHA tags
3. **Deploy**: GitHub Actions uses kubectl to update the deployment image
4. **DNS**: Traefik routes traffic from `hub.hackload.kz` to the application
5. **SSL**: cert-manager automatically provisions Let's Encrypt certificates

#### GitHub Actions Deployment
- **Workflow**: `.github/workflows/docker-build-deploy.yml` handles both build and deployment
- **Jobs**: `build-and-push` job builds and pushes Docker image, `deploy` job updates Kubernetes deployment
- **Trigger**: Automatic deployment on push to main branch
- **Manual**: Can be triggered manually with custom image tag
- **Target**: Updates `deployment/hub` in namespace `hub`
- **Verification**: Waits for rollout completion and verifies deployment status

### Database Architecture

#### Universal Hackathon System
- **Core Models**: `User`, `Participant`, `Team`, `Hackathon`
- **Relationship Models**: `HackathonParticipation`, `JoinRequest`
- **Enums**: `TeamStatus`, `TeamLevel`, `JoinRequestStatus`
- Teams belong to specific hackathons (`hackathonId` required)
- Participants can participate in multiple hackathons
- Join requests are hackathon-specific

#### CloudNative-PG Configuration
- Automatic backups to Azure Blob Storage
- 30-day backup retention
- High availability with multiple replicas
- Scheduled backups for disaster recovery

## Development Guidelines

### Infrastructure Changes
1. Always test changes in development environment first
2. Use `terraform plan` to review changes before applying
3. Infrastructure changes should be made via Terraform, not manual kubectl commands
4. Follow the ADR (Architecture Decision Records) in `terraform/docs/adr/`
5. **Note**: The hub deployment resource ignores image and replica changes to avoid conflicts with GitHub Actions deployment

### Application Development
1. Follow the existing CLAUDE.md in `organizer-app/` for detailed development guidelines
2. Use OAuth-only authentication (Google + GitHub)
3. Admin users are controlled via `ADMIN_USERS` environment variable
4. All database changes must go through Prisma migrations

### Security Considerations
- OAuth providers must be configured for production domains
- Database credentials stored as Kubernetes secrets
- Container images pulled from authenticated registry
- SSL/TLS enforced for all external traffic

## Environment Variables

### Terraform (terraform.tfvars)
```hcl
# OpenStack Provider
openstack_auth_url    = "https://auth.pscloud.io/v3/"
openstack_region      = "your-region"
openstack_tenant_name = "your-tenant-name"
openstack_user_name   = "your-username"
openstack_password    = "your-password"

# GitHub Container Registry
ghcr_username = "your-github-username"
ghcr_token    = "your-github-personal-access-token"
ghcr_email    = "your-email@example.com"

# Application Configuration
hub_db_connection_string = "postgresql://username:password@host:5432/database"
nextauth_url          = "https://your-domain.com"
nextauth_secret       = "your-nextauth-secret-32-chars-long"
google_client_id      = "your-google-oauth-client-id"
google_client_secret  = "your-google-oauth-client-secret"
github_client_id      = "your-github-oauth-client-id"
github_client_secret  = "your-github-oauth-client-secret"
admin_users           = "admin@example.com,user2@example.com"
```

### Application Runtime
The application receives configuration through Kubernetes environment variables managed by Terraform.

## File Structure Context

### Key Files to Understand
- `terraform/src/environments/production/main.tf` - Main infrastructure entry point
- `terraform/src/modules/hub/main.tf` - Application deployment configuration
- `organizer-app/prisma/schema.prisma` - Database schema
- `organizer-app/src/auth.ts` - Authentication configuration
- `organizer-app/src/lib/actions.ts` - Server actions

### Modified Files (Current State)
- `terraform/src/apps/hub/variables.tf` - Hub application variables
- `terraform/src/environments/production/main.tf` - Production environment config
- `terraform/src/modules/hub/variables.tf` - Hub module variables

This suggests recent changes to infrastructure configuration that may need to be applied.

## GitHub Actions Secrets Required

For the kubectl deployment to work, ensure these secrets are configured in your GitHub repository:

- `KUBE_CONFIG`: Base64-encoded kubeconfig file for cluster access

To set up the kubeconfig secret:

```bash
# Encode your kubeconfig file
cat ~/.kube/config | base64 -w 0
# Copy the output and add it as KUBE_CONFIG secret in GitHub repository settings
```