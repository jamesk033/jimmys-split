import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jimmy's Split",
    short_name: "Jimmy's Split",
    description: "The lifting log by ICT_Jimmy: Upper / Lower split, checklists, weights and PRs.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050506",
    theme_color: "#050506",
    categories: ["health", "fitness", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Workout", short_name: "Workout", url: "/workout", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Key notes", short_name: "Notes", url: "/notes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
