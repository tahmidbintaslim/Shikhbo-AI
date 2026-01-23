import { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Enable experimental features for better performance
    experimental: {
        optimizePackageImports: ['@heroui/react', 'lucide-react'],
    },

    // Image optimization
    images: {
        domains: ['cdn.sanity.io'], // Add any image domains you might use
        formats: ['image/webp', 'image/avif'],
    },

    // Headers for security and performance
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
            {
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
                    },
                ],
            },
        ];
    },

    // Webpack optimization
    webpack: (config, { dev }) => {
        if (!dev) {
            // Enable webpack optimizations for production
            config.optimization = {
                ...config.optimization,
                moduleIds: 'deterministic',
                chunkIds: 'deterministic',
            };
        }
        return config;
    },
};

export default nextConfig;