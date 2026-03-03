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
          background: "linear-gradient(145deg, #1e3a8a 0%, #3b82f6 40%, #06b6d4 100%)",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "18px",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          F
        </div>
      </div>
    ),
    { ...size }
  );
}
