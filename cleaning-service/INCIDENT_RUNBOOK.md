# Incident Runbook

Panduan cepat ketika aplikasi produksi error.

## Aplikasi tidak bisa dibuka

1. Cek Vercel status dan deployment terbaru.
2. Buka Vercel Logs.
3. Jika error muncul setelah deploy terakhir, rollback deployment.
4. Jika error env, cek Environment Variables dan redeploy.

## Order/admin kosong tiba-tiba

Kemungkinan paling sering: `MONGODB_URI` mengarah ke database/cluster yang salah.

Langkah:

1. Jangan restore dulu.
2. Cek env `MONGODB_URI` di Vercel Production.
3. Cek MongoDB Atlas apakah collection `orders`, `admins`, `phonenumbers` masih ada.
4. Backup kondisi saat ini.
5. Baru putuskan restore jika memang database benar-benar kosong/hilang.

## Login admin gagal

1. Cek apakah database bisa connect.
2. Cek collection `admins` di MongoDB.
3. Jika admin masih ada, jangan seed admin baru.
4. Jika database kosong, gunakan seed flow dengan `ADMIN_SEED_KEY`.

## Upload foto gagal

1. Cek `/api/upload` di Vercel logs.
2. Cek Cloudinary env.
3. Cek Cloudinary quota.
4. Cek ukuran/type file.

## Data terhapus karena script/migration

1. Stop menjalankan script tambahan.
2. Backup kondisi database saat ini.
3. Identifikasi script terakhir yang dijalankan.
4. Bandingkan dengan backup JSON.
5. Restore hanya collection yang diperlukan.

## Rollback Vercel

1. Buka Vercel Project.
2. Tab Deployments.
3. Pilih deployment lama yang terakhir sehat.
4. Klik Promote/Redeploy sesuai opsi Vercel.
5. Setelah rollback, cek form, admin, dan order list.
