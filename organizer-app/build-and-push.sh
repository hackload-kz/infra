#!/bin/bash

# Quick build and push script for organizer-app
# Simple wrapper around docker-build.sh

set -e

# Get short commit SHA
COMMIT_SHA=$(git rev-parse --short HEAD)

echo "🚀 Building and pushing organizer-app with commit ${COMMIT_SHA}"
echo "=================================================="

# Run the main build script with push enabled
./docker-build.sh --push "$@"

echo ""
echo "✅ Done! Image pushed with tags:"
echo "   - ghcr.io/hackload-infra/organizer-app:${COMMIT_SHA}"
echo "   - ghcr.io/hackload-infra/organizer-app:latest"