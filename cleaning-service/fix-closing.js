const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'admin', 'orders', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the malformed closing - should be })),
content = content.replace(
  /(\s+notes: item\.notes\n\s+\}\),\)\n\s+proofOfWork: \{)/,
  "$1".replace("}),)", "})),")
);

// Simple replace
content = content.replace("}),)", "})),");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed payload closing');
