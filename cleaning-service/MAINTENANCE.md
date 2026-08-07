# Maintenance Guide - Teman Cuci Sepatu

Panduan ini untuk menjaga aplikasi produksi tetap berjalan tanpa kehilangan data.

## Prinsip utama

1. Jangan deploy perubahan besar tanpa backup database terlebih dahulu.
2. Jangan commit file `.env.local`, credential, atau backup data customer ke GitHub.
3. Jangan menjalankan script `restore`, `fix`, atau `migrate` ke database produksi sebelum dry-run/backup.
4. Simpan credential produksi di Vercel Environment Variables, bukan di file project.

## Layanan yang wajib dijaga

| Fungsi | Layanan | Env terkait |
| --- | --- | --- |
| Database order/admin/phone | MongoDB / MongoDB Atlas | `MONGODB_URI` |
| Login admin/session | JWT lokal aplikasi | `JWT_SECRET` |
| Seed/recovery admin | Secret lokal aplikasi | `ADMIN_SEED_KEY`, `ADMIN_RECOVERY_KEY` |
| Upload foto order/nota | Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| URL reset password | Vercel/domain aplikasi | `NEXT_PUBLIC_APP_URL` |
| Feature flags | Next.js public env | `NEXT_PUBLIC_FEATURE_MULTI_ITEM`, `NEXT_PUBLIC_FEATURE_AUTO_MERGE` |

## Checklist harian

- Buka aplikasi produksi dan cek halaman form bisa diakses.
- Login admin dan cek daftar order tampil.
- Buat 1 order test kecil jika perlu, lalu hapus/selesaikan sesuai SOP.
- Cek upload foto jika fitur foto sedang dipakai.
- Cek dashboard Vercel: pastikan tidak ada error function berulang.
- Cek MongoDB Atlas: cluster aktif dan storage belum penuh.
- Cek Cloudinary: quota storage/bandwidth belum habis.

## Checklist sebelum deploy

Dijalankan di lokal:

```bash
cd cleaning-service
npm install
npm run lint
npm run build
npm run backup-database
```

Jika `npm run build` atau `npm run lint` gagal, jangan deploy dulu.

## Backup database

Backup manual:

```bash
cd cleaning-service
npm run backup-database
```

Output akan dibuat di:

```txt
backups/orders-backup-<timestamp>.json
backups/phones-backup-<timestamp>.json
```

Catatan penting:

- File backup berisi data customer, jangan commit ke GitHub.
- Simpan backup di tempat aman seperti Google Drive private, external drive, atau cloud storage private.
- Backup minimal sebelum deploy besar, sebelum migration, dan seminggu sekali.

## Restore database dari backup

Cek dulu tanpa menulis data:

```bash
cd cleaning-service
npm run restore-backup
```

Kalau sudah yakin `MONGODB_URI` benar dan ingin restore:

```bash
npm run restore-backup:apply
```

Jangan jalankan restore ke database produksi tanpa backup terbaru.

## Environment variables produksi di Vercel

Di Vercel buka:

```txt
Project > Settings > Environment Variables
```

Pastikan variable ini ada untuk Production:

```env
MONGODB_URI=
JWT_SECRET=
ADMIN_RECOVERY_KEY=
ADMIN_SEED_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_FEATURE_MULTI_ITEM=false
NEXT_PUBLIC_FEATURE_AUTO_MERGE=false
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Setelah mengubah env di Vercel, lakukan redeploy.

## Jika aplikasi error

### 1. Error login/admin/order tidak tampil

Kemungkinan:

- `MONGODB_URI` salah/kedaluwarsa.
- IP/network access MongoDB Atlas belum diizinkan.
- Cluster MongoDB paused/down.
- Database user/password berubah.

Cek:

- Vercel Function Logs.
- MongoDB Atlas cluster status.
- MongoDB Atlas Database Access dan Network Access.

### 2. Upload foto gagal

Kemungkinan:

- Cloudinary env belum benar.
- API key/API secret berubah.
- Quota Cloudinary habis.
- File terlalu besar atau tipe file tidak didukung.

Cek:

- Vercel logs untuk `/api/upload`.
- Cloudinary dashboard quota.

### 3. Admin lupa password

Jika database lama masih ada, gunakan recovery/reset flow aplikasi.

Jika database baru/kosong, buat admin awal melalui endpoint seed dengan `ADMIN_SEED_KEY`.

### 4. Data order hilang

Jangan langsung restore.

Langkah aman:

1. Backup database kondisi sekarang.
2. Cek apakah salah konek ke database lain via `MONGODB_URI`.
3. Cek Vercel env production.
4. Cek MongoDB collection `orders`, `phonenumbers`, dan `admins`.
5. Baru pertimbangkan restore dari backup.

## Setelah laptop baru / clone ulang

```bash
git clone <repo-url>
cd tcs/cleaning-service
npm install
cp .env.example .env.local
```

Lalu isi `.env.local` dengan credential asli dari Vercel/MongoDB/Cloudinary.

Jalankan lokal:

```bash
npm run dev
```

## File yang tidak boleh masuk GitHub

```txt
.env
.env.local
credentials.json
service-account.json
backups/*.json
storage/
uploads/
database.sqlite
node_modules/
```

## Catatan keamanan

Backup lama di repository dapat berisi data customer. Jika ingin membersihkan dari GitHub secara benar, perlu proses terpisah untuk menghapus file dari history Git dan force-push. Jangan dilakukan saat aplikasi sedang dipakai tanpa rencana rollback.
