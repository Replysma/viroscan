/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['adm-zip', 'node-unrar-js'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // Permet au middleware Clerk de laisser passer les gros fichiers sans les tronquer
    middlewareClientMaxBodySize: 500 * 1024 * 1024,
  },
}

module.exports = nextConfig
