import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
  generateCryptoRoomCode,
  hashRoomCode,
  reserveUniqueRoomCode,
  createRoom,
  findRoomByCode,
  validateRoomInviteCode,
  getStore,
} from '../src/lib/firestore.ts';

async function testSuite() {
  console.log('--- RUNNING ROOM CODE UNIFICATION & PWA TESTS ---');

  // Test 1: generateCryptoRoomCode produces 6-character codes
  const code6 = generateCryptoRoomCode(6);
  console.log('Generated code (6 chars):', code6);
  assert.strictEqual(code6.length, 6, 'Generated code should have length 6');
  assert.match(code6, /^SH[A-Z0-9]{4}$/, 'Generated code should start with SH and have 4 alphanumeric chars');

  // Test 2: reserveUniqueRoomCode works and stores reservation
  const testRoomId = 'test-room-' + Date.now();
  const { code: reservedCode, codeHash } = await reserveUniqueRoomCode(testRoomId);
  console.log('Reserved code:', reservedCode);
  assert.strictEqual(reservedCode.length, 6, 'Reserved code should have length 6');
  assert.strictEqual(hashRoomCode(reservedCode), codeHash, 'Code hash must match');

  // Test 3: Create room with 6-character code
  const room6 = await createRoom({
    id: testRoomId,
    name: 'Jazz Den',
    description: 'Chill listening',
    coverImage: 'https://example.com/cover.jpg',
    hostId: 'host_test',
    hostName: 'Test Host',
    hostAvatar: 'https://example.com/avatar.jpg',
    inviteCode: reservedCode,
    inviteCodeHash: codeHash,
    maxCapacity: 5,
    isClosed: false,
    musicPermissions: { whoCanAdd: 'everyone', whoCanControl: 'host_only' },
  });

  // Test 4: Lookup 6-character code via findRoomByCode
  const found6 = await findRoomByCode(reservedCode.toLowerCase()); // test case insensitivity
  assert(found6, 'Should find room by 6-character code');
  assert.strictEqual(found6.id, testRoomId, 'Found room ID must match');

  // Test 5: Backward compatibility: 8-character code like SHRDD2RQ
  const legacyRoomId = 'legacy-room-8';
  const legacyCode = 'SHRDD2RQ';
  const legacyCodeHash = hashRoomCode(legacyCode);

  const store = getStore();
  store.roomCodes[legacyCodeHash] = {
    codeHash: legacyCodeHash,
    code: legacyCode,
    roomId: legacyRoomId,
    createdAt: new Date().toISOString(),
    active: true,
  };

  const room8 = await createRoom({
    id: legacyRoomId,
    name: 'Legacy 8-Char Lounge',
    description: 'Testing 8-char code compatibility',
    coverImage: 'https://example.com/cover.jpg',
    hostId: 'host_legacy',
    hostName: 'Legacy Host',
    hostAvatar: 'https://example.com/avatar.jpg',
    inviteCode: legacyCode,
    inviteCodeHash: legacyCodeHash,
    maxCapacity: 5,
    isClosed: false,
    musicPermissions: { whoCanAdd: 'everyone', whoCanControl: 'host_only' },
  });

  const found8 = await findRoomByCode('shrdd2rq'); // lowercase
  assert(found8, 'Should find room by 8-character code SHRDD2RQ');
  assert.strictEqual(found8.id, legacyRoomId);

  // Test 6: validateRoomInviteCode verifies both formats
  assert(validateRoomInviteCode(room6, reservedCode), 'validateRoomInviteCode must accept 6-char code');
  assert(validateRoomInviteCode(room8, '  SHRDD2RQ  '), 'validateRoomInviteCode must accept 8-char code with whitespace');
  assert(!validateRoomInviteCode(room8, 'INVALID9'), 'validateRoomInviteCode must reject wrong code');

  // Test 7: Verify PWA asset files exist in public/
  const publicDir = path.resolve(process.cwd(), 'public');
  const requiredFiles = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.ico'];
  for (const file of requiredFiles) {
    const fullPath = path.join(publicDir, file);
    assert(fs.existsSync(fullPath), `Public asset ${file} must exist`);
    const stat = fs.statSync(fullPath);
    assert(stat.size > 0, `Public asset ${file} must not be empty`);
    console.log(`Verified PWA asset: ${file} (${stat.size} bytes)`);
  }

  console.log('\n--- ALL ROOM CODE & PWA TESTS PASSED SUCCESSFULLY! ---');
}

testSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
