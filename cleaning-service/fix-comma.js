const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'admin', 'orders', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the missing comma on line 234
content = content.replace(
  "        }))\n        proofOfWork: {",
  "        })),\n        proofOfWork: {"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed missing comma');
