"use client";

import dynamic from "next/dynamic";

const LightRays = dynamic(() => import("./LightRays"), { ssr: false });

export default function LightRaysClient() {
  return (
    <div style={{ width: "100%", height: "600px", position: "relative" }}>
      <LightRays className="absolute inset-0" />
    </div>
  );
}
