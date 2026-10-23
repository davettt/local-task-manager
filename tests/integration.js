const http = require('http');

const results = { passed: 0, failed: 0, errors: [] };

function check(label, ok, detail) {
  if (ok) {
    results.passed++;
  } else {
    results.failed++;
    results.errors.push(`FAIL [${label}] — ${detail}`);
  }
}

// fetch cannot override Host, so the rebinding test sends a raw request
function rawRequest(base, { method = 'GET', path, headers = {}, body }) {
  const url = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: url.hostname, port: url.port, method, path, headers },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res));
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function run(base) {
  console.log(`\nIntegration tests against ${base}\n`);
  const port = new URL(base).port;
  const ownOrigin = `http://127.0.0.1:${port}`;

  // Network exposure: DNS rebinding
  const rebound = await rawRequest(base, {
    path: '/api/tasks',
    headers: { Host: `evil.example:${port}` },
  });
  check('Foreign Host refused', rebound.statusCode === 403, `got ${rebound.statusCode}`);

  // Network exposure: no CORS grant to other local origins
  const corsRes = await fetch(`${base}/api/tasks`, {
    headers: { Origin: 'http://localhost:9999' },
  });
  check(
    'No CORS header for other origins',
    !corsRes.headers.get('access-control-allow-origin'),
    `got ${corsRes.headers.get('access-control-allow-origin')}`
  );

  // Network exposure: cross-site writes refused before the route runs
  const noBody = await fetch(`${base}/api/archive/cleanup`, {
    method: 'POST',
    headers: { Origin: 'https://evil.example' },
  });
  check('Cross-site no-body POST refused', noBody.status === 403, `got ${noBody.status}`);

  const crossPut = await fetch(`${base}/api/settings`, {
    method: 'PUT',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  check('Cross-site PUT refused', crossPut.status === 403, `got ${crossPut.status}`);

  const ownPut = await fetch(`${base}/api/settings`, {
    method: 'PUT',
    headers: { Origin: ownOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  check('Own-origin PUT allowed', ownPut.status === 200, `got ${ownPut.status}`);

  // Security headers from helmet
  const page = await fetch(`${base}/`);
  check(
    'CSP header present',
    (page.headers.get('content-security-policy') || '').includes("script-src 'self'"),
    'missing or wrong content-security-policy'
  );
  check(
    'X-Content-Type-Options nosniff',
    page.headers.get('x-content-type-options') === 'nosniff',
    `got ${page.headers.get('x-content-type-options')}`
  );

  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  if (results.errors.length) {
    console.log('');
    results.errors.forEach((e) => console.log(`  ${e}`));
  }
  console.log('');

  return results.failed > 0 ? 1 : 0;
}

module.exports = { run };
