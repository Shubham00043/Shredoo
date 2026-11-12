import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://shredoo-demo.livekit.cloud';

// Initialize LiveKit RoomServiceClient
let roomServiceClient: RoomServiceClient | null = null;

export function getRoomServiceClient(): RoomServiceClient {
  if (!roomServiceClient) {
    // LiveKit RoomServiceClient expects HTTP/HTTPS url instead of WSS
    const httpUrl = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
    roomServiceClient = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return roomServiceClient;
}

/**
 * Generate a LiveKit JWT token for room audio session
 */
export async function createLiveKitToken(
  roomId: string,
  userId: string,
  username: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: username,
    ttl: '6h',
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Server-side Participant Removal & Voice Disconnect
 * Revokes active LiveKit access and immediately terminates their voice connection.
 */
export async function removeLiveKitParticipant(
  roomId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client = getRoomServiceClient();
    await client.removeParticipant(roomId, userId);
    return { success: true, message: `Participant ${userId} disconnected from LiveKit room ${roomId}` };
  } catch (err: any) {
    // Handle case where user is not currently in LiveKit or offline
    console.warn(`[LiveKit] Could not remove participant ${userId} from LiveKit room ${roomId}:`, err?.message || err);
    return {
      success: true, // Still success since target is no longer active in audio
      message: err?.message || 'Participant already disconnected or offline from LiveKit',
    };
  }
}

/**
 * Server-side room deletion in LiveKit
 */
export async function deleteLiveKitRoom(roomId: string): Promise<boolean> {
  try {
    const client = getRoomServiceClient();
    await client.deleteRoom(roomId);
    return true;
  } catch (err: any) {
    console.warn(`[LiveKit] Delete room warning for ${roomId}:`, err?.message || err);
    return false;
  }
}

