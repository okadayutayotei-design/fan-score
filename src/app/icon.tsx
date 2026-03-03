import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0f2557 0%, #1a3a7a 50%, #1e4494 100%)",
          borderRadius: "6px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top line */}
        <div
          style={{
            position: "absolute",
            top: "4px",
            left: "6px",
            right: "6px",
            height: "1px",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
          }}
        />
        {/* Bottom line */}
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "6px",
            right: "6px",
            height: "1px",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: "14px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.5px",
          }}
        >
          FS
        </div>
      </div>
    ),
    { ...size }
  );
}
