#!/bin/bash

# Remove Tailwind v4 packages
npm uninstall tailwindcss @tailwindcss/postcss

# Install Tailwind CSS v3 and its dependencies
npm install tailwindcss@3.3.3 postcss autoprefixer --save-dev

# Create a standard Tailwind config
npx tailwindcss init -p

echo "Tailwind CSS v3 installed successfully!"
