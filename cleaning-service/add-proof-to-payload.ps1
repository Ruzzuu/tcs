# Script to add proofOfWork to the payload

$filePath = "src\app\admin\orders\page.tsx"
$content = Get-Content $filePath -Raw

# Find the items array in the payload and add proofOfWork after it
$pattern = '(\s+items: validItems\.map\(item => \(\{[\s\S]*?\}\)\)\s*\})'
$replacement = @'
$1,
        proofOfWork: {
          before: proofOfWork.before.map(img => ({ url: img.url, publicId: img.publicId })),
          after: proofOfWork.after.map(img => ({ url: img.url, publicId: img.publicId })),
        }
'@

$content = $content -replace $pattern, $replacement

# Write the updated content
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Successfully added proofOfWork to payload" -ForegroundColor Green
