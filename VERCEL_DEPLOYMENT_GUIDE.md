# SHREDoo – Vercel Deployment Guide 🚀

Follow this step-by-step guide to deploy SHREDoo seamlessly to **Vercel**.

---

## 1. Quick Setup in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** → **"Project"**.
2. Select your repository: **`Shubham00043/Shredoo`**.
3. Framework Preset: **Next.js** (Automatically detected).
4. Root Directory: `./` (Leave as default).

---

## 2. Environment Variables Checklist

In the **Environment Variables** section of your Vercel project configuration, add the following variables (you can find your exact values in `.env.local`):

| Variable Name | Description | Example / Location |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key | `pk_test_...` from Clerk Dashboard |
| `CLERK_SECRET_KEY` | Clerk Secret Key | `sk_test_...` from Clerk Dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Redirect URL for sign in | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Redirect URL for sign up | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect after signing in | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect after signing up | `/` |
| `SUPER_ADMIN_CLERK_ID` | Your Clerk User ID for Super Admin access | `user_3M0MkJQViCz5QqOz8VytgaMT0Jw` |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL | `wss://shredoo-pl740hyo.livekit.cloud` |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit URL for Client WebRTC | `wss://shredoo-pl740hyo.livekit.cloud` |
| `LIVEKIT_API_KEY` | LiveKit Cloud API Key | `API8tcooy7YduF6` |
| `LIVEKIT_API_SECRET` | LiveKit Cloud API Secret | `UEHKrg...` |
| `JAMENDO_CLIENT_ID` | Official Jamendo API Client ID | `56d30c95` |

---

## 3. Important Vercel Configuration Notes

- **Clerk Allowed Redirect Origins**:
  Once Vercel assigns your production domain (e.g., `https://shredoo.vercel.app` or custom domain):
  1. Open your **Clerk Dashboard** → **Configure** → **Paths & Domains**.
  2. Add your Vercel URL to the authorized redirect domains so Google OAuth can complete smoothly.

- **Storage & Serverless Environment**:
  The application is pre-configured with fallback `/tmp` storage and streaming endpoint `/api/storage/file/[filename]` to guarantee zero `EROFS: read-only file system` errors on Vercel Serverless Functions.

- **Theme & Popover Styling**:
  The Clerk `UserButton` popover is built with `loungeClerkTheme`, ensuring crisp contrast, warm amber accents, and pure dark charcoal backgrounds out of the box on Vercel.

---

## 4. Deploy!

Click **Deploy** in Vercel. In ~60 seconds, your SHREDoo private collaborative listening lounge and Super Admin dashboard will be live!

