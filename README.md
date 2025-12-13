# PersonelPro - Cloudflare Workers + React

Personel Yönetim Sistemi - Cloudflare Workers backend ve React frontend.

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
# Backend
npm install

# Frontend
cd frontend && npm install
```

### 2. Lokal Geliştirme

```bash
# D1 database oluştur
npx wrangler d1 execute personelpro-db --local --file=./schema.sql

# Backend başlat
npm run dev

# Frontend başlat (ayrı terminal)
cd frontend && npm run dev
```

### 3. Cloudflare'e Deploy

```bash
# D1 database oluştur
npx wrangler d1 create personelpro-db

# wrangler.toml'daki database_id'yi güncelle

# Schema uygula
npx wrangler d1 execute personelpro-db --remote --file=./schema.sql

# Frontend build
cd frontend && npm run build

# Deploy
npx wrangler deploy
```

## Varsayılan Giriş

- **Kullanıcı:** admin
- **Şifre:** admin123
