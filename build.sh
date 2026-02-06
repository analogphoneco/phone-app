#!/bin/bash

# Ensure we're in the phone-app directory
cd "$(dirname "$0")" || exit 1

echo "📱 Building from: $(pwd)"
echo "🎯 Project: analog-phone"
echo "📦 Bundle ID: co.analogphone.app"
echo "🔢 Build Number: 3"
echo ""

# Verify we're in the right place
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Are we in the right directory?"
    exit 1
fi

# Run the build
eas build --platform ios --profile production --auto-submit --clear-cache
