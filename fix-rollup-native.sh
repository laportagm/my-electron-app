#!/bin/bash

echo "🔧 Fixing Rollup native module dependencies..."
echo "   Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "   Clearing npm cache..."
npm cache clean --force

echo "   Reinstalling dependencies..."
npm install --legacy-peer-deps

echo "✅ Fixed Rollup dependencies."
echo "   You can now build your app with 'npm run build'"
