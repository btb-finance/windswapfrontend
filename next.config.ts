import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Empty turbopack config to silence warning (we're using webpack)
  turbopack: {},

  // Use webpack instead of turbopack for build
  webpack: (config, { isServer }) => {
    // Fix for pino and related modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    };

    // Alias for React Native async storage (not needed in web)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    // Ignore problematic modules
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    return config;
  },
};

export default nextConfig;
