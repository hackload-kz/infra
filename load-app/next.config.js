/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/load',
  assetPrefix: '/load',
  experimental: {
    serverComponentsExternalPackages: ['@kubernetes/client-node']
  }
}

module.exports = nextConfig