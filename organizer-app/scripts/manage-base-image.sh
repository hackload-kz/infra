#!/bin/bash

# Base Image Management Script
# This script helps manage the base image for the organizer-app

set -e

REGISTRY="ghcr.io"
REPO_NAME="hackload-infra/organizer-app"
BASE_IMAGE_NAME="${REGISTRY}/${REPO_NAME}-base"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Calculate package hash
calculate_package_hash() {
    if [[ -f "$APP_DIR/package.json" && -f "$APP_DIR/package-lock.json" ]]; then
        PACKAGE_HASH=$(sha256sum "$APP_DIR/package.json" "$APP_DIR/package-lock.json" | sha256sum | cut -d' ' -f1)
        echo "$PACKAGE_HASH"
    else
        log_error "package.json or package-lock.json not found"
        exit 1
    fi
}

# Check if base image exists
check_base_image() {
    local tag="$1"
    if docker manifest inspect "${BASE_IMAGE_NAME}:${tag}" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Build base image locally
build_base_image() {
    local tag="$1"
    log_info "Building base image with tag: $tag"
    
    cd "$APP_DIR"
    docker build \
        -f Dockerfile.base \
        -t "${BASE_IMAGE_NAME}:${tag}" \
        -t "${BASE_IMAGE_NAME}:latest" \
        .
    
    log_success "Base image built successfully"
}

# Push base image
push_base_image() {
    local tag="$1"
    log_info "Pushing base image with tag: $tag"
    
    docker push "${BASE_IMAGE_NAME}:${tag}"
    docker push "${BASE_IMAGE_NAME}:latest"
    
    log_success "Base image pushed successfully"
}

# Build application using base image
build_app() {
    local base_tag="$1"
    log_info "Building application using base image: $base_tag"
    
    cd "$APP_DIR"
    docker build \
        -f Dockerfile.optimized \
        --build-arg BASE_IMAGE_TAG="$base_tag" \
        -t "${REPO_NAME}:latest" \
        .
    
    log_success "Application built successfully"
}

# List available base images
list_base_images() {
    log_info "Available base images:"
    docker images "${BASE_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
}

# Clean up old base images
cleanup_base_images() {
    local keep_count=${1:-5}
    log_info "Cleaning up old base images, keeping $keep_count most recent"
    
    # Keep only the most recent images
    docker images "${BASE_IMAGE_NAME}" --format "{{.ID}}" | tail -n +$((keep_count + 1)) | xargs -r docker rmi -f
    
    log_success "Cleanup completed"
}

# Show help
show_help() {
    cat << EOF
Base Image Management Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build                   Build base image locally
    push                    Push base image to registry
    build-app [BASE_TAG]    Build application using base image
    list                    List available base images
    cleanup [KEEP_COUNT]    Clean up old base images (default: keep 5)
    check                   Check if current base image exists
    hash                    Show current package hash
    status                  Show current status

Options:
    -h, --help             Show this help message

Examples:
    $0 build                           # Build base image with package hash
    $0 push                            # Push base image to registry
    $0 build-app latest                # Build app using latest base image
    $0 cleanup 3                       # Keep only 3 most recent base images
    $0 check                           # Check if base image exists for current packages

EOF
}

# Main script logic
main() {
    case "${1:-help}" in
        "build")
            PACKAGE_HASH=$(calculate_package_hash)
            TAG="pkg-$PACKAGE_HASH"
            
            if check_base_image "$TAG"; then
                log_warning "Base image with tag $TAG already exists"
                read -p "Do you want to rebuild? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Skipping build"
                    exit 0
                fi
            fi
            
            build_base_image "$TAG"
            ;;
        
        "push")
            PACKAGE_HASH=$(calculate_package_hash)
            TAG="pkg-$PACKAGE_HASH"
            push_base_image "$TAG"
            ;;
        
        "build-app")
            BASE_TAG="${2:-latest}"
            build_app "$BASE_TAG"
            ;;
        
        "list")
            list_base_images
            ;;
        
        "cleanup")
            KEEP_COUNT="${2:-5}"
            cleanup_base_images "$KEEP_COUNT"
            ;;
        
        "check")
            PACKAGE_HASH=$(calculate_package_hash)
            TAG="pkg-$PACKAGE_HASH"
            
            if check_base_image "$TAG"; then
                log_success "Base image exists: ${BASE_IMAGE_NAME}:${TAG}"
            else
                log_warning "Base image does not exist: ${BASE_IMAGE_NAME}:${TAG}"
                exit 1
            fi
            ;;
        
        "hash")
            PACKAGE_HASH=$(calculate_package_hash)
            echo "Package hash: $PACKAGE_HASH"
            echo "Base image tag: pkg-$PACKAGE_HASH"
            ;;
        
        "status")
            PACKAGE_HASH=$(calculate_package_hash)
            TAG="pkg-$PACKAGE_HASH"
            
            echo "=== Base Image Status ==="
            echo "Package hash: $PACKAGE_HASH"
            echo "Base image tag: $TAG"
            echo "Base image name: ${BASE_IMAGE_NAME}:${TAG}"
            
            if check_base_image "$TAG"; then
                log_success "Base image exists"
            else
                log_warning "Base image does not exist"
            fi
            
            echo ""
            list_base_images
            ;;
        
        "help"|"-h"|"--help")
            show_help
            ;;
        
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"