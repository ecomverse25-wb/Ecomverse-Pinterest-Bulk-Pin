import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Electron bundling
  output: 'standalone',

  webpack: (config, { isServer }) => {
    // If client-side, copy the PDF worker to the public folder
    if (!isServer) {
      const path = require('path');
      const CopyPlugin = require('copy-webpack-plugin');

      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
              to: path.join(process.cwd(), 'public/pdf.worker.min.mjs'),
            },
          ],
        })
      );
    }
    return config;
  },

  // Allow Turbopack (Next.js 16 default) to run without error
  turbopack: {},
};

export default nextConfig;
