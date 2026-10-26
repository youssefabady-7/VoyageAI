const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070F1E" />
        <stop offset="50%" stop-color="#0B1D3A" />
        <stop offset="100%" stop-color="#030812" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E8D5A8" />
        <stop offset="50%" stop-color="#C9A96E" />
        <stop offset="100%" stop-color="#A88B4A" />
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.07)" />
        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="60" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)" />

    <!-- Ambient Glow Orbs -->
    <circle cx="200" cy="150" r="180" fill="#C9A96E" opacity="0.12" filter="url(#glow)" />
    <circle cx="1000" cy="480" r="220" fill="#3B82F6" opacity="0.1" filter="url(#glow)" />

    <!-- Decorative Grid / Framing -->
    <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="rgba(201, 169, 110, 0.25)" stroke-width="1.5" />

    <!-- Top Badge -->
    <rect x="80" y="80" width="300" height="40" rx="20" fill="rgba(201, 169, 110, 0.12)" stroke="rgba(201, 169, 110, 0.35)" />
    <circle cx="102" cy="100" r="5" fill="#10B981" />
    <text x="118" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E8D5A8" letter-spacing="1.5">AI ENGINEER PORTFOLIO</text>

    <!-- Main Name -->
    <text x="80" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="#FFFFFF" letter-spacing="-1">Youssef Abady</text>

    <!-- Role / Positioning -->
    <text x="80" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="600" fill="url(#gold)" letter-spacing="0.5">AI Engineer — Building Production LLM Systems</text>

    <!-- Central Showcase Card -->
    <rect x="80" y="300" width="1040" height="180" rx="16" fill="url(#cardGrad)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" />

    <text x="120" y="348" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#94A3B8" letter-spacing="2">FLAGSHIP PROJECT PROOF</text>
    <text x="120" y="392" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">VoyageAI: Deployed Autonomous Travel Concierge</text>
    <text x="120" y="432" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400" fill="#CBD5E1">Architected with Google Gemini, multi-tier fallback pipelines &amp; dynamic routing</text>

    <!-- Technology Pills -->
    <g transform="translate(80, 510)">
      <rect x="0" y="0" width="180" height="36" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.15)" />
      <text x="90" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0" text-anchor="middle">Google Gemini 3.8</text>

      <rect x="195" y="0" width="170" height="36" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.15)" />
      <text x="280" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0" text-anchor="middle">Production LLMs</text>

      <rect x="380" y="0" width="160" height="36" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.15)" />
      <text x="460" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0" text-anchor="middle">Streaming Engine</text>

      <rect x="555" y="0" width="180" height="36" rx="8" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.15)" />
      <text x="645" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0" text-anchor="middle">Case Study &amp; Demo</text>
    </g>

    <!-- Bottom URL Tag -->
    <text x="1100" y="534" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#C9A96E" text-anchor="end">voyage-ai-beige.vercel.app</text>
  </svg>
  `;

  const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');
  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile(outputPath);

  console.log(`Successfully generated OG image at ${outputPath} (${width}x${height})`);
}

generateOgImage().catch(err => {
  console.error('Error generating OG image:', err);
  process.exit(1);
});
