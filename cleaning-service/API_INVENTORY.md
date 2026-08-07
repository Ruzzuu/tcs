# API Inventory

API route yang ada di aplikasi.

## Auth/Admin

```txt
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/seed
POST /api/auth/recovery
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify
POST /api/auth/verify-password
GET  /api/auth/debug
```

## Orders

```txt
GET/POST /api/orders
GET/PATCH/DELETE /api/orders/[id]
POST /api/orders/[id]/complete
GET/POST /api/orders/[id]/items
PATCH/DELETE /api/orders/[id]/items/[itemId]
POST/DELETE /api/orders/[id]/photos
POST /api/orders/backfill-rekap
```

## Upload

```txt
POST /api/upload
```

Membutuhkan Cloudinary env:

```env
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

## Admin utilities

```txt
GET/POST /api/admin/phones
POST /api/admin/migrate-phones
```

## Reports/Dashboard

```txt
GET /api/dashboard
GET /api/income/monthly
GET /api/income/weekly
```

## Environment check

```txt
GET /api/check-env
```

Endpoint ini hanya menampilkan beberapa env publik/status dasar, bukan secret.
