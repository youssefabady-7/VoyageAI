const app = require('../server');
const http = require('http');

async function testEndpoints() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(3099, resolve));
  console.log('Test server running on port 3099');

  try {
    // 1. Test /api/health
    const healthRes = await fetch('http://localhost:3099/api/health');
    const healthData = await healthRes.json();
    console.log('Health check:', healthData.status);

    // 2. Test /api/chat with demo mode
    console.log('Testing /api/chat in demo mode...');
    const demoRes = await fetch('http://localhost:3099/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Plan a romantic 3-day Paris trip',
        history: [],
        clientApiKey: 'demo'
      })
    });
    const demoData = await demoRes.json();
    console.log('Demo mode status:', demoRes.status, 'isDemo:', demoData.isDemo);
    console.log('Demo response preview:', demoData.response ? demoData.response.slice(0, 120) + '...' : 'none');

    // 3. Test /case-study route resolves HTML
    const csRes = await fetch('http://localhost:3099/case-study');
    console.log('/case-study status:', csRes.status);
    const csText = await csRes.text();
    console.log('Contains TL;DR:', csText.includes('1. TL;DR'));

    // 4. Test /robots.txt resolves
    const robotsRes = await fetch('http://localhost:3099/robots.txt');
    const robotsText = await robotsRes.text();
    console.log('robots.txt status:', robotsRes.status, 'Domain correct:', robotsText.includes('voyage-ai-beige.vercel.app'));

    // 5. Test /sitemap.xml resolves
    const sitemapRes = await fetch('http://localhost:3099/sitemap.xml');
    const sitemapText = await sitemapRes.text();
    console.log('sitemap.xml status:', sitemapRes.status, 'Contains case-study:', sitemapText.includes('/case-study'));

    console.log('\nAll local endpoint and chat tests completed successfully!');
  } finally {
    server.close();
  }
}

testEndpoints().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
