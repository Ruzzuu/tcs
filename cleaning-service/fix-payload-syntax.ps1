# Script to fix the payload syntax

$filePath = "src\app\admin\orders\page.tsx"
$content = Get-Content $filePath -Raw

# Fix the syntax error - replace the malformed payload structure
$oldPattern = [regex]::Escape(@'
        items: validItems.map(item => ({
          itemType: item.service,
          customItemType: '',
          quantity: item.quantity,
          notes: item.notes
        }))
      },
        proofOfWork: {
          before: proofOfWork.before.map(img => ({ url: img.url, publicId: img.publicId })),
          after: proofOfWork.after.map(img => ({ url: img.url, publicId: img.publicId })),
        };
'@)

$newPayload = @'
        items: validItems.map(item => ({
          itemType: item.service,
          customItemType: '',
          quantity: item.quantity,
          notes: item.notes
        })),
        proofOfWork: {
          before: proofOfWork.before.map(img => ({ url: img.url, publicId: img.publicId })),
          after: proofOfWork.after.map(img => ({ url: img.url, publicId: img.publicId })),
        }
      };
'@

$content = $content -replace $oldPattern, $newPayload

# Write the updated content
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Successfully fixed payload syntax" -ForegroundColor Green
