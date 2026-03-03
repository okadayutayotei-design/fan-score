import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "O.M.E FanScore",
    short_name: "FanScore",
    description: "ファン貢献度ポイント管理システム",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#3B82F6",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
