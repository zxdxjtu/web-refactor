#!/bin/bash

# Smart Web Refactor Website Deployment Script for AWS S3 + CloudFront
# This script builds and deploys the promotional website to AWS S3

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - EDIT THESE VALUES
S3_BUCKET_NAME=""  # e.g., "smart-web-refactor-website"
AWS_PROFILE="default"  # AWS CLI profile to use
CLOUDFRONT_DISTRIBUTION_ID=""  # Optional: for cache invalidation

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

# Check if S3 bucket is configured
if [ -z "$S3_BUCKET_NAME" ]; then
    print_error "Please set S3_BUCKET_NAME variable"
    echo "Edit this script and set S3_BUCKET_NAME=\"your-bucket-name\""
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first:"
    echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "webpage" ]; then
    print_error "Please run this script from the root directory of the web-refactor project"
    exit 1
fi

print_status "Starting S3 deployment for Smart Web Refactor website..."

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

print_status "Build completed successfully!"

# Step 2: Check if S3 bucket exists
print_status "Checking S3 bucket..."
if ! aws s3 ls "s3://${S3_BUCKET_NAME}" --profile ${AWS_PROFILE} 2>&1 | grep -q 'NoSuchBucket'; then
    print_status "S3 bucket exists"
else
    print_status "Creating S3 bucket..."
    aws s3 mb "s3://${S3_BUCKET_NAME}" --profile ${AWS_PROFILE}
    
    # Enable static website hosting
    aws s3 website "s3://${S3_BUCKET_NAME}" \
        --index-document index.html \
        --error-document index.html \
        --profile ${AWS_PROFILE}
    
    # Set bucket policy for public access
    cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy \
        --bucket ${S3_BUCKET_NAME} \
        --policy file:///tmp/bucket-policy.json \
        --profile ${AWS_PROFILE}
    
    rm /tmp/bucket-policy.json
fi

# Step 3: Sync files to S3
print_status "Uploading files to S3..."

# Sync with proper content types and cache headers
aws s3 sync dist/ "s3://${S3_BUCKET_NAME}/" \
    --profile ${AWS_PROFILE} \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html" \
    --exclude "*.json"

# Upload index.html and JSON files with shorter cache
aws s3 cp dist/index.html "s3://${S3_BUCKET_NAME}/" \
    --profile ${AWS_PROFILE} \
    --cache-control "public, max-age=3600" \
    --content-type "text/html"

aws s3 sync dist/ "s3://${S3_BUCKET_NAME}/" \
    --profile ${AWS_PROFILE} \
    --exclude "*" \
    --include "*.json" \
    --cache-control "public, max-age=3600" \
    --content-type "application/json"

print_status "Files uploaded successfully!"

# Step 4: Invalidate CloudFront cache (if configured)
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    print_status "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
        --paths "/*" \
        --profile ${AWS_PROFILE}
fi

# Get the website URL
WEBSITE_URL="http://${S3_BUCKET_NAME}.s3-website-$(aws configure get region --profile ${AWS_PROFILE}).amazonaws.com"

cd ..

print_status "Deployment completed successfully!"
print_status "Website URL: ${WEBSITE_URL}"

# Print next steps
echo ""
print_warning "Next steps for production deployment:"
echo "1. Set up CloudFront distribution for HTTPS and better performance"
echo "2. Configure a custom domain with Route 53"
echo "3. Enable CloudFront compression"
echo "4. Set up monitoring with CloudWatch"

# CloudFront setup instructions
echo ""
print_status "To set up CloudFront:"
echo "1. Go to AWS CloudFront Console"
echo "2. Create Distribution -> Web"
echo "3. Origin Domain: ${S3_BUCKET_NAME}.s3-website-$(aws configure get region --profile ${AWS_PROFILE}).amazonaws.com"
echo "4. Viewer Protocol Policy: Redirect HTTP to HTTPS"
echo "5. Compress Objects Automatically: Yes"
echo "6. Default Root Object: index.html"
echo "7. Create custom error pages for 404 -> /index.html (for SPA routing)"