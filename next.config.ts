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