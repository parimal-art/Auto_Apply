/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // keep nodemailer as a plain Node require on the server
    serverComponentsExternalPackages: ["nodemailer"],
  },
};

export default nextConfig;
