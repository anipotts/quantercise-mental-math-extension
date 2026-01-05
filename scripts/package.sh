#!/bin/bash

# Package Quantercise Mental Math Extension for Chrome Web Store
# Usage: ./scripts/package.sh

set -e

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
PACKAGE_NAME="quantercise-mental-math-extension-v${VERSION}.zip"

echo "📦 Packaging Quantercise Mental Math Extension v${VERSION}"
echo ""

# Navigate to extension directory
cd "$(dirname "$0")/.."

# Remove old package if exists
rm -f "../${PACKAGE_NAME}"

# Create ZIP excluding dev files
zip -r "../${PACKAGE_NAME}" . \
  -x "*.git*" \
  -x "*.md" \
  -x "scripts/*" \
  -x "*.DS_Store" \
  -x "assets/screenshots/*"

echo ""
echo "✅ Created: ${PACKAGE_NAME}"
echo "📍 Location: $(cd .. && pwd)/${PACKAGE_NAME}"
echo ""
echo "Next steps:"
echo "  1. Go to: https://chrome.google.com/webstore/devconsole"
echo "  2. Click your extension"
echo "  3. Go to 'Package' tab"
echo "  4. Click 'Upload new package'"
echo "  5. Upload ${PACKAGE_NAME}"
echo "  6. Submit for review"
