const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'admin', 'orders', 'page.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find line 234 (index 233) and add comma
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '}))'  && lines[i + 1] && lines[i + 1].includes('proofOfWork:')) {
    lines[i] = lines[i].replace('})', '}),');
    console.log(`✅ Fixed line ${i + 1}: ${lines[i]}`);
    break;
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Successfully fixed the comma');
