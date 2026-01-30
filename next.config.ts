import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Use webpack instead of Turbopack (Turbopack has HMR issues with wagmi v3)
  turbopack: {},

  // Transpile wallet SDK packages
  transpilePackages: [
    '@rainbow-me/rainbowkit',
    'wagmi',
    'viem',
    '@tanstack/react-query',
  ],

  // CORS headers for Safe Apps iframe support
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, content-type, Authorization' },
        ],
      },
    ];
  },
  
  // Webpack configuration for wallet packages
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Handle ESM modules properly
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    
    return config;
  },
};

export default nextConfig;
