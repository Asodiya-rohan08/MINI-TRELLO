const test = require('node:test');
const assert = require('node:assert/strict');

test('server exports a start function and app instance for resilient startup', async () => {
  const serverModule = require('./server');

  assert.ok(serverModule && typeof serverModule === 'object');
  assert.ok(serverModule.app);
  assert.equal(typeof serverModule.startServer, 'function');
});
