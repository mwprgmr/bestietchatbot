const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const zipName = 'bestietfresh-web-build.zip';
const rootDir = '/Users/alamsha/Desktop/bestietfresh/chatbot';

console.log('Building clean deployment zip archive under 100 files...');

// Delete existing zip if present
const zipPath = path.join(rootDir, zipName);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Zip core application files excluding node_modules, .next, .git, scratch, artifacts
const zipCmd = `zip -r ${zipName} app lib types public supabase/migrations package.json tsconfig.json README.md .env.local -x "*.DS_Store" "*node_modules/*" "*.next/*" "*scratch/*" "*test*"`;

console.log('Running zip command:', zipCmd);
execSync(zipCmd, { cwd: rootDir, stdio: 'inherit' });

// Verify zip file count
const countCmd = `unzip -l ${zipName} | wc -l`;
const countOutput = execSync(countCmd, { cwd: rootDir, encoding: 'utf-8' });
const rawLines = parseInt(countOutput.trim(), 10) || 0;
const fileCount = Math.max(0, rawLines - 5);

console.log(`\n===========================================================`);
console.log(`📦 ARCHIVE GENERATED: ${zipName}`);
console.log(`📊 TOTAL FILES IN ZIP: ${fileCount}`);
console.log(`===========================================================`);

if (fileCount < 100) {
  console.log(`✅ VERIFIED: File count (${fileCount}) is strictly under 100 files limit!`);
} else {
  console.log(`📊 Current File count: ${fileCount}`);
}
