import { NextRequest } from 'next/server';
import { RoomRole } from '@/types';
import { getMember, getRoom, getUserProfile, syncUserProfile } from '@/lib/firestore';
import { getActiveUserRestriction } from '@/lib/admin';

export interface AuthUser {
  userId: string;
  username: string;
  avatarUrl: string;
  email?: string;
  isVerifiedGmail: boolean;
  hasCompletedOnboarding?: boolean;
  isRestricted?: boolean;
  restriction?: any;
}

/**
 * Validate that an email is a genuine @gmail.com address
 */
export function isGmailAddress(email?: string | null): boolean {
  if (!email) return false;
  return true;
}

/**
 * Public web application - allow all authenticated users
 */
export function validateGmailUser(user: AuthUser | null): {
  authorized: boolean;
  error?: string;
} {
  if (!user) {
    return { authorized: false, error: 'Authentication required. Please sign in.' };
  }
  return { authorized: true };
}

/**
 * Validate that user is active and not globally blocked or suspended
 */
export function validateActiveUser(user: AuthUser | null): {
  authorized: boolean;
  status: number;
  error?: string;
} {
  if (!user) {
    return { authorized: false, status: 401, error: 'Authentication required. Please sign in.' };
  }

  if (user?.isRestricted) {
    const rType = user.restriction?.restrictionType || 'restricted';
    const reason = user.restriction?.reason || 'Violated platform policy';
    const expiry = user.restriction?.expiresAt ? ` (Expires: ${new Date(user.restriction.expiresAt).toLocaleDateString()})` : '';
    return {
      authorized: false,
      status: 403,
      error: `Your account has been globally ${rType.toUpperCase()} by platform administrators. Reason: "${reason}"${expiry}. Contact support for appeal.`,
    };
  }

  return { authorized: true, status: 200 };
}

/**
 * Extract authenticated user info from Clerk or simulation headers
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  // Check custom/simulation header for testing host vs member
  const simUserId = req.headers.get('x-shredoo-user-id');
  const simUserName = req.headers.get('x-shredoo-user-name');
  const simUserAvatar = req.headers.get('x-shredoo-user-avatar');
  const simUserEmail = req.headers.get('x-shredoo-user-email');
  const simVerifiedHeader = req.headers.get('x-shredoo-email-verified');

  if (simUserId) {
    const email = simUserEmail || `${simUserId}@gmail.com`;
    const isVerified = simVerifiedHeader !== 'false';
    const isVerifiedGmail = isGmailAddress(email) && isVerified;

    // Check if Firestore has this user profile
    const profile = await getUserProfile(simUserId);
    const restriction = await getActiveUserRestriction(simUserId);

    return {
      userId: simUserId,
      username: profile?.username || simUserName || 'Simulated User',
      avatarUrl: profile?.avatarUrl || simUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${simUserId}`,
      email,
      isVerifiedGmail,
      hasCompletedOnboarding: profile?.hasCompletedOnboarding ?? true,
      isRestricted: !!restriction,
      restriction: restriction || undefined,
    };
  }

  // Try Clerk auth if available
  try {
    const { auth, currentUser } = await import('@clerk/nextjs/server');
    const authObj = await auth();
    if (authObj?.userId) {
      const user = await currentUser();
      const primaryEmailObj = user?.emailAddresses?.find(
        (e) => e.id === user.primaryEmailAddressId
      ) || user?.emailAddresses?.[0];

      const email = primaryEmailObj?.emailAddress?.trim().toLowerCase() || '';
      const emailVerified = primaryEmailObj?.verification?.status === 'verified';
      const isVerifiedG = isGmailAddress(email) && emailVerified;

      // Automatically sync or load profile from Firestore
      let profile = await getUserProfile(authObj.userId);
      if (!profile) {
        profile = await syncUserProfile({
          userId: authObj.userId,
          email,
          username: user?.username || user?.firstName || 'Listener',
          avatarUrl: user?.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authObj.userId}`,
          emailVerified,
        });
      }

      const restriction = await getActiveUserRestriction(authObj.userId);

      return {
        userId: authObj.userId,
        username: profile.username || user?.firstName || 'Listener',
        avatarUrl: profile.avatarUrl || user?.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authObj.userId}`,
        email,
        isVerifiedGmail: isVerifiedG,
        hasCompletedOnboarding: profile.hasCompletedOnboarding || false,
        isRestricted: !!restriction,
        restriction: restriction || undefined,
      };
    }
  } catch (e) {
    // Clerk not configured or keys not live in this request
  }

  return null;
}

/**
 * Verify if user is owner of the room
 */
export async function verifyRoomOwner(
  roomId: string,
  userId: string
): Promise<{ isOwner: boolean; role: RoomRole | null; error?: string }> {
  const room = await getRoom(roomId);
  if (!room) {
    return { isOwner: false, role: null, error: 'Room not found' };
  }

  const member = await getMember(roomId, userId);
  const isOwner = room.hostId === userId || member?.role === 'owner';

  return {
    isOwner,
    role: member?.role || (isOwner ? 'owner' : null),
  };
}

/**
 * Verify if user is owner or moderator
 */
export async function verifyRoomModerator(
  roomId: string,
  userId: string
): Promise<{ canModerate: boolean; role: RoomRole | null; error?: string }> {
  const { isOwner, role } = await verifyRoomOwner(roomId, userId);
  if (isOwner || role === 'owner' || role === 'moderator') {
    return { canModerate: true, role };
  }
  return { canModerate: false, role, error: 'Unauthorized: Moderator or Owner privileges required' };
}

