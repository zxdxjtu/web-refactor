#!/bin/bash

# Smart Web Refactor Website Deployment Script
# This script builds and deploys the website to production

set -e  # Exit on error

echo "🚀 Starting deployment of Smart Web Refactor website..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/ec2-user/web-refactor/webpage"
NGINX_CONF_DIR="/etc/nginx/conf.d"
DOMAIN="webrefactor.vibesite.fun"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command_exists npm; then
    echo -e "${RED}npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

if ! command_exists nginx; then
    echo -e "${RED}nginx is not installed. Please install nginx first.${NC}"
    exit 1
fi

# Step 2: Build the website
echo -e "${GREEN}Building the website...${NC}"
cd "$PROJECT_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the project
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Build failed! dist directory not created.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Website built successfully${NC}"

# Step 3: Deploy nginx configuration (requires sudo)
echo -e "${YELLOW}Deploying nginx configuration...${NC}"

# Copy nginx config to conf.d
sudo cp "$PROJECT_DIR/nginx-webrefactor.conf" "$NGINX_CONF_DIR/webrefactor.conf"

# Test nginx configuration
echo "Testing nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}Nginx configuration test failed!${NC}"
    exit 1
fi

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"

# Step 4: Setup SSL certificate if not exists
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo -e "${YELLOW}SSL certificate not found. Setting up Let's Encrypt...${NC}"
    echo -e "${YELLOW}Note: Make sure DNS A record for $DOMAIN points to this server (54.177.157.100)${NC}"
    
    read -p "Has the DNS record been configured? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@vibesite.fun
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ SSL certificate obtained successfully${NC}"
            # Update nginx config to use SSL
            sudo sed -i 's/# ssl_certificate/ssl_certificate/g' "$NGINX_CONF_DIR/webrefactor.conf"
            sudo systemctl reload nginx
        else
            echo -e "${RED}Failed to obtain SSL certificate. The site will be accessible via HTTP only.${NC}"
        fi
    else
        echo -e "${YELLOW}Skipping SSL setup. The site will be accessible via HTTP only.${NC}"
        echo -e "${YELLOW}Run 'sudo certbot --nginx -d $DOMAIN' later to enable HTTPS.${NC}"
    fi
else
    echo -e "${GREEN}✓ SSL certificate already exists${NC}"
fi

# Step 5: Set proper permissions
echo -e "${YELLOW}Setting file permissions...${NC}"
sudo chown -R ec2-user:ec2-user "$PROJECT_DIR/dist"
sudo chmod -R 755 "$PROJECT_DIR/dist"

# Done!
echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${GREEN}Your website should now be accessible at:${NC}"
echo -e "${GREEN}  HTTP:  http://$DOMAIN${NC}"
echo -e "${GREEN}  HTTPS: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Important notes:${NC}"
echo "1. Make sure DNS A record for $DOMAIN points to 54.177.157.100"
echo "2. If the site is not accessible, check:"
echo "   - DNS propagation (can take up to 48 hours)"
echo "   - Firewall rules (port 80 and 443 should be open)"
echo "   - Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "To update the website in the future, simply run: ./deploy.sh"