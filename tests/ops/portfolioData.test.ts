import assert from 'node:assert/strict';
import test from 'node:test';
import { PROJECTS, MRDEV_CONTACT } from '../../src/data/projects.js';

test('Portfolio data contains all 7 production projects with valid URLs and contact info', () => {
  assert.equal(PROJECTS.length, 7);
  for (const p of PROJECTS) {
    assert.ok(p.id.length > 0);
    assert.ok(p.url.startsWith('https://'));
    assert.ok(p.kpis.length >= 3);
    assert.ok(p.screenshotPath.startsWith('/screenshots/'));
  }
  assert.equal(MRDEV_CONTACT.email, 'camilovelascoofficial@gmail.com');
  assert.equal(MRDEV_CONTACT.whatsappRaw, '573117284178');
});
