import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  classifyActionRisk,
  isLoopbackUrl,
  isPathWithinAllowedRoots,
} from '../../connectors/mrdev-connector/src/core/securityGuard.js';

test('isPathWithinAllowedRoots blocks path traversal outside sandbox', () => {
  const root = path.resolve('c:/Users/USER/Desktop/workspace/portafolio');
  assert.equal(isPathWithinAllowedRoots(path.join(root, 'src'), [root]), true);
  assert.equal(isPathWithinAllowedRoots(path.resolve('c:/Windows/System32'), [root]), false);
  assert.equal(isPathWithinAllowedRoots(path.join(root, '..', '..', 'secret.txt'), [root]), false);
});

test('isLoopbackUrl blocks SSRF to cloud metadata or LAN IPs', () => {
  assert.equal(isLoopbackUrl('http://127.0.0.1:8787/task'), true);
  assert.equal(isLoopbackUrl('ws://localhost:8788'), true);
  assert.equal(isLoopbackUrl('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(isLoopbackUrl('http://192.168.1.50:3000'), false);
});

test('classifyActionRisk detects critical and high risk commands', () => {
  assert.equal(classifyActionRisk('rm -rf /'), 'critical');
  assert.equal(classifyActionRisk('git push origin main'), 'high');
  assert.equal(classifyActionRisk('read src/App.tsx and summarize'), 'low');
});
