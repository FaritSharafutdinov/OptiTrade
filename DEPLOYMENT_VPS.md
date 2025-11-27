# Deploying OptiTrade on VPS

This guide provides step-by-step instructions for deploying OptiTrade on a VPS (Virtual Private Server) running Linux (Ubuntu/Debian recommended).

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- SSH access to your VPS
- Domain name (optional, for SSL)
- At least 2GB RAM, 2 CPU cores, 20GB storage
- Python 3.9+ and Node.js 18+ installed

## Step 1: Initial VPS Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Essential Tools

```bash
sudo apt install -y git curl wget build-essential
```

### 1.3 Install Python 3.9+ and pip

```bash
sudo apt install -y python3 python3-pip python3-venv
python3 --version  # Should be 3.9+
```

### 1.4 Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be 18+
npm --version
```

### 1.5 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE optitrade;
CREATE USER optitrade WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE optitrade TO optitrade;
ALTER USER optitrade CREATEDB;
\q
EOF
```

### 1.6 Install Nginx (for reverse proxy)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.7 Install Certbot (for SSL certificates)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: Clone and Setup Project

### 2.1 Clone Repository

```bash
cd /opt
sudo git clone https://github.com/yourusername/optitrade.git
sudo chown -R $USER:$USER /opt/optitrade
cd /opt/optitrade
```

### 2.2 Create Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.3 Create Environment File

```bash
nano .env
```

Add the following (update with your values):

```env
# Admin API Key (change this!)
ADMIN_API_KEY=your_secure_admin_api_key_here

# Model Service
MODEL_SERVICE_URL=http://127.0.0.1:8001
MODEL_TYPE=ppo
USE_RL_MODEL=true

# Database
DATABASE_URL=postgresql://optitrade:your_secure_password_here@localhost:5432/optitrade

# Exchange API Keys (for live trading)
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Optional: Other exchanges
BYBIT_API_KEY=
BYBIT_API_SECRET=
```

Save and exit (Ctrl+X, Y, Enter).

### 2.4 Setup Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 2.5 Configure Frontend Environment

```bash
nano frontend/.env.production
```

Add:

```env
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_ADMIN_API_KEY=your_secure_admin_api_key_here
```

## Step 3: Create Systemd Services

### 3.1 Create Backend Service

```bash
sudo nano /etc/systemd/system/optitrade-backend.service
```

Add:

```ini
[Unit]
Description=OptiTrade Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=your_username
WorkingDirectory=/opt/optitrade
Environment="PATH=/opt/optitrade/.venv/bin"
ExecStart=/opt/optitrade/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3.2 Create Model Service

```bash
sudo nano /etc/systemd/system/optitrade-model.service
```

Add:

```ini
[Unit]
Description=OptiTrade Model Service
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/opt/optitrade
Environment="PATH=/opt/optitrade/.venv/bin"
Environment="MODEL_TYPE=ppo"
Environment="USE_RL_MODEL=true"
ExecStart=/opt/optitrade/.venv/bin/uvicorn model_service.main:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Replace `your_username` with your actual VPS username!

### 3.3 Enable and Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable optitrade-backend
sudo systemctl enable optitrade-model
sudo systemctl start optitrade-backend
sudo systemctl start optitrade-model

# Check status
sudo systemctl status optitrade-backend
sudo systemctl status optitrade-model
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/optitrade
```

Add:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (React App)
    location / {
        root /opt/optitrade/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Model Service (optional, if needed from frontend)
    location /model-service/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /opt/optitrade/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 Enable Site and Test Configuration

```bash
sudo ln -s /etc/nginx/sites-available/optitrade /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 4.3 Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically update your Nginx configuration.

## Step 5: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 6: Setup Logging

### 6.1 Create Log Directories

```bash
sudo mkdir -p /var/log/optitrade
sudo chown your_username:your_username /var/log/optitrade
```

### 6.2 Update Systemd Services (Optional)

Add to both service files in `[Service]` section:

```ini
StandardOutput=append:/var/log/optitrade/backend.log
StandardError=append:/var/log/optitrade/backend.error.log
```

Then reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart optitrade-backend
sudo systemctl restart optitrade-model
```

## Step 7: Monitoring and Maintenance

### 7.1 View Logs

```bash
# Backend logs
sudo journalctl -u optitrade-backend -f

# Model service logs
sudo journalctl -u optitrade-model -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 7.2 Restart Services

```bash
sudo systemctl restart optitrade-backend
sudo systemctl restart optitrade-model
sudo systemctl restart nginx
```

### 7.3 Update Application

```bash
cd /opt/optitrade
git pull
source .venv/bin/activate
pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
sudo systemctl restart optitrade-backend
sudo systemctl restart optitrade-model
```

## Step 8: Security Recommendations

### 8.1 Secure Database

- Use strong passwords
- Restrict PostgreSQL to localhost only
- Regular backups

```bash
# Backup database
sudo -u postgres pg_dump optitrade > backup_$(date +%Y%m%d).sql

# Restore database
sudo -u postgres psql optitrade < backup_YYYYMMDD.sql
```

### 8.2 Enable Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 8.3 Set Up Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Step 9: Performance Optimization

### 9.1 Use Gunicorn for Production (Recommended)

Install Gunicorn:

```bash
pip install gunicorn
```

Update backend service:

```ini
ExecStart=/opt/optitrade/.venv/bin/gunicorn backend.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/optitrade/backend_access.log \
    --error-logfile /var/log/optitrade/backend_error.log
```

### 9.2 Enable Nginx Caching

Add to Nginx config:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    # ... rest of proxy config
}
```

## Troubleshooting

### Services won't start

```bash
sudo journalctl -u optitrade-backend -n 50
sudo journalctl -u optitrade-model -n 50
```

### Database connection issues

```bash
sudo -u postgres psql -c "SELECT version();"
sudo systemctl status postgresql
```

### Port already in use

```bash
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :8001
```

### Nginx errors

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## Quick Reference

```bash
# Start all services
sudo systemctl start optitrade-backend optitrade-model nginx

# Stop all services
sudo systemctl stop optitrade-backend optitrade-model nginx

# Check status
sudo systemctl status optitrade-backend optitrade-model nginx

# View logs
sudo journalctl -u optitrade-backend -f
sudo journalctl -u optitrade-model -f

# Restart after code changes
cd /opt/optitrade && git pull && source .venv/bin/activate && pip install -r requirements.txt && cd frontend && npm install && npm run build && cd .. && sudo systemctl restart optitrade-backend optitrade-model
```

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Systemd Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

## Notes

- Replace `yourdomain.com` with your actual domain
- Replace `your_username` with your VPS username
- Use strong, unique passwords for all services
- Keep your SSL certificates updated (Certbot does this automatically)
- Regular backups are essential
- Monitor disk space and logs regularly

