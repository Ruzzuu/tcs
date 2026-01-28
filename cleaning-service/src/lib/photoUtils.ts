// ============================================
// PHOTO MANAGEMENT UTILITIES
// ============================================
// Helper functions for managing photos in orders

/**
 * Upload a photo to Cloudinary and add it to an order
 * @param orderId - Order ID
 * @param file - File to upload
 * @param type - Photo type: 'before', 'after', or 'nota'
 * @returns Promise with uploaded photo data
 */
export async function uploadAndAddPhoto(
  orderId: string,
  file: File,
  type: 'before' | 'after' | 'nota'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Step 1: Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('orderId', orderId);

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      return { success: false, error: error.error || 'Gagal upload foto' };
    }

    const uploadData = await uploadResponse.json();
    const { url, publicId } = uploadData.data;

    // Step 2: Add photo reference to MongoDB
    const addResponse = await fetch(`/api/orders/${orderId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, publicId, type }),
    });

    if (!addResponse.ok) {
      const error = await addResponse.json();
      return { success: false, error: error.error || 'Gagal menyimpan foto' };
    }

    const addData = await addResponse.json();
    return { success: true, data: addData.data };
  } catch (error) {
    console.error('Upload and add photo error:', error);
    return { success: false, error: 'Terjadi kesalahan saat upload foto' };
  }
}

/**
 * Delete a photo from both Cloudinary and MongoDB
 * @param orderId - Order ID
 * @param publicId - Cloudinary public ID
 * @param type - Photo type: 'before', 'after', or 'nota'
 * @returns Promise with success status
 */
export async function deletePhoto(
  orderId: string,
  publicId: string,
  type: 'before' | 'after' | 'nota'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/orders/${orderId}/photos?publicId=${encodeURIComponent(publicId)}&type=${type}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Gagal menghapus foto' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete photo error:', error);
    return { success: false, error: 'Terjadi kesalahan saat menghapus foto' };
  }
}

/**
 * Upload multiple photos at once
 * @param orderId - Order ID
 * @param files - Array of files to upload
 * @param type - Photo type: 'before', 'after', or 'nota'
 * @returns Promise with results array
 */
export async function uploadMultiplePhotos(
  orderId: string,
  files: File[],
  type: 'before' | 'after' | 'nota'
): Promise<{ success: boolean; results: any[]; errors: string[] }> {
  const results: any[] = [];
  const errors: string[] = [];

  // Upload files one by one
  for (const file of files) {
    const result = await uploadAndAddPhoto(orderId, file, type);
    if (result.success) {
      results.push(result.data);
    } else {
      errors.push(result.error || 'Unknown error');
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}
