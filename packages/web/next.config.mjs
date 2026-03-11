// @ts-check
import { createRequire } from 'module';
import createNextIntlPlugin from 'next-intl/plugin';

// Ler versão do package.json automaticamente no build
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tarcisiojunior/shared'],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
