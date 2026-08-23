# Aditya Air Compressors — Express REST API

Production Express REST API backend for [Aditya Air Compressors](https://api.aironixsolutions.com).

## 🚀 Features
- **API Versioning (`/api/v1/*`)**: Structured modular endpoints for catalog, inquiries, assets, and admin operations.
- **MongoDB Atlas Persistence**: Mongoose schemas with indexing, atomic writes, and idempotent startup seeding.
- **Cloudinary Media Pipeline**: Direct-to-cloud image upload with safe raster-only validation (JPEG, PNG, WebP) and strict origin checks.
- **Security & Rate Limiting**: Helmet security headers, brute-force auth rate limiting (10 / 15m), and inquiry spam protection (15 / hr).
- **Automated Regression Suite**: 9/9 automated test suite covering CRUD, persistence, validation, and auth.

---

## 🛠️ Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Run development server
npm run dev

# 4. Run test suite
npm test
```

The API will start at `http://localhost:5000`.

---

## ⚙️ Production Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server Port (Default: 5000) | No |
| `MONGODB_URI` | MongoDB Atlas Connection String | **Yes** |
| `JWT_SECRET` | Secret key for signing admin JWTs | **Yes** |
| `ADMIN_EMAIL` | Administrator login email | **Yes** |
| `ADMIN_PASSWORD` | Administrator login password | **Yes** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | **Yes** |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | **Yes** |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | **Yes** |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS domains | **Yes** |

---

## 🚢 Deployment (Render / AWS EC2)

### Render
1. Create a **Web Service** pointing to the GitHub repo `aditya-air-compressors-backend`.
2. Build Command: `npm install`.
3. Start Command: `npm start`.
4. Configure all environment variables listed above.
5. Add custom domain: `api.aironixsolutions.com`.

### Docker (AWS EC2)
```bash
docker build -t aditya-backend .
docker run -d -p 5000:5000 --env-file .env --name aditya-backend aditya-backend
```
