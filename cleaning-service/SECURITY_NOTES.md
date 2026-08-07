# Security Notes

## File sensitif

Jangan commit:

```txt
.env.local
.env
credentials.json
service-account.json
backups/*.json
```

## Backup customer data

Backup JSON berisi data order/customer. Perlakukan seperti data rahasia.

Jika backup sudah pernah masuk GitHub, menghapus file biasa tidak cukup untuk menghapus dari history. Perlu proses khusus seperti `git filter-repo` atau BFG Repo-Cleaner, lalu force-push. Lakukan hanya saat sudah siap karena bisa mengganggu collaborator/deployment.

## Rotasi secret

Rotasi jika secret bocor:

- `JWT_SECRET`: user/admin akan logout, lalu login ulang.
- `ADMIN_SEED_KEY`: update Vercel env dan `.env.local`.
- `ADMIN_RECOVERY_KEY`: update Vercel env dan `.env.local`.
- MongoDB password: update Database Access di Atlas dan `MONGODB_URI`.
- Cloudinary API secret: update Cloudinary dan Vercel env.

## Production access

Batasi akses ke:

- Vercel project.
- MongoDB Atlas project.
- Cloudinary account.
- GitHub repository.

Gunakan 2FA untuk semua akun tersebut.
