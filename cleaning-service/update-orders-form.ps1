# Script to add image upload functionality to admin orders page

$filePath = "src\app\admin\orders\page.tsx"
$content = Get-Content $filePath -Raw

# 1. Add CloudinaryImage import
$content = $content -replace "import PhoneAutocomplete from '@/components/PhoneAutocomplete';", @"
import PhoneAutocomplete from '@/components/PhoneAutocomplete';
import { CloudinaryImage } from '@/types';
"@

# 2. Add image state after items state
$content = $content -replace "(\s+const \[items, setItems\] = useState<FormItem\[\]>\(\[[\s\S]*?\]\);)", @"
`$1
  const [proofOfWork, setProofOfWork] = useState<{ before: CloudinaryImage[], after: CloudinaryImage[] }>({ before: [], after: [] });
  const [uploading, setUploading] = useState<{ before: boolean, after: boolean }>({ before: false, after: false });
  const [uploadProgress, setUploadProgress] = useState<{ before: number, after: number }>({ before: 0, after: 0 });
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
"@

# 3. Add handleImageUpload function after decrement function
$decrementIndex = $content.IndexOf("const decrementQuantity = (index: number)")
$nextFunctionIndex = $content.IndexOf("const calculateTotal", $decrementIndex)

$handleImageUploadCode = @"

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(prev => ({ ...prev, [type]: true }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    try {
      const uploadedImages: CloudinaryImage[] = [];
      const filesToUpload = Array.from(files);
      
      // Create temporary preview images
      const tempImages: CloudinaryImage[] = filesToUpload.map((file, index) => ({
        url: URL.createObjectURL(file),
        publicId: `temp-${type}-${Date.now()}-${index}`
      }));

      // Add temporary images to state immediately (optimistic update)
      setProofOfWork(prev => ({
        ...prev,
        [type]: [...prev[type], ...tempImages]
      }));

      // Upload each file
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const data = await response.json();
        uploadedImages.push({
          url: data.url,
          publicId: data.publicId,
        });

        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          [type]: Math.round(((i + 1) / filesToUpload.length) * 100)
        }));
      }

      // Replace temporary images with real uploaded images
      setProofOfWork(prev => {
        const filteredImages = prev[type].filter(img => !img.publicId.startsWith(`temp-${type}-`));
        return {
          ...prev,
          [type]: [...filteredImages, ...uploadedImages]
        };
      });

      // Clean up temporary URLs
      tempImages.forEach(img => URL.revokeObjectURL(img.url));

    } catch (error) {
      console.error('Error uploading images:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload images. Please try again.');
      
      // Remove temporary images on error
      setProofOfWork(prev => ({
        ...prev,
        [type]: prev[type].filter(img => !img.publicId.startsWith(`temp-${type}-`))
      }));
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    }
  };

  const handleDeletePhoto = async (publicId: string, type: 'before' | 'after') => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    setDeletingPhoto(publicId);
    
    // Store the image in case we need to restore it
    const imageToDelete = proofOfWork[type].find(img => img.publicId === publicId);
    
    // Optimistically remove from UI
    setProofOfWork(prev => ({
      ...prev,
      [type]: prev[type].filter(img => img.publicId !== publicId)
    }));

    try {
      const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
      
      // Restore the image on error
      if (imageToDelete) {
        setProofOfWork(prev => ({
          ...prev,
          [type]: [...prev[type], imageToDelete]
        }));
      }
    } finally {
      setDeletingPhoto(null);
    }
  };
"@

$content = $content.Insert($nextFunctionIndex, $handleImageUploadCode)

# 4. Update handleSubmit to include proofOfWork
$content = $content -replace "(const requestBody = \{[\s\S]*?items: validItems,)", @"
`$1
        proofOfWork: {
          before: proofOfWork.before.map(img => ({ url: img.url, publicId: img.publicId })),
          after: proofOfWork.after.map(img => ({ url: img.url, publicId: img.publicId })),
        },
"@

# 5. Add image upload UI before the submit button
$submitButtonPattern = '(\s+{/\* Submit Button \*/})'
$imageUploadUI = @"

        {/* Proof of Work Photos Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Proof of Work Photos</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Before Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Before Photos
              </label>
              <div className="space-y-4">
                {proofOfWork.before.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {proofOfWork.before.map((image, index) => (
                      <div key={image.publicId} className="relative group">
                        <img
                          src={image.url}
                          alt={`Before ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(image.publicId, 'before')}
                          disabled={deletingPhoto === image.publicId}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          {deletingPhoto === image.publicId ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, 'before')}
                    disabled={uploading.before}
                    className="hidden"
                    id="before-upload"
                  />
                  <label
                    htmlFor="before-upload"
                    className={`cursor-pointer flex flex-col items-center ${uploading.before ? 'opacity-50' : ''}`}
                  >
                    {uploading.before ? (
                      <>
                        <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-600">Uploading... {uploadProgress.before}%</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-gray-600">Upload Before Photos</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* After Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                After Photos
              </label>
              <div className="space-y-4">
                {proofOfWork.after.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {proofOfWork.after.map((image, index) => (
                      <div key={image.publicId} className="relative group">
                        <img
                          src={image.url}
                          alt={`After ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(image.publicId, 'after')}
                          disabled={deletingPhoto === image.publicId}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          {deletingPhoto === image.publicId ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, 'after')}
                    disabled={uploading.after}
                    className="hidden"
                    id="after-upload"
                  />
                  <label
                    htmlFor="after-upload"
                    className={`cursor-pointer flex flex-col items-center ${uploading.after ? 'opacity-50' : ''}`}
                  >
                    {uploading.after ? (
                      <>
                        <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-600">Uploading... {uploadProgress.after}%</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-gray-600">Upload After Photos</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

`$1
"@

$content = $content -replace $submitButtonPattern, $imageUploadUI

# Write the updated content
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Successfully updated $filePath with image upload functionality" -ForegroundColor Green
