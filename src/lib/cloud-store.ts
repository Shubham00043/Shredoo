import { createClerkClient } from '@clerk/backend';
import { Room } from '@/types';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_uEh9I47JEBi6cJHoMKLVCb4BZg64Hfq55FmsN0ESQC';
const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_CLERK_ID || 'user_3M0MkJQViCz5QqOz8VytgaMT0Jw';

let clerkClientInstance: ReturnType<typeof createClerkClient> | null = null;

function getClerk() {
  if (!clerkClientInstance) {
    clerkClientInstance = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  }
  return clerkClientInstance;
}

/**
 * Persists a room to Clerk Cloud Metadata so all Vercel Lambdas share state
 */
export async function saveRoomToCloud(room: Room): Promise<void> {
  try {
    const clerk = getClerk();
    // 1. Fetch current global rooms from super admin
    const adminUser = await clerk.users.getUser(SUPER_ADMIN_ID);
    const existingGlobal: Room[] = (adminUser.publicMetadata?.rooms as any[]) || [];
    
    // Replace or append
    const updatedGlobal = existingGlobal.filter((r) => r.id !== room.id);
    updatedGlobal.unshift(room);

    // Keep up to 50 active rooms
    const cappedGlobal = updatedGlobal.slice(0, 50);

    await clerk.users.updateUserMetadata(SUPER_ADMIN_ID, {
      publicMetadata: {
        ...adminUser.publicMetadata,
        rooms: cappedGlobal,
      },
    });

    // 2. Also save to host user if host is a valid Clerk user
    if (room.hostId && room.hostId.startsWith('user_')) {
      try {
        const hostUser = await clerk.users.getUser(room.hostId);
        const hostRooms: Room[] = (hostUser.publicMetadata?.rooms as any[]) || [];
        const updatedHostRooms = hostRooms.filter((r) => r.id !== room.id);
        updatedHostRooms.unshift(room);
        await clerk.users.updateUserMetadata(room.hostId, {
          publicMetadata: {
            ...hostUser.publicMetadata,
            rooms: updatedHostRooms.slice(0, 20),
          },
        });
      } catch (hostErr) {
        // Safe to ignore if hostId is a demo id
      }
    }
  } catch (err: any) {
    console.warn('Could not sync room to Clerk cloud:', err.message);
  }
}

/**
 * Retrieves all global rooms from Clerk Cloud Metadata
 */
export async function getCloudRooms(): Promise<Room[]> {
  try {
    const clerk = getClerk();
    const adminUser = await clerk.users.getUser(SUPER_ADMIN_ID);
    return (adminUser.publicMetadata?.rooms as Room[]) || [];
  } catch (err: any) {
    console.warn('Could not read rooms from Clerk cloud:', err.message);
    return [];
  }
}

/**
 * Finds a room by ID across Clerk Cloud Metadata
 */
export async function getRoomFromCloud(roomId: string): Promise<Room | null> {
  try {
    const rooms = await getCloudRooms();
    const found = rooms.find((r) => r.id === roomId);
    return found || null;
  } catch (err) {
    return null;
  }
}

/**
 * Finds a room by its invite code across Clerk Cloud Metadata
 */
export async function findRoomByCodeFromCloud(code: string): Promise<Room | null> {
  try {
    const clean = code.trim().toUpperCase();
    const rooms = await getCloudRooms();
    const found = rooms.find(
      (r) =>
        (r.inviteCode && r.inviteCode.toUpperCase() === clean) ||
        r.id.toUpperCase() === clean
    );
    return found || null;
  } catch (err) {
    return null;
  }
}

/**
 * Gets user's rooms from Clerk Cloud Metadata
 */
export async function getUserRoomsFromCloud(userId: string): Promise<Room[]> {
  try {
    const clerk = getClerk();
    if (userId.startsWith('user_')) {
      const user = await clerk.users.getUser(userId);
      const userRooms = (user.publicMetadata?.rooms as Room[]) || [];
      if (userRooms.length > 0) return userRooms;
    }
    const globalRooms = await getCloudRooms();
    return globalRooms.filter((r) => r.hostId === userId);
  } catch (err) {
    return [];
  }
}
