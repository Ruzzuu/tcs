# Deployment Checklist

Gunakan checklist ini setiap kali ingin memperbaiki/deploy aplikasi yang sedang dipakai.

## Sebelum deploy

- [ ] Pastikan aplikasi produksi saat ini masih bisa dibuka.
- [ ] Pastikan login admin berhasil.
- [ ] Pastikan `NEXT_PUBLIC_TENANT_ID` sesuai project (`tcs` atau `rekan`).
- [ ] Pastikan `MONGODB_URI` production di Vercel mengarah ke cluster yang benar.
- [ ] Pastikan `MONGODB_DB_NAME` cocok persis dengan tenant (`cleaning-service` atau `cleaning-service-rekan`).
- [ ] Pastikan `CLOUDINARY_BASE_FOLDER` cocok persis dengan tenant (`cleaning-app` atau `cleaning-app/rekan-cuci-sepatu`).
- [ ] Pastikan seluruh Cloudinary env production terisi.
- [ ] Pastikan `ADMIN_SEED_ENABLED=false` kecuali selama pembuatan admin pertama.
- [ ] Jalankan backup database.
- [ ] Simpan backup di lokasi aman, bukan GitHub.
- [ ] Jalankan lint/build lokal.

```bash
cd cleaning-service
npm install
npm run lint
npm run build
npm run backup-database
```

## Saat deploy

- [ ] Deploy dari branch yang benar.
- [ ] Cek Vercel build log.
- [ ] Jangan ubah env production bersamaan dengan deploy kode besar kecuali memang perlu.

## Setelah deploy

- [ ] Buka halaman form customer.
- [ ] Login admin.
- [ ] Cek order list.
- [ ] Cek dashboard/report.
- [ ] Test upload foto jika ada perubahan upload.
- [ ] Dalam jendela privat/incognito, pastikan `/api/orders` dan `/api/upload` menolak akses tanpa login dengan status `401`.
- [ ] Pastikan data order tenant lain tidak muncul.
- [ ] Cek Vercel Function Logs selama 5-10 menit.

## Jika deploy bermasalah

1. Jangan edit database dulu.
2. Rollback deployment di Vercel ke deployment sebelumnya.
3. Cek logs error.
4. Perbaiki lokal.
5. Build ulang sebelum deploy lagi.
