/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) return [];
    
    // Trim trailing slash if present
    const targetUrl = backendUrl.replace(/\/$/, '');
    
    console.log(`[NextConfig] Proxying /api/:path* requests to ${targetUrl}/api/:path*`);
    return [
      {
        source: '/api/:path*',
        destination: `${targetUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
