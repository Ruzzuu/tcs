# Photo Gallery Testing Guide

## Features Implemented

### ✅ Multi-Photo Gallery
- Grid layout displaying multiple before/after photos
- Unlimited photo uploads per section
- Add button that changes icon based on whether photos exist

### ✅ Batch Upload Support
- Multi-file input (`multiple` attribute)
- Upload progress indicator showing current/total count
- Sequential upload with individual error handling
- Failed uploads don't block subsequent uploads

### ✅ Optimistic UI
- Photos appear immediately with temporary placeholder
- Loading spinner overlay while uploading to Cloudinary
- Automatic replacement with real Cloudinary URL when complete
- Rollback on upload failure (removes temp photo)

### ✅ Individual Photo Delete
- X button on each photo (except temporary uploading ones)
- Confirmation dialog before deletion
- Optimistic removal (disappears immediately)
- Rollback on API failure (photo reappears)
- Proper cleanup from both Cloudinary AND MongoDB

### ✅ Upload Progress
- Shows "X/Y" count during batch upload
- Visual feedback with spinning loader on temp photos
- Disabled state on buttons during upload

## Testing Checklist

### 1. Upload Single Photo
- [ ] Click "Ambil Foto" button (camera icon)
- [ ] Select single image
- [ ] Verify temp photo appears with loader
- [ ] Verify photo replaces with real URL after upload
- [ ] Check Cloudinary has the image
- [ ] Check MongoDB has {url, publicId} in array

### 2. Upload Multiple Photos
- [ ] Click "Tambah Foto" button (+ icon)
- [ ] Select multiple images (3-5)
- [ ] Verify progress counter (1/5, 2/5, etc.)
- [ ] Verify each photo shows loader then replaces
- [ ] Check all photos in Cloudinary
- [ ] Check all photos in MongoDB array

### 3. Delete Photo (Success)
- [ ] Click X button on any photo
- [ ] Confirm deletion dialog
- [ ] Verify photo disappears immediately (optimistic)
- [ ] Wait for API response
- [ ] Verify photo stays removed
- [ ] Check Cloudinary - photo should be deleted
- [ ] Check MongoDB - photo removed from array

### 4. Delete Photo (Failure Simulation)
- [ ] Disconnect network or break API
- [ ] Click X button
- [ ] Verify photo disappears initially
- [ ] Wait for API error
- [ ] Verify photo reappears (rollback)
- [ ] Check alert/error message shown

### 5. Upload Failure Simulation
- [ ] Upload very large file (>10MB)
- [ ] OR disconnect network during upload
- [ ] Verify temp photo appears
- [ ] Wait for failure
- [ ] Verify temp photo removed
- [ ] Verify error alert shown
- [ ] Check subsequent uploads still work

### 6. Concurrent Operations
- [ ] Start uploading 3 photos
- [ ] While uploading, click another photo's X button
- [ ] Verify both operations work independently
- [ ] Verify no race conditions

### 7. Mobile Testing
- [ ] Test on Android device
- [ ] Use camera capture (capture="environment")
- [ ] Test multi-select from gallery
- [ ] Verify touch interactions work
- [ ] Check responsive grid layout

## API Endpoints Used

### Upload
```
POST /api/upload
Body: FormData { file, type, orderId }
Response: { success, data: { url, publicId } }
```

### Delete
```
DELETE /api/orders/[id]/photos?publicId=xxx&type=before
Response: { success, message }
```

## State Management

### Photo State
```typescript
proofOfWork: {
  beforePhotos: CloudinaryImage[],
  afterPhotos: CloudinaryImage[]
}
```

### Upload State
```typescript
uploading: 'before' | 'after' | null
uploadProgress: { type, current, total } | null
deletingPhoto: string | null  // publicId being deleted
```

### Optimistic UI Flow
1. User selects files
2. Create temp images with `temp-${timestamp}` publicId
3. Add to state array
4. Upload to Cloudinary
5. Replace temp with real {url, publicId}
6. On error: filter out temp image

### Delete UI Flow
1. User clicks X
2. Show confirmation
3. Save backup of array
4. Remove from state immediately
5. Call DELETE API
6. On error: restore from backup

## Cloudinary Verification

Check your Cloudinary dashboard at:
https://console.cloudinary.com/

Navigate to: Media Library > cleaning-app/orders/

Should see folders:
- `before/` - Before photos
- `after/` - After photos
- `nota/` - Receipt photos

Verify deletion by checking asset count before/after delete operation.

## MongoDB Verification

Query the order document:
```javascript
db.orders.findOne({ _id: ObjectId("...") })
```

Check `proofOfWork` field:
```json
{
  "proofOfWork": {
    "beforePhotos": [
      { "url": "https://...", "publicId": "cleaning-app/orders/before/..." }
    ],
    "afterPhotos": [
      { "url": "https://...", "publicId": "cleaning-app/orders/after/..." }
    ]
  }
}
```

## Known Behaviors

✅ **Multiple photos per section** - Unlimited
✅ **Batch upload** - Sequential (one after another)
✅ **Delete confirmation** - Always prompts user
✅ **Temp photos** - Show loader, can't be deleted
✅ **Real photos** - Can be deleted with X button
✅ **Empty state** - Shows camera icon "Ambil Foto"
✅ **Has photos** - Shows + icon "Tambah Foto"
✅ **Upload progress** - "X/Y" indicator during batch
✅ **Optimistic UI** - Instant feedback, rollback on error

## Error Handling

- **Network error** → Alert + rollback
- **API error** → Alert + rollback
- **File too large** → Remove temp + alert
- **Invalid format** → Browser blocks (accept="image/jpeg,image/png,image/webp")
- **Cloudinary failure** → MongoDB still updated (photo saved for retry)
- **MongoDB failure** → Cloudinary may have orphan (cleanup needed)

## Future Enhancements

- [ ] Drag & drop reordering
- [ ] Image compression before upload
- [ ] Parallel uploads (Promise.all)
- [ ] Retry failed uploads
- [ ] Preview modal/lightbox
- [ ] Batch delete multiple photos
- [ ] Photo captions/notes
