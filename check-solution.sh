#!/bin/bash

# Test electron launch directly - should work because we're using electron
echo "Testing direct electron launch..."
NODE_ENV=development npx electron src/main/main.dev.cjs

if [ $? -eq 0 ]; then
  echo "✅ Direct electron launch succeeded!"
else
  echo "❌ Direct electron launch failed!"
fi