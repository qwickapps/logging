#!/bin/bash
#
# Clean Environment Validation Script
#
# This script validates that @qwickapps/logging can be installed
# and used in a completely clean environment (fresh Node.js project).
#
# Usage:
#   ./qa/clean-install/validate.sh
#
# Requirements:
#   - Docker must be running
#   - Package must be built (npm run build)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Clean Environment Validation Test                             ║"
echo "║  @qwickapps/logging                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not running"
    exit 1
fi

# Create temp directory for build context
BUILD_CONTEXT=$(mktemp -d)
trap "rm -rf $BUILD_CONTEXT" EXIT

echo "📦 Step 1/3: Building @qwickapps/logging..."
cd "$PACKAGE_DIR"
npm run build > /dev/null 2>&1
mkdir -p "$BUILD_CONTEXT/packages"
npm pack --pack-destination "$BUILD_CONTEXT/packages" > /dev/null 2>&1
echo "   ✓ Logging package built"

echo ""
echo "🐳 Step 2/3: Preparing Docker build context..."
cp "$SCRIPT_DIR/Dockerfile" "$BUILD_CONTEXT/"
cp "$SCRIPT_DIR/test-app.ts" "$BUILD_CONTEXT/"
echo "   ✓ Build context ready"

echo ""
echo "🔨 Step 3/3: Running Docker validation..."
echo "   (This may take 1-2 minutes on first run)"
echo ""

cd "$BUILD_CONTEXT"

# Run Docker build and capture output
BUILD_OUTPUT=$(docker build -t qwickapps-logging-validation-test . 2>&1)
BUILD_EXIT_CODE=$?

# Show relevant output
echo "$BUILD_OUTPUT" | grep -E "(Step|DONE|error TS|ERROR:)" | head -30

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  ✅ VALIDATION PASSED                                          ║"
    echo "║                                                                ║"
    echo "║  The package can be installed and used in a clean environment ║"
    echo "║  with all TypeScript types resolving correctly.               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"

    # Clean up Docker image
    docker rmi qwickapps-logging-validation-test > /dev/null 2>&1 || true
    exit 0
else
    echo ""
    echo "Build errors:"
    echo "$BUILD_OUTPUT" | grep -E "(error TS|Property|Module|Type)" | head -20
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  ❌ VALIDATION FAILED                                          ║"
    echo "║                                                                ║"
    echo "║  The package failed to install or build in a clean environment║"
    echo "║  Check the errors above for details.                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    exit 1
fi
