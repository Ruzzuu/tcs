# Environment Recovery Notes

File ini menjelaskan dari mana mengambil ulang API key/credential jika laptop lama hilang.

## MongoDB

Env:

```env
MONGODB_URI=
```

Ambil dari MongoDB Atlas:

1. Login MongoDB Atlas.
2. Pilih project/cluster aplikasi.
3. Klik Connect.
4. Pilih Drivers.
5. Copy connection string.
6. Ganti username/password dan database sesuai aplikasi.
7. Simpan ke Vercel Environment Variables dan `.env.local` lokal.

Jika password database user lupa:

1. Buka Database Access.
2. Reset password user lama atau buat user baru.
3. Update `MONGODB_URI` di Vercel.
4. Redeploy aplikasi.

## Cloudinary

Env:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Ambil dari Cloudinary Dashboard bagian API Keys.

Jika akun Cloudinary lama masih ada, foto lama biasanya tetap aman karena aplikasi menyimpan `url` dan `publicId` di MongoDB.

## Admin/JWT

Env:

```env
JWT_SECRET=
ADMIN_RECOVERY_KEY=
ADMIN_SEED_KEY=
```

`JWT_SECRET` boleh dibuat baru, tetapi semua session login lama akan logout.

`ADMIN_SEED_KEY` dipakai untuk membuat admin pertama jika database masih kosong.

`ADMIN_RECOVERY_KEY` dipakai untuk recovery admin sesuai fitur aplikasi.

## Vercel

Env produksi harus disimpan di:

```txt
Vercel Project > Settings > Environment Variables
```

Setelah env diubah, lakukan redeploy.

## Jangan lakukan

- Jangan taruh secret asli di `.env.example`.
- Jangan kirim `.env.local` ke GitHub/WhatsApp/public chat.
- Jangan jalankan restore ke production sebelum backup kondisi terbaru.
