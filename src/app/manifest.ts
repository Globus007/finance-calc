import type { MetadataRoute } from "next";

/**
 * Web App Manifest for mobile install (Add to Home Screen).
 * Online-first: no service worker / offline queue (issue #30, PRD non-goals).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Финансы",
    short_name: "Финансы",
    description: "Личный учёт расходов и доходов (BYN)",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F3F0FA",
    theme_color: "#F3F0FA",
    lang: "ru",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
