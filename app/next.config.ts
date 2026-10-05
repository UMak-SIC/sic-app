import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The pass renderer reads this OTF at runtime, so keep it in every serverless
  // function trace rather than relying on the host to provide a system font.
  outputFileTracingIncludes: {
    "/*": ["./fonts/Agrandir-Regular.otf"],
  },
};

export default nextConfig;
