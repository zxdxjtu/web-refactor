#!/bin/bash

# Smart Web Refactor Website Deployment Script for AWS EC2
# This script builds and deploys the promotional website to AWS EC2

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="smart-web-refactor"
BUILD_DIR="webpage/dist"
REMOTE_USER="ubuntu"
REMOTE_HOST=""  # Set your EC2 instance IP
REMOTE_PATH="/var/www/smart-web-refactor"
NGINX_CONFIG="/etc/nginx/sites-available/smart-web-refactor"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if EC2 host is configured
if [ -z "$REMOTE_HOST" ]; then
    print_error "Please set REMOTE_HOST variable with your EC2 instance IP address"
    echo "Edit this script and set REMOTE_HOST=\"your-ec2-ip\""
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "webpage" ]; then
    print_error "Please run this script from the root directory of the web-refactor project"
    exit 1
fi

print_status "Starting deployment process for Smart Web Refactor website..."

# Step 1: Build the website
print_status "Building the website..."
cd webpage

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build the project
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

cd ..

print_status "Build completed successfully!"

# Step 2: Create deployment archive
print_status "Creating deployment archive..."
cd webpage
tar -czf ../website-deploy.tar.gz dist/
cd ..

# Step 3: Upload to EC2
print_status "Uploading to EC2 instance..."
scp website-deploy.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:/tmp/

# Step 4: Deploy on EC2
print_status "Deploying on EC2..."

ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
set -e

echo "Setting up deployment environment..."

# Create website directory if it doesn't exist
sudo mkdir -p /var/www/smart-web-refactor

# Extract the uploaded files
cd /tmp
tar -xzf website-deploy.tar.gz

# Remove old files and copy new ones
sudo rm -rf /var/www/smart-web-refactor/*
sudo cp -r dist/* /var/www/smart-web-refactor/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/smart-web-refactor
sudo chmod -R 755 /var/www/smart-web-refactor

# Clean up
rm -f website-deploy.tar.gz
rm -rf dist/

echo "Files deployed successfully!"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Create nginx configuration if it doesn't exist
if [ ! -f /etc/nginx/sites-available/smart-web-refactor ]; then
    echo "Creating nginx configuration..."
    
    sudo tee /etc/nginx/sites-available/smart-web-refactor > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain if you have one
    
    root /var/www/smart-web-refactor;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/smart-web-refactor /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Deployment completed on EC2!"
ENDSSH

# Clean up local files
print_status "Cleaning up local files..."
rm -f website-deploy.tar.gz

print_status "Deployment completed successfully!"
print_status "Website is now available at: http://${REMOTE_HOST}"

# Optional: Set up SSL with Let's Encrypt
print_warning "To enable HTTPS, run the following commands on your EC2 instance:"
echo "1. sudo apt-get install -y certbot python3-certbot-nginx"
echo "2. sudo certbot --nginx -d your-domain.com"

# Print additional instructions
echo ""
print_status "Additional setup instructions:"
echo "1. Make sure your EC2 security group allows HTTP (port 80) and HTTPS (port 443) traffic"
echo "2. If you have a domain, update the nginx configuration with your domain name"
echo "3. Consider setting up a CloudFront distribution for better performance"
echo "4. Monitor your EC2 instance and set up alerts as needed"