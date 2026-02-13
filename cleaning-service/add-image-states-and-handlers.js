const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'admin', 'orders', 'page.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the line with items state and add image states after it
const itemsStateIndex = lines.findIndex(line => line.includes("const [items, setItems] = useState<FormItem[]>"));
if (itemsStateIndex !== -1) {
  // Find the closing of items array (next line with ]);)
  let insertIndex = itemsStateIndex + 1;
  while (insertIndex < lines.length && !lines[insertIndex].includes(']);')) {
    insertIndex++;
  }
  insertIndex++; // Insert after the ]);
  
  const imageStates = [
    "  const [proofOfWork, setProofOfWork] = useState<{ before: CloudinaryImage[], after: CloudinaryImage[] }>({ before: [], after: [] });",
    "  const [uploading, setUploading] = useState<{ before: boolean, after: boolean }>({ before: false, after: false });",
    "  const [uploadProgress, setUploadProgress] = useState<{ before: number, after: number }>({ before: 0, after: 0 });",
    "  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);"
  ];
  
  lines.splice(insertIndex, 0, ...imageStates);
  console.log(`✅ Added image states at line ${insertIndex + 1}`);
} else {
  console.log('❌ Could not find items state');
  process.exit(1);
}

// Find decrementQuantity function and add handlers after it
const decrementIndex = lines.findIndex(line => line.includes("const decrementQuantity = (index: number)"));
if (decrementIndex !== -1) {
  // Find the closing brace of decrementQuantity
  let insertIndex = decrementIndex + 1;
  while (insertIndex < lines.length && !lines[insertIndex].includes("};")) {
    insertIndex++;
  }
  insertIndex++; // Insert after the };
  
  const handlers = [
    "",
    "  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {",
    "    const files = event.target.files;",
    "    if (!files || files.length === 0) return;",
    "",
    "    setUploading(prev => ({ ...prev, [type]: true }));",
    "    setUploadProgress(prev => ({ ...prev, [type]: 0 }));",
    "",
    "    try {",
    "      const uploadedImages: CloudinaryImage[] = [];",
    "      const filesToUpload = Array.from(files);",
    "      ",
    "      // Create temporary preview images",
    "      const tempImages: CloudinaryImage[] = filesToUpload.map((file, index) => ({",
    "        url: URL.createObjectURL(file),",
    "        publicId: `temp-${type}-${Date.now()}-${index}`",
    "      }));",
    "",
    "      // Add temporary images to state immediately (optimistic update)",
    "      setProofOfWork(prev => ({",
    "        ...prev,",
    "        [type]: [...prev[type], ...tempImages]",
    "      }));",
    "",
    "      // Upload each file",
    "      for (let i = 0; i < filesToUpload.length; i++) {",
    "        const file = filesToUpload[i];",
    "        const formData = new FormData();",
    "        formData.append('file', file);",
    "",
    "        const response = await fetch('/api/upload', {",
    "          method: 'POST',",
    "          body: formData,",
    "        });",
    "",
    "        if (!response.ok) {",
    "          const errorData = await response.json();",
    "          throw new Error(errorData.error || 'Failed to upload image');",
    "        }",
    "",
    "        const data = await response.json();",
    "        uploadedImages.push({",
    "          url: data.url,",
    "          publicId: data.publicId,",
    "        });",
    "",
    "        // Update progress",
    "        setUploadProgress(prev => ({",
    "          ...prev,",
    "          [type]: Math.round(((i + 1) / filesToUpload.length) * 100)",
    "        }));",
    "      }",
    "",
    "      // Replace temporary images with real uploaded images",
    "      setProofOfWork(prev => {",
    "        const filteredImages = prev[type].filter(img => !img.publicId.startsWith(`temp-${type}-`));",
    "        return {",
    "          ...prev,",
    "          [type]: [...filteredImages, ...uploadedImages]",
    "        };",
    "      });",
    "",
    "      // Clean up temporary URLs",
    "      tempImages.forEach(img => URL.revokeObjectURL(img.url));",
    "",
    "    } catch (error) {",
    "      console.error('Error uploading images:', error);",
    "      alert(error instanceof Error ? error.message : 'Failed to upload images. Please try again.');",
    "      ",
    "      // Remove temporary images on error",
    "      setProofOfWork(prev => ({",
    "        ...prev,",
    "        [type]: prev[type].filter(img => !img.publicId.startsWith(`temp-${type}-`))",
    "      }));",
    "    } finally {",
    "      setUploading(prev => ({ ...prev, [type]: false }));",
    "      setUploadProgress(prev => ({ ...prev, [type]: 0 }));",
    "    }",
    "  };",
    "",
    "  const handleDeletePhoto = async (publicId: string, type: 'before' | 'after') => {",
    "    if (!confirm('Are you sure you want to delete this photo?')) {",
    "      return;",
    "    }",
    "",
    "    setDeletingPhoto(publicId);",
    "    ",
    "    // Store the image in case we need to restore it",
    "    const imageToDelete = proofOfWork[type].find(img => img.publicId === publicId);",
    "    ",
    "    // Optimistically remove from UI",
    "    setProofOfWork(prev => ({",
    "      ...prev,",
    "      [type]: prev[type].filter(img => img.publicId !== publicId)",
    "    }));",
    "",
    "    try {",
    "      const response = await fetch('/api/upload', {",
    "        method: 'DELETE',",
    "        headers: {",
    "          'Content-Type': 'application/json',",
    "        },",
    "        body: JSON.stringify({ publicId }),",
    "      });",
    "",
    "      if (!response.ok) {",
    "        throw new Error('Failed to delete image');",
    "      }",
    "    } catch (error) {",
    "      console.error('Error deleting image:', error);",
    "      alert('Failed to delete image. Please try again.');",
    "      ",
    "      // Restore the image on error",
    "      if (imageToDelete) {",
    "        setProofOfWork(prev => ({",
    "          ...prev,",
    "          [type]: [...prev[type], imageToDelete]",
    "        }));",
    "      }",
    "    } finally {",
    "      setDeletingPhoto(null);",
    "    }",
    "  };"
  ];
  
  lines.splice(insertIndex, 0, ...handlers);
  console.log(`✅ Added image handlers at line ${insertIndex + 1}`);
} else {
  console.log('❌ Could not find decrementQuantity');
}

// Find the payload in handleSubmit and add proofOfWork
const payloadLine = lines.findIndex(line => line.includes("notes: item.notes"));
if (payloadLine !== -1) {
  lines[payloadLine] = lines[payloadLine].replace(
    "notes: item.notes",
    "notes: item.notes"
  );
  // Insert after the closing }))])
  let insertIndex = payloadLine + 1;
  while (insertIndex < lines.length && !lines[insertIndex].includes("}))")) {
    insertIndex++;
  }
  
  if (insertIndex < lines.length) {
    // Change the closing from })) to })),
    lines[insertIndex] = lines[insertIndex].replace("}));", "})),");
    lines.splice(insertIndex + 1, 0, 
      "        proofOfWork: {",
      "          before: proofOfWork.before.map(img => ({ url: img.url, publicId: img.publicId })),",
      "          after: proofOfWork.after.map(img => ({ url: img.url, publicId: img.publicId })),",
      "        }"
    );
    console.log(`✅ Added proofOfWork to payload at line ${insertIndex + 1}`);
  }
} else {
  console.log('❌ Could not find payload');
}

// Write back
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Successfully updated the file');
