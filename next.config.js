/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: [
      'images.unsplash.com',
      'img.clerk.com',
      'i.ytimg.com',
      'avatar.vercel.sh',
      'api.dicebear.com'
    ],
  },
};

module.exports = nextConfig;

