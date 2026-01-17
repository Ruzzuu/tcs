# Photo Management Implementation Guide

## Overview
The photo management system allows unlimited photo uploads for orders, with automatic cleanup when photos or orders are deleted.

## API Routes

### 1. Upload Photo to Cloudinary
**Endpoint:** `POST /api/upload`
```typescript
// Upload single file
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'before'); // 'before', 'after', 'nota'
formData.append('orderId', orderId);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
// Returns: { success: true, data: { url, publicId } }
```

### 2. Add Photo to Order (MongoDB)
**Endpoint:** `POST /api/orders/[id]/photos`
```typescript
const response = await fetch(`/api/orders/${orderId}/photos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://res.cloudinary.com/...',
    publicId: 'cleaning-app/orders/before/...',
    type: 'before' // 'before', 'after', 'nota'
  }),
});

const data = await response.json();
// Returns: { success: true, message: 'Foto berhasil ditambahkan', data: updatedOrder }
```

### 3. Delete Individual Photo
**Endpoint:** `DELETE /api/orders/[id]/photos?publicId=xxx&type=before`
```typescript
const response = await fetch(
  `/api/orders/${orderId}/photos?publicId=${publicId}&type=before`,
  { method: 'DELETE' }
);

const data = await response.json();
// Returns: { success: true, message: 'Foto berhasil dihapus' }
```

### 4. Delete Entire Order (with all photos)
**Endpoint:** `DELETE /api/orders/[id]`
```typescript
const response = await fetch(`/api/orders/${orderId}`, {
  method: 'DELETE'
});
// Automatically deletes ALL photos from Cloudinary and MongoDB
```

## Frontend Implementation Example

### Using Helper Functions
```typescript
import { uploadAndAddPhoto, deletePhoto } from '@/lib/photoUtils';

// Upload single photo
const handleUpload = async (file: File) => {
  const result = await uploadAndAddPhoto(orderId, file, 'before');
  if (result.success) {
    console.log('Photo uploaded:', result.data);
    // Refresh order data
  } else {
    alert(result.error);
  }
};

// Delete photo (called when clicking X button)
const handleDeletePhoto = async (publicId: string) => {
  if (!confirm('Hapus foto ini?')) return;
  
  const result = await deletePhoto(orderId, publicId, 'before');
  if (result.success) {
    console.log('Photo deleted');
    // Refresh order data
  } else {
    alert(result.error);
  }
};
```

### React Component Example
```tsx
'use client';

import { useState } from 'react';
import { uploadAndAddPhoto, deletePhoto } from '@/lib/photoUtils';

export default function PhotoManager({ orderId, initialPhotos }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    
    // Upload files one by one
    for (const file of Array.from(files)) {
      const result = await uploadAndAddPhoto(orderId, file, 'before');
      if (result.success) {
        setPhotos(prev => [...prev, result.data.proofOfWork.beforePhotos.slice(-1)[0]]);
      }
    }
    
    setUploading(false);
  };

  const handleDelete = async (publicId: string) => {
    if (!confirm('Hapus foto ini?')) return;

    const result = await deletePhoto(orderId, publicId, 'before');
    if (result.success) {
      setPhotos(prev => prev.filter(p => p.publicId !== publicId));
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      {/* Upload Button */}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.publicId} className="relative">
            <img src={photo.url} alt="Before" />
            
            {/* Delete Button */}
            <button
              onClick={() => handleDelete(photo.publicId)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1 text-white backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## How It Works

### When Uploading a Photo:
1. File sent to `/api/upload` → Uploaded to Cloudinary
2. Returns `{url, publicId}`
3. Call `/api/orders/[id]/photos` with this data
4. MongoDB uses `$push` to **append** to `beforePhotos[]` array
5. Photo added without affecting existing photos

### When Deleting a Photo:
1. Click X button → calls `DELETE /api/orders/[id]/photos`
2. Deletes from Cloudinary using `publicId`
3. Uses MongoDB `$pull` to remove from `beforePhotos[]` array
4. Only that specific photo is removed

### When Deleting Order:
1. Call `DELETE /api/orders/[id]`
2. Loop through ALL photos in `beforePhotos[]` and `afterPhotos[]`
3. Delete each from Cloudinary
4. Delete order document from MongoDB
5. All photos cleaned up automatically

## Key Points

✅ **Unlimited Photos:** Arrays can hold as many photos as needed
✅ **Automatic Cleanup:** Deleting order deletes all associated photos
✅ **Individual Delete:** Can delete specific photos without affecting others
✅ **Append Operation:** New photos added to array, not replacing existing
✅ **Error Handling:** Uses `Promise.allSettled()` to handle partial failures

## MongoDB Operations Used

- `$push` - Add item to array (append)
- `$pull` - Remove item from array (by publicId)
- `$set` - Replace single value (for nota image)
- `$unset` - Remove field completely
