// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a standalone server so Docker can run `node server.js`
  output: "standalone",
};

module.exports = nextConfig;
