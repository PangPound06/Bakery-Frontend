/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the project root to my-app. Without this, Next 16 detects the stray
  // lockfile/node_modules in C:\Users\Pound\Study (parent) and infers it as the
  // workspace root, which breaks module resolution (e.g. "Can't resolve 'tailwindcss'").
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',  // อนุญาตทุก domain
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // หน้าทานในร้านเวอร์ชันก่อน → หน้าใหม่ (ลิงก์/บุ๊กมาร์กเก่ายังใช้ได้)
  async redirects() {
    return [
      { source: '/dine-in/cart', destination: '/dine-in', permanent: false },
      { source: '/order-detail', destination: '/dine-in/bill', permanent: false },
      { source: '/bill', destination: '/dine-in/bill', permanent: false },
      { source: '/bill/:path*', destination: '/dine-in/bill', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; img-src 'self' https: http: data: blob:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;