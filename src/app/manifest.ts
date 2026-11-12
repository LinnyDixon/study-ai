import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STUDY AI — Tu espacio personal de estudio",
    short_name: "STUDY AI",
    description: "Lee, pregunta y organiza tu estudio desde cualquier dispositivo.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaff",
    theme_color: "#7759d8",
    icons: [{ src: "/study-ai-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
