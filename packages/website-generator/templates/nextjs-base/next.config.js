/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Performance requirement: Next.js's built-in image optimizer handles
    // resizing/format conversion/lazy-loading automatically for every
    // <Image> in components/sections/*.tsx — no component needs to
    // implement optimization itself. Google Places photo hosts are
    // allow-listed since Business.photos references come from there
    // (Module M5); remote patterns are additive, safe to extend later.
    remotePatterns: [
      { protocol: 'https', hostname: 'places.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
