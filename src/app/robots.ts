import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/_next/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
