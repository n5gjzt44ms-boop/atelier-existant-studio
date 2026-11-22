/** @type {import('next').NextConfig} */
const isStatic = process.env.STATIC_EXPORT === '1';
const nextConfig = {
  reactStrictMode: true,
  // Mode statique (démo hébergeable sans serveur) : `npm run build:static`
  ...(isStatic ? { output: 'export', assetPrefix: './', trailingSlash: true } : {}),
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_STATIC: isStatic ? '1' : '0' },
};
export default nextConfig;
