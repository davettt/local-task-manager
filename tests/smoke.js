const results = { passed: 0, failed: 0, errors: [] };

async function test(base, method, path, { body, expectedStatus, description } = {}) {
  const expected = expectedStatus || 200;
  const label = description || `${method} ${path}`;
  const opts = { method };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${base}${path}`, opts);
    if (res.status === expected) {
      results.passed++;
    } else if (res.status >= 500) {
      results.failed++;
      results.errors.push(`FAIL [${label}] — expected ${expected}, got ${res.status} (server error)`);
    } else {
      results.failed++;
      results.errors.push(`FAIL [${label}] — expected ${expected}, got ${res.status}`);
    }
  } catch (err) {
    results.failed++;
    results.errors.push(`FAIL [${label}] — ${err.message}`);
  }
}

async function run(base) {
  console.log(`\nSmoke tests against ${base}\n`);

  await test(base, 'GET', '/api/health', { description: 'Health check' });
  await test(base, 'GET', '/', { description: 'Main page' });
  await test(base, 'GET', '/api/tasks', { description: 'Get tasks' });
  await test(base, 'GET', '/api/config', { description: 'Get config' });
  await test(base, 'GET', '/api/settings', { description: 'Get settings' });
  await test(base, 'GET', '/api/tasks/archived', { description: 'Get archived tasks' });
  await test(base, 'GET', '/api/tasks/archive-files', { description: 'Get archive files' });
  await test(base, 'GET', '/api/insights/tips', { description: 'Get insight tips' });

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
