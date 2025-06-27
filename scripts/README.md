# Smart Web Refactor Website Deployment Scripts

This directory contains deployment scripts for the Smart Web Refactor promotional website.

## Available Scripts

### 1. `preview-local.sh` - Local Development
```bash
./scripts/preview-local.sh
```
- Starts a local development server
- Available at http://localhost:5173
- Hot reload enabled for development

### 2. `deploy.sh` - Deploy to AWS EC2
```bash
# First, edit the script and set your EC2 IP
./scripts/deploy.sh
```
- Deploys to an AWS EC2 instance
- Installs and configures nginx automatically
- Best for: Full control, custom configurations

### 3. `deploy-s3.sh` - Deploy to AWS S3 + CloudFront
```bash
# First, edit the script and set your S3 bucket name
./scripts/deploy-s3.sh
```
- Deploys to AWS S3 static hosting
- Optional CloudFront CDN integration
- Best for: Cost-effective, scalable hosting

## Quick Start

### Option 1: AWS S3 (Recommended for most users)

1. **Install AWS CLI**
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. **Configure AWS credentials**
   ```bash
   aws configure
   ```

3. **Edit deploy script**
   ```bash
   # Edit scripts/deploy-s3.sh
   S3_BUCKET_NAME="your-unique-bucket-name"
   ```

4. **Deploy**
   ```bash
   ./scripts/deploy-s3.sh
   ```

### Option 2: AWS EC2

1. **Launch EC2 instance**
   - Ubuntu 22.04 LTS
   - t2.micro (free tier)
   - Open ports 80, 443, 22

2. **Edit deploy script**
   ```bash
   # Edit scripts/deploy.sh
   REMOTE_HOST="your-ec2-ip"
   ```

3. **Deploy**
   ```bash
   ./scripts/deploy.sh
   ```

## Website Structure

The website is a React single-page application built with:
- Vite (build tool)
- React + TypeScript
- Tailwind CSS
- shadcn/ui components

## Features

- 🎨 Modern, responsive design
- 🚀 Optimized performance
- 🌐 Bilingual support (Chinese primary)
- 📱 Mobile-friendly
- ♿ Accessible

## Customization

### Update Content
Edit `webpage/src/pages/Index.tsx` to modify:
- Hero section text
- Feature descriptions
- Use cases
- Statistics

### Change Styling
- Global styles: `webpage/src/index.css`
- Component styles: Using Tailwind CSS classes
- Theme colors: `webpage/tailwind.config.ts`

### Add Pages
1. Create new component in `webpage/src/pages/`
2. Update routing in `webpage/src/App.tsx`

## Deployment Comparison

| Feature | S3 + CloudFront | EC2 |
|---------|----------------|------|
| Cost | $0.50-$5/month | $8-$20/month |
| Setup | Easy | Moderate |
| Scalability | Automatic | Manual |
| HTTPS | Free with CloudFront | Free with Let's Encrypt |
| Custom domain | Yes | Yes |
| Server-side features | No | Yes |

## Troubleshooting

### Build Errors
```bash
cd webpage
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Fails
- Check AWS credentials: `aws sts get-caller-identity`
- Verify S3 bucket name is unique
- Ensure EC2 security groups are configured

### Website Not Loading
- S3: Check bucket policy and static hosting settings
- EC2: Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

## Best Practices

1. **Use version control** - Commit changes before deploying
2. **Test locally first** - Use preview-local.sh
3. **Monitor costs** - Set up AWS billing alerts
4. **Enable caching** - Use CloudFront for better performance
5. **Secure your site** - Enable HTTPS, set security headers

## Support

For issues or questions:
- [GitHub Issues](https://github.com/zxdxjtu/web-refactor/issues)
- [Deployment Guide](./DEPLOYMENT.md) for detailed instructions