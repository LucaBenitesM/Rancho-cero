import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  // En Vercel el optimizador de imágenes (/_next/image) responde 404 con la
  // configuración de "services" de vercel.json, y las fotos no cargan. Se
  // sirven tal cual desde /public (ya vienen livianas: 100–220 KB).
  images: {
    unoptimized: true,
  },
};

export default withVarlock(nextConfig);
