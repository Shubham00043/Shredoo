# SHREDoo – Private Collaborative Listening Rooms & Host Control

SHREDoo is a full-stack, collaborative private music listening room with real-time LiveKit voice chat, individual participant audio mixers, synchronized shared music queues, and complete host administrative authority.

---

## 🚀 Key Features

### 1. Host Administrator Privileges
- **Automatic Host Assignment**: The creator of a room automatically becomes its `OWNER`/`HOST`.
- **Dedicated Room Management Panel**: Accessed via the host-only Settings icon, featuring 7 dedicated configuration tabs:
  1. **General Settings**: Rename room, update description, set maximum capacity (2–5 participants), close/reopen room, or permanently delete the room.
  2. **Members**: Real-time list of all participants with avatars, usernames, roles, join times, connection status (Connected / Reconnecting / Disconnected), and three-dot contextual action menu.
  3. **Invitation & Privacy**: View invite code, 1-click **Regenerate Invitation Code** (immediately invalidates the previous code), and copy direct join links.
  4. **Music Permissions**: Fine-grained access control toggles for "Who can add songs to the queue" and "Who can control playback" (`Everyone` vs `Host Only`).
  5. **Room Appearance**: Change room cover image using custom URLs or curated audiophile presets.
  6. **Blocked Members**: View room-specific blocklist with timestamps, reasons, and 1-click **Unblock User** action.
  7. **Transfer Ownership**: Securely transfer full administrative ownership to another active participant.

### 2. Participant Removal & LiveKit Voice Revocation
- **Contextual Action Menu**: Three-dot menu (`...`) next to every participant in the member list and on their voice card:
  - **View Profile**: Inspect join time, status, audio stream, and permissions.
  - **Remove from Room (Temporary Kick)**: Confirms selected participant, removes them from Firestore `ROOM_MEMBERS`, terminates their active LiveKit voice session via `RoomServiceClient.removeParticipant()`, and updates the member list in real-time.
  - **Block from Rejoining (Permanent Room Restriction)**: Removes the participant, adds them to `ROOM_BLOCKED_MEMBERS`, disconnects LiveKit voice chat, and prevents them from rejoining even if they obtain a valid invitation code.

### 3. Individual Audio Mixer & Synced Music Player
- **Individual Voice Mixer**: Independent volume sliders (0% to 200%) for each participant, with per-user mute toggles.
- **Microphone & Deaf Controls**: Toggle personal microphone state and deafen room audio.
- **Synced Shared Player**: Synced playback position, HTML5 audio playback, progress scrubber, and upcoming playlist queue respecting host-defined permissions.

---

## 📡 REST API Endpoints

| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `POST` | `/api/rooms/create` | Create a new private room | Authenticated User |
| `GET` | `/api/rooms` | List all active rooms | Public |
| `GET` | `/api/rooms/[roomId]` | Get room metadata, members, and playlist | Public / Member |
| `DELETE` | `/api/rooms/[roomId]` | Permanently delete room and LiveKit session | Room Owner |
| `POST` | `/api/rooms/[roomId]/join` | Join room with invitation code | Code + Capacity + Not Blocked |
| `POST` | `/api/rooms/[roomId]/kick` | Temporarily kick participant and revoke voice | Host / Moderator |
| `POST` | `/api/rooms/[roomId]/block` | Permanently block participant from room | Room Owner |
| `POST` | `/api/rooms/[roomId]/unblock` | Remove block restriction | Room Owner |
| `POST` | `/api/rooms/[roomId]/transfer-host` | Transfer ownership to another member | Room Owner |
| `PATCH` | `/api/rooms/[roomId]/settings` | Update room settings / regenerate invite code | Room Owner |
| `DELETE` | `/api/rooms/[roomId]/members/[userId]` | REST removal endpoint | Host / Moderator |
| `POST` | `/api/livekit/token` | Generate LiveKit JWT audio access token | Active Member (Not Blocked) |
| `POST` | `/api/rooms/[roomId]/music/queue` | Add track to shared queue | Based on `whoCanAdd` |
| `POST` | `/api/rooms/[roomId]/music/control` | Play / Pause / Next / Seek | Based on `whoCanControl` |

---

## 🧪 Acceptance Test Suite

The project includes an automated test runner validating all 14 criteria:

```bash
node test-acceptance.mjs
```

### Verified Acceptance Scenarios:
1. Host creates a room (creator is OWNER).
2. Four friends join (total 5 participants in room).
3. Host views all members (avatars, roles, join times, status).
4. Host removes one participant (temporary kick).
5. Removed participant gets disconnected from LiveKit voice session.
6. Remaining participants see the updated member list (count decrements).
7. Kicked participant cannot rejoin without authorization/valid code.
8. Host blocks a participant (stored in `ROOM_BLOCKED_MEMBERS`).
9. Blocked participant cannot rejoin even with a valid invitation code (403 Forbidden).
10. Host unblocks the participant.
11. Participant can join again with a valid invitation code.
12. Host transfers ownership successfully.
13. New owner can manage the room and regenerate invitation codes.
14. Ordinary members cannot access administrative APIs (403 Forbidden enforced).

