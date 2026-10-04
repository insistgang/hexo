const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const projectPackage = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const projectDeployScript = fs.readFileSync(path.join(projectRoot, 'deploy.sh'), 'utf8');

function makeFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hexo-deploy-test-'));
  const projectDir = path.join(tempRoot, 'project');
  const callerDir = path.join(tempRoot, 'caller');
  const binDir = path.join(tempRoot, 'bin');
  const logPath = path.join(tempRoot, 'steps.log');

  fs.mkdirSync(projectDir);
  fs.mkdirSync(callerDir);
  fs.mkdirSync(path.join(callerDir, 'public'));
  fs.mkdirSync(binDir);

  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
    name: 'hexo-deploy-fixture',
    private: true,
    scripts: {
      test: 'node step.js test',
      build: 'node step.js build',
      audit: 'node step.js audit',
      deploy: projectPackage.scripts.deploy,
    },
  }));

  fs.writeFileSync(path.join(projectDir, 'step.js'), [
    "const { appendFileSync } = require('node:fs');",
    "const step = process.argv[2];",
    "appendFileSync(process.env.DEPLOY_TEST_LOG, `${step}:${process.cwd()}\\n`);",
    "if (process.env.DEPLOY_TEST_FAIL === step) process.exit(23);",
  ].join('\n'));

  const hexoStub = path.join(binDir, 'hexo');
  fs.writeFileSync(hexoStub, [
    '#!/usr/bin/env node',
    "const { appendFileSync } = require('node:fs');",
    "const step = `hexo-${process.argv[2]}`;",
    "appendFileSync(process.env.DEPLOY_TEST_LOG, `${step}:${process.cwd()}\\n`);",
    "if (process.env.DEPLOY_TEST_FAIL === step) process.exit(29);",
  ].join('\n'));
  fs.chmodSync(hexoStub, 0o755);

  const deployScript = path.join(projectDir, 'deploy.sh');
  fs.writeFileSync(deployScript, projectDeployScript);

  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  return {
    projectDir,
    callerDir,
    deployScript,
    logPath,
    env(failStep) {
      return {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        DEPLOY_TEST_LOG: logPath,
        ...(failStep ? { DEPLOY_TEST_FAIL: failStep } : {}),
        npm_config_update_notifier: 'false',
        npm_config_fund: 'false',
      };
    },
    steps() {
      try {
        return fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean)
          .map((line) => {
            const [step, cwd] = line.split(':');
            return { step, cwd };
          });
      } catch {
        return [];
      }
    },
  };
}

function runNpmDeploy(fixture, failStep) {
  return spawnSync('npm', ['run', 'deploy', '--silent'], {
    cwd: fixture.projectDir,
    env: fixture.env(failStep),
    encoding: 'utf8',
    timeout: 20_000,
  });
}

function runDeployShell(fixture, failStep) {
  return spawnSync('bash', [fixture.deployScript], {
    cwd: fixture.callerDir,
    env: fixture.env(failStep),
    encoding: 'utf8',
    timeout: 20_000,
  });
}

test('npm deploy runs test, build, and audit before invoking Hexo deploy', (t) => {
  const fixture = makeFixture(t);
  const result = runNpmDeploy(fixture, 'audit');

  assert.notEqual(result.status, 0, 'failed audit must fail the deploy command');
  assert.deepEqual(fixture.steps().map(({ step }) => step), ['test', 'build', 'audit']);
  assert.equal(fixture.steps().some(({ step }) => step === 'hexo-deploy'), false);
});

test('deploy.sh works from another cwd through the protected npm deploy entrypoint', (t) => {
  const fixture = makeFixture(t);
  const result = runDeployShell(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fixture.steps().map(({ step }) => step), [
    'test', 'build', 'audit', 'hexo-deploy',
  ]);
  assert.ok(
    fixture.steps().every(({ cwd }) => fs.realpathSync(cwd) === fs.realpathSync(fixture.projectDir)),
    `commands ran outside the project directory: ${JSON.stringify(fixture.steps())}`,
  );
  assert.match(result.stdout, /部署完成/);
});

test('deploy.sh propagates a failed check without deploying or printing success', (t) => {
  const fixture = makeFixture(t);
  const result = runDeployShell(fixture, 'audit');

  assert.notEqual(result.status, 0, 'a failed preflight check must fail the wrapper');
  assert.deepEqual(fixture.steps().map(({ step }) => step), ['test', 'build', 'audit']);
  assert.doesNotMatch(result.stdout, /部署完成/);
});

test('deploy.sh propagates a failed publish without printing success', (t) => {
  const fixture = makeFixture(t);
  const result = runDeployShell(fixture, 'hexo-deploy');

  assert.notEqual(result.status, 0, 'a failed Hexo deploy must fail the wrapper');
  assert.deepEqual(fixture.steps().map(({ step }) => step), [
    'test', 'build', 'audit', 'hexo-deploy',
  ]);
  assert.doesNotMatch(result.stdout, /部署完成/);
});
