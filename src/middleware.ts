import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * SHREDoo Clerk Authentication Middleware
 *
 * Runs non-blocking clerkMiddleware across all application routes and API endpoints.
 * Populates auth tokens and user sessions without throwing forced redirects to /sign-in,
 * allowing guest previews, room links, and logged-in creators to navigate without disruption.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
