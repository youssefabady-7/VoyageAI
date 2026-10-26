const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Running VoyageAI Portfolio Build & Validation ===');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// 1. Verify syntax of node files
console.log('Checking JavaScript syntax...');
execSync('node -c server.js', { cwd: rootDir, stdio: 'inherit' });
execSync('node -c api/index.js', { cwd: rootDir, stdio: 'inherit' });

// 2. Verify robots.txt
console.log('Verifying robots.txt...');
const robotsPath = path.join(publicDir, 'robots.txt');
if (!fs.existsSync(robotsPath)) {
  throw new Error('robots.txt missing');
}
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
if (!robotsContent.includes('https://voyage-ai-beige.vercel.app')) {
  throw new Error('robots.txt does not contain production domain https://voyage-ai-beige.vercel.app');
}

// 3. Verify sitemap.xml
console.log('Verifying sitemap.xml...');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  throw new Error('sitemap.xml missing');
}
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemapContent.includes('https://voyage-ai-beige.vercel.app/')) {
  throw new Error('sitemap.xml missing production domain');
}
if (!sitemapContent.includes('<loc>https://voyage-ai-beige.vercel.app/case-study</loc>')) {
  throw new Error('sitemap.xml missing /case-study loc');
}

// 4. Verify OG image
console.log('Verifying OG image...');
const ogPath = path.join(publicDir, 'og-image.png');
if (!fs.existsSync(ogPath)) {
  console.log('og-image.png missing, generating...');
  execSync('node scripts/generate-og.js', { cwd: rootDir, stdio: 'inherit' });
}
const sharp = require('sharp');
sharp(ogPath).metadata().then(meta => {
  if (meta.width !== 1200 || meta.height !== 630) {
    throw new Error(`OG Image is ${meta.width}x${meta.height}, expected 1200x630`);
  }
  console.log('OG image verified at 1200x630.');
});

// 5. Verify index.html metadata & hero
console.log('Verifying index.html copy & tags...');
const indexPath = path.join(publicDir, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const requiredStrings = [
  'Youssef Abady',
  'AI Engineer — building production LLM systems',
  'I built VoyageAI, a deployed AI travel concierge using Google Gemini + Next.js.',
  'Read the Engineering Case Study',
  'Try the Live Demo',
  'summary_large_image',
  'https://voyage-ai-beige.vercel.app'
];

for (const reqStr of requiredStrings) {
  if (!indexContent.includes(reqStr)) {
    throw new Error(`index.html is missing required copy: "${reqStr}"`);
  }
}

// 6. Verify case-study.html and all 7 required sections
console.log('Verifying case-study.html sections and diagram...');
const csPath = path.join(publicDir, 'case-study.html');
if (!fs.existsSync(csPath)) {
  throw new Error('case-study.html missing');
}
const csContent = fs.readFileSync(csPath, 'utf8');
const requiredCsSections = [
  'id="tldr"',
  'id="problem"',
  'id="architecture"',
  'id="tradeoffs"',
  'id="evaluation"',
  'id="limitations"',
  'id="links"',
  '<svg class="arch-svg"',
  '<!-- [VERIFY]'
];

for (const sec of requiredCsSections) {
  if (!csContent.includes(sec)) {
    throw new Error(`case-study.html missing required element: ${sec}`);
  }
}

// 7. Validate JSON-LD Schema syntax
console.log('Validating JSON-LD schemas...');
function validateJsonLd(content, filename) {
  const matches = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (!matches || matches.length === 0) {
    throw new Error(`No JSON-LD scripts found in ${filename}`);
  }
  for (const m of matches) {
    const rawJson = m.replace(/<\/?script[^>]*>/gi, '').trim();
    const parsed = JSON.parse(rawJson);
    if (!parsed['@context']) {
      throw new Error(`JSON-LD in ${filename} missing @context`);
    }
  }
}

validateJsonLd(indexContent, 'index.html');
validateJsonLd(csContent, 'case-study.html');
console.log('JSON-LD schemas are valid JSON with @context.');

console.log('=== Build & Validation Passed Successfully! ===');
