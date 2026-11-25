import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onUserOnlineAlert, triggerUserOnlineAlert } from '../src/lib/onlineAlerts.js';

test('triggers online alert with username and notifies subscribers', () => {
  const received = [];
  const unsubscribe = onUserOnlineAlert((alert) => {
    received.push(alert);
  });

  const created = triggerUserOnlineAlert('GrandmasterAlex', 'https://example.com/avatar.png');
  assert.ok(created);
  assert.equal(created.username, 'GrandmasterAlex');
  assert.equal(created.avatarUrl, 'https://example.com/avatar.png');
  assert.equal(received.length, 1);
  assert.equal(received[0].username, 'GrandmasterAlex');

  unsubscribe();
  triggerUserOnlineAlert('AnotherPlayer');
  assert.equal(received.length, 1, 'Should not receive after unsubscribe');
});

test('ignores invalid or empty usernames', () => {
  assert.equal(triggerUserOnlineAlert(''), null);
  assert.equal(triggerUserOnlineAlert(null), null);
  assert.equal(triggerUserOnlineAlert('   '), null);
});
