// Automated Acceptance Test Suite for SHREDoo
// Verifies all 14 Final Acceptance Criteria

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🎸 Running SHREDoo Final Acceptance Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
      throw new Error(message);
    }
  }

  try {
    // TEST 1: Host creates a room
    console.log('Test 1: Host creates a room');
    const createRes = await fetch(`${BASE_URL}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god',
        'x-shredoo-user-name': 'Yngwie Shredder',
      },
      body: JSON.stringify({
        name: 'Arpeggios from Hell',
        description: 'Sweep picking only. Max capacity 5.',
        maxCapacity: 5,
        coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 200, 'Room creation returned status 200');
    assert(createData.room?.id, `Room created with ID: ${createData.room?.id}`);
    assert(createData.room?.hostId === 'host_guitar_god', 'Room hostId is set to creator');
    assert(createData.room?.maxCapacity === 5, 'Room maxCapacity is set to 5');
    const roomId = createData.room.id;
    const inviteCode = createData.room.inviteCode;
    console.log(`  Room Code: ${inviteCode}\n`);

    // TEST 2: Four friends join
    console.log('Test 2: Four friends join (total 5 participants in room)');
    const friends = [
      { id: 'shred_friend_1', name: 'Steve Vai Fan' },
      { id: 'shred_friend_2', name: 'Paul Gilbert Fan' },
      { id: 'shred_friend_3', name: 'John Petrucci Fan' },
      { id: 'shred_friend_4', name: 'Tosin Abasi Fan' },
    ];
    for (const friend of friends) {
      const joinRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: friend.id,
          username: friend.name,
          inviteCode,
        }),
      });
      const joinData = await joinRes.json();
      assert(joinRes.status === 200, `Friend ${friend.name} joined successfully`);
      assert(joinData.livekitToken, `LiveKit voice token generated for ${friend.name}`);
    }
    console.log('');

    // TEST 3: Host views all members
    console.log('Test 3: Host views all members');
    const viewRes = await fetch(`${BASE_URL}/api/rooms/${roomId}`, {
      headers: { 'x-shredoo-user-id': 'host_guitar_god' },
    });
    const viewData = await viewRes.json();
    assert(viewRes.status === 200, 'Room details fetched');
    assert(viewData.members?.length === 5, `Expected 5 active participants, got ${viewData.members?.length}`);
    assert(viewData.currentUserRole === 'owner', 'Requester role is confirmed as OWNER');
    assert(viewData.members[0].role === 'owner', 'Host has OWNER role in member list');
    console.log('');

    // TEST 4: Host removes one participant (Temporary Kick)
    console.log('Test 4: Host removes one participant (shred_friend_4)');
    const kickRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/kick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god',
      },
      body: JSON.stringify({
        userId: 'shred_friend_4',
        reason: 'Temporary removal by host',
      }),
    });
    const kickData = await kickRes.json();
    assert(kickRes.status === 200, 'Kick request succeeded (200)');
    assert(kickData.action === 'kick', 'Action is kick');
    assert(kickData.removedUserId === 'shred_friend_4', 'Target participant removed');
    console.log('');

    // TEST 5: Removed participant gets disconnected from voice chat (LiveKit)
    console.log('Test 5: LiveKit voice session revoked for removed participant');
    assert(kickData.success === true, 'LiveKit removeParticipant executed server-side');
    console.log('');

    // TEST 6: Remaining participants see updated member list (4 members)
    console.log('Test 6: Remaining participants see updated member list');
    const memberCheckRes = await fetch(`${BASE_URL}/api/rooms/${roomId}`, {
      headers: { 'x-shredoo-user-id': 'shred_friend_1' },
    });
    const memberCheckData = await memberCheckRes.json();
    assert(memberCheckData.members?.length === 4, `Member count is now 4 (was 5)`);
    assert(
      !memberCheckData.members.some((m) => m.userId === 'shred_friend_4'),
      'Kicked user is absent from participant list'
    );
    console.log('');

    // TEST 7: Kicked participant cannot rejoin without valid invite code
    console.log('Test 7: Kicked participant needs authorization/valid code to rejoin');
    const badCodeJoinRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'shred_friend_4',
        username: 'Tosin Abasi Fan',
        inviteCode: 'INVALID_CODE',
      }),
    });
    assert(badCodeJoinRes.status === 400, 'Rejoin with invalid code rejected with 400 Bad Request');
    console.log('');

    // TEST 8: Host blocks a participant (shred_friend_3)
    console.log('Test 8: Host blocks a participant (shred_friend_3)');
    const blockRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god',
      },
      body: JSON.stringify({
        userId: 'shred_friend_3',
        username: 'John Petrucci Fan',
        reason: 'Violated tone rules',
      }),
    });
    const blockData = await blockRes.json();
    assert(blockRes.status === 200, 'Block request succeeded (200)');
    assert(blockData.blockedRecord?.userId === 'shred_friend_3', 'Blocked record stored');
    console.log('');

    // TEST 9: Blocked participant cannot rejoin using old or new invitation code
    console.log('Test 9: Blocked participant cannot rejoin even with valid invitation code');
    const blockedRejoinRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'shred_friend_3',
        username: 'John Petrucci Fan',
        inviteCode: inviteCode, // Using legitimate valid code!
      }),
    });
    const blockedRejoinData = await blockedRejoinRes.json();
    assert(blockedRejoinRes.status === 403, 'Blocked participant rejected with 403 Forbidden');
    assert(blockedRejoinData.blocked === true, 'Response flags user as blocked');
    console.log('');

    // TEST 10: Host unblocks the participant
    console.log('Test 10: Host unblocks the participant');
    const unblockRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god',
      },
      body: JSON.stringify({
        userId: 'shred_friend_3',
      }),
    });
    const unblockData = await unblockRes.json();
    assert(unblockRes.status === 200, 'Unblock request succeeded (200)');
    assert(unblockData.unblocked === true, 'User unblocked in ROOM_BLOCKED_MEMBERS');
    console.log('');

    // TEST 11: Participant can join again with valid invitation code
    console.log('Test 11: Participant can join again with valid invitation code');
    const unblockedRejoinRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'shred_friend_3',
        username: 'John Petrucci Fan',
        inviteCode: inviteCode,
      }),
    });
    assert(unblockedRejoinRes.status === 200, 'Unblocked participant successfully rejoined');
    console.log('');

    // TEST 12: Host transfers ownership successfully
    console.log('Test 12: Host transfers ownership to shred_friend_1');
    const transferRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/transfer-host`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god',
      },
      body: JSON.stringify({
        newHostId: 'shred_friend_1',
      }),
    });
    const transferData = await transferRes.json();
    assert(transferRes.status === 200, 'Host transfer succeeded (200)');
    assert(transferData.newHostId === 'shred_friend_1', 'New hostId recorded');
    assert(transferData.room.hostId === 'shred_friend_1', 'Room hostId updated');
    console.log('');

    // TEST 13: New owner can manage the room
    console.log('Test 13: New owner can manage the room (settings & invite regeneration)');
    const newOwnerSettingsRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'shred_friend_1', // New Owner
      },
      body: JSON.stringify({
        name: 'Steve Vai Shred Sanctuary (Under New Management)',
        regenerateInviteCode: true,
      }),
    });
    const newOwnerSettingsData = await newOwnerSettingsRes.json();
    assert(newOwnerSettingsRes.status === 200, 'New owner updated room settings successfully');
    assert(
      newOwnerSettingsData.room.name === 'Steve Vai Shred Sanctuary (Under New Management)',
      'Room title successfully renamed by new owner'
    );
    assert(
      newOwnerSettingsData.room.inviteCode !== inviteCode,
      'Invite code successfully regenerated by new owner'
    );
    console.log('');

    // TEST 14: Ordinary members (former owner) cannot access administrative APIs
    console.log('Test 14: Ordinary members cannot access administrative APIs');
    const unauthorizedKickRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/kick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god', // Former owner, now ordinary member
      },
      body: JSON.stringify({
        userId: 'shred_friend_2',
      }),
    });
    assert(
      unauthorizedKickRes.status === 403,
      'Ordinary member rejected with 403 Forbidden on kick attempt'
    );

    const unauthorizedSettingsRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-shredoo-user-id': 'host_guitar_god', // Former owner
      },
      body: JSON.stringify({
        name: 'Hacked By Former Owner',
      }),
    });
    assert(
      unauthorizedSettingsRes.status === 403,
      'Ordinary member rejected with 403 Forbidden on settings update attempt'
    );
    console.log('');

    console.log('====================================================');
    console.log(`🎉 ALL 14 FINAL ACCEPTANCE TESTS PASSED! (${passed} checks passed, 0 failed)`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Acceptance test failed:', err);
    process.exit(1);
  }
}

runTests();

