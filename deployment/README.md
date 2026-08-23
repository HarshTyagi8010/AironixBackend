# Backend & Production Deployment Infrastructure

This directory contains production deployment configurations and infrastructure templates for **Aditya Air Compressors / Aironix Solutions**.

---

## Architecture Overview

In the 3-repository architecture, services are deployed independently:
- **Frontend Storefront** (`aironix-frontend`): Deployed on **Vercel** (`https://www.aironixsolutions.com`).
- **Admin Control Panel** (`aironix-admin`): Deployed on **Vercel** (`https://admin.aironixsolutions.com`).
- **Backend API** (`aironix-backend`): Deployed on **Render** or **AWS EC2 / VPS** (`https://api.aironixsolutions.com`).

---

## Directory Contents

```
backend/deployment/
├── nginx/
│   └── aironixsolutions.conf   # Full Nginx reverse proxy configuration (SSL, gzip, security headers)
├── scripts/
│   ├── deploy.sh               # Zero-downtime rolling deployment script
│   ├── backup-db.sh            # Automated MongoDB Atlas & local data backup script (14-day retention)
│   └── health-check.sh         # Multi-endpoint health monitor script
├── docker-compose.yml          # Multi-container orchestration reference (for side-by-side local/staging)
└── ecosystem.config.js         # PM2 process manager configuration for EC2 / VPS hosting
```

---

## Deployment Methods for Backend

### 1. Render / PaaS Deployment
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables: See `backend/.env.example`

### 2. Standalone Docker Container
To build and run the backend Docker container independently:
```bash
cd backend
docker build -t aironix-backend .
docker run -d -p 5000:5000 --env-file .env aironix-backend
```

### 3. Nginx Reverse Proxy (AWS EC2 / Ubuntu VPS)
Copy `backend/deployment/nginx/aironixsolutions.conf` to `/etc/nginx/sites-available/aironixsolutions.conf` and enable it:
```bash
sudo ln -s /etc/nginx/sites-available/aironixsolutions.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. PM2 Process Manager
Run the backend with PM2 on a VPS:
```bash
cd backend
pm2 start deployment/ecosystem.config.js --only aac-backend --env production
```

### 5. Multi-Container Compose Reference (`docker-compose.yml`)
When running in an environment where `frontend`, `admin`, and `backend` repositories are cloned side-by-side:
```bash
docker compose -f backend/deployment/docker-compose.yml up -d --build
```
