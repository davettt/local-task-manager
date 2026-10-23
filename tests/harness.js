const { spawn } = require('child_process');
const { mkdirSync, rmSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

const SERVER_PATH = join(__dirname, '..', 'src', 'server.js');
const TEST_PORT = 3098;
const TEST_DATA_DIR = join(tmpdir(), `local-task-manager-test-${Date.now()}`);

function seedTestData() {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  writeFileSync(join(TEST_DATA_DIR, 'tasks.json'), JSON.stringify({ tasks: [] }, null, 2));
  writeFileSync(join(TEST_DATA_DIR, 'config.json'), JSON.stringify({}, null, 2));
  writeFileSync(
    join(TEST_DATA_DIR, 'settings.json'),
    JSON.stringify({ timezone: 'Australia/Sydney' }, null, 2)
  );
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function run() {
  const testScript = process.argv[2] || 'smoke';

  console.log(`\n  Setting up isolated test environment...`);
  console.log(`  Data dir: ${TEST_DATA_DIR}`);
  console.log(`  Port: ${TEST_PORT}\n`);

  seedTestData();

  const server = spawn('node', [SERVER_PATH], {
    env: {
      ...process.env,
      DATA_DIR: TEST_DATA_DIR,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => (serverOutput += d));
  server.stderr.on('data', (d) => (serverOutput += d));

  try {
    await waitForServer(`http://127.0.0.1:${TEST_PORT}`);

    const testModule = require(`./${testScript}.js`);
    const exitCode = await testModule.run(`http://127.0.0.1:${TEST_PORT}`);

    process.exitCode = exitCode;
  } catch (err) {
    console.error(`\n  HARNESS ERROR: ${err.message}`);
    if (serverOutput) {
      console.error('\n  Server output:');
      serverOutput
        .split('\n')
        .slice(-10)
        .forEach((l) => console.error(`    ${l}`));
    }
    process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    try {
      rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    } catch {
      console.warn(`  Warning: could not clean up ${TEST_DATA_DIR}`);
    }
    console.log('  Isolated test environment torn down.\n');
  }
}

run();
