/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "canvas"],
  },
};

export default nextConfig;;