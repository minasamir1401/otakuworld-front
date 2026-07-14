export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin',
    },
    sitemap: 'https://otakuworld.red-gate.tech/sitemap.xml',
  };
}
