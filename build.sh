#!/bin/bash

# Ensure we're in the phone-app directory
cd "$(dirname "$0")"

echo "📱 Building from: $(pwd)"
echo "🎯 Project: analog-phone"
echo "📦 Bundle ID: co.analogphone.app"
echo ""

# Run the build
eas build --platform ios --profile production --auto-submit
