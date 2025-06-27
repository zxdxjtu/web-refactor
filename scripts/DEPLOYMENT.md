# Smart Web Refactor Website Deployment Guide

This guide explains how to deploy the Smart Web Refactor promotional website to AWS EC2.

## Prerequisites

### Local Requirements
- Node.js (v18 or higher)
- npm or yarn
- SSH key pair for EC2 access
- Git

### AWS Requirements
- AWS EC2 instance (Ubuntu 20.04 or 22.04 recommended)
- Security group with ports 80 (HTTP) and 443 (HTTPS) open
- Elastic IP (optional but recommended)
- Domain name (optional)

## Quick Start

1. **Configure the deployment script**
   ```bash
   # Edit scripts/deploy.sh and set your EC2 IP
   REMOTE_HOST="your-ec2-instance-ip"
   ```

2. **Run the deployment**
   ```bash
   ./scripts/deploy.sh
   ```

## Detailed Setup

### 1. Launch EC2 Instance

1. Go to AWS EC2 Console
2. Launch a new instance:
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: t2.micro (free tier eligible)
   - Key pair: Create or select existing
   - Security group rules:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere

3. Note the public IP address

### 2. Initial Server Setup

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

Update the system:
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 3. Configure Deployment Script

Edit `scripts/deploy.sh`:
```bash
REMOTE_HOST="your-ec2-ip"  # Replace with your EC2 public IP
```

### 4. Run Deployment

From the project root directory:
```bash
./scripts/deploy.sh
```

The script will:
- Build the React website
- Upload files to EC2
- Install nginx (if needed)
- Configure nginx for the website
- Set proper permissions

### 5. Domain Setup (Optional)

If you have a domain:

1. **Update nginx configuration on EC2:**
   ```bash
   sudo nano /etc/nginx/sites-available/smart-web-refactor
   ```
   
   Change:
   ```nginx
   server_name _;
   ```
   
   To:
   ```nginx
   server_name your-domain.com www.your-domain.com;
   ```

2. **Configure DNS:**
   - Add an A record pointing to your EC2 IP
   - Add a CNAME record for www (if needed)

3. **Enable SSL with Let's Encrypt:**
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Build the Website
```bash
cd webpage
npm install
npm run build
```

### 2. Upload to EC2
```bash
# Create archive
tar -czf website.tar.gz -C webpage/dist .

# Upload
scp website.tar.gz ubuntu@your-ec2-ip:/tmp/

# Extract on server
ssh ubuntu@your-ec2-ip
cd /tmp
sudo mkdir -p /var/www/smart-web-refactor
sudo tar -xzf website.tar.gz -C /var/www/smart-web-refactor
sudo chown -R www-data:www-data /var/www/smart-web-refactor
```

### 3. Configure Nginx
```bash
# Install nginx
sudo apt-get install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/smart-web-refactor
```

Add the configuration from the deploy script.

### 4. Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/smart-web-refactor /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Maintenance

### Update the Website
Simply run the deploy script again:
```bash
./scripts/deploy.sh
```

### View Logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo systemctl restart nginx
```

## Performance Optimization

### 1. Enable Gzip Compression
Already included in the nginx configuration.

### 2. CloudFront CDN (Optional)
1. Create a CloudFront distribution
2. Set origin to your EC2 instance
3. Configure caching behaviors
4. Update DNS to point to CloudFront

### 3. Enable HTTP/2
```bash
# Edit nginx config and add http2
listen 443 ssl http2;
```

## Troubleshooting

### Website Not Loading
1. Check EC2 security group rules
2. Verify nginx is running: `sudo systemctl status nginx`
3. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### 502 Bad Gateway
Usually means nginx can't find the files:
```bash
# Check file permissions
ls -la /var/www/smart-web-refactor/

# Check nginx user
ps aux | grep nginx
```

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```

2. **Configure firewall:**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

3. **Set up fail2ban:**
   ```bash
   sudo apt-get install fail2ban
   ```

4. **Regular backups:**
   - Use AWS snapshots for EC2
   - Backup nginx configurations

## Cost Optimization

- Use t2.micro for low traffic (free tier)
- Consider using S3 + CloudFront for static hosting
- Set up billing alerts in AWS

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/zxdxjtu/web-refactor/issues)
- Review nginx documentation
- AWS EC2 documentation