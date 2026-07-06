/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
  webpack: (config) => {
    // pdfjs-dist references an optional 'canvas' module for image rendering,
    // which we don't use (we only extract text). Tell webpack to ignore it
    // so it doesn't try to bundle a package that isn't installed.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;