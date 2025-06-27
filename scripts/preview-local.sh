#!/bin/bash

# Local preview script for Smart Web Refactor website

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting local preview server...${NC}"

# Check if we're in the right directory
if [ ! -d "webpage" ]; then
    echo -e "${RED}Please run this script from the root directory of the web-refactor project${NC}"
    exit 1
fi

cd webpage

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${GREEN}Website will be available at: http://localhost:5173${NC}"
echo ""
echo "Press Ctrl+C to stop the server"

npm run dev