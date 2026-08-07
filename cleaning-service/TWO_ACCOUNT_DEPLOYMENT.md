# Two-account deployment

Aplikasi memakai satu codebase dan dua Vercel project/deployment:

| Deployment | Tenant | Database | Cloudinary folder |
| --- | --- | --- | --- |
| Teman Cuci Sepatu | `tcs` | `cleaning-service` | `cleaning-app` |
| Rekan Cuci Sepatu | `rekan` | `cleaning-service-rekan` | `cleaning-app/rekan-cuci-sepatu` |

UI dan fitur berasal dari kode yang sama. Logo, nama, nota, harga, database, dan admin ditentukan oleh environment deployment.

## File konfigurasi

Template non-secret:

```txt
deploy/tcs.env.example
deploy/rekan.env.example
```

File lokal berisi secret dan tidak boleh di-commit:

```txt
.env.local
.env.rekan.local
```

Next.js membaca `.env.local`. Untuk mengetes Rekan secara lokal, simpan backup env TCS lalu salin env Rekan menjadi `.env.local`. Jangan commit hasil salinan.

## Vercel project TCS

Gunakan root directory:

```txt
cleaning-service
```

Set env berdasarkan `deploy/tcs.env.example`. Existing production tetap menggunakan database `cleaning-service` dan folder Cloudinary `cleaning-app`.

## Vercel project Rekan

Buat project Vercel baru dari repository dan branch yang sama. Gunakan root directory:

```txt
cleaning-service
```

Set env berdasarkan `deploy/rekan.env.example`. Template sengaja memakai `ADMIN_SEED_ENABLED=false` agar endpoint pembuatan admin tertutup secara default.

Env penting Rekan:

```env
NEXT_PUBLIC_TENANT_ID=rekan
MONGODB_DB_NAME=cleaning-service-rekan
CLOUDINARY_BASE_FOLDER=cleaning-app/rekan-cuci-sepatu
NEXT_PUBLIC_FEATURE_MULTI_ITEM=true
NEXT_PUBLIC_FEATURE_AUTO_MERGE=true
```

Gunakan JWT, recovery key, dan seed key yang berbeda dari TCS.

## Harga Rekan

Harga Rekan dapat diatur melalui Vercel env `NEXT_PUBLIC_SERVICE_PRICE_OVERRIDES` tanpa mengubah kode.

Contoh:

```env
NEXT_PUBLIC_SERVICE_PRICE_OVERRIDES={"Deepclean":40000,"Deepclean_Sandal":30000,"sewing":45000}
```

Key layanan tersedia di `src/config/tenant.ts`. Harga yang tidak dicantumkan akan memakai katalog default.

Karena variable ini diawali `NEXT_PUBLIC_`, harga bukan secret dan akan dimasukkan ke bundle browser. Itu sesuai karena harga juga tampil kepada customer.

Setelah mengubah harga, redeploy project Rekan.

## Admin Rekan

Database Rekan mulai kosong, sehingga admin pertama dibuat sekali melalui:

```txt
/admin/seed
```

Prosedur:

1. Deploy Rekan pertama kali dengan `ADMIN_SEED_ENABLED=false` dan pastikan tenant/database/folder sudah benar.
2. Saat siap membuat admin, ubah `ADMIN_SEED_ENABLED=true` hanya di project Rekan lalu redeploy.
3. Segera buka `/admin/seed` dan isi seed key, username, email, serta password Rekan.
4. Setelah berhasil, langsung ubah `ADMIN_SEED_ENABLED=false` dan redeploy lagi.
5. Verifikasi endpoint seed sudah merespons `403`.

Jangan memakai username/password TCS untuk Rekan.

## Cloudinary

Kedua deployment boleh memakai akun Cloudinary yang sama. Upload baru dipisahkan berdasarkan folder tenant. Kode mengikat folder ke tenant aktif dan akan menolak startup/build jika `CLOUDINARY_BASE_FOLDER` tidak cocok, serta menolak penghapusan aset di luar folder tenant aktif.

## Rollout aman

1. Backup penuh production TCS.
2. Sebelum deploy kode, tambahkan env tenant/database/folder eksplisit ke project TCS; kode akan menolak konfigurasi yang tidak cocok.
3. Verifikasi login, order, report, nota, upload, dan delete foto TCS.
4. Baru buat deployment Rekan.
5. Set harga Rekan.
6. Seed admin Rekan sekali.
7. Nonaktifkan seed.
8. Verifikasi bahwa order TCS tidak terlihat di Rekan dan sebaliknya.

## Secret yang pernah terkirim

Credential yang pernah dikirim melalui chat harus dianggap terekspos. Setelah kedua deployment berhasil diverifikasi, rotasi:

- password database MongoDB Atlas;
- Cloudinary API secret;
- JWT secret;
- admin recovery key;
- admin seed key.

Update Vercel Environment Variables setelah rotasi lalu redeploy.
