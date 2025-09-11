/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  // Prevent Next from trying to bundle optional 'canvas' used by pdfjs in Node.
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }
    config.externals = [...(config.externals || []), 'canvas']
    return config
  },
}

module.exports = nextConfig;
