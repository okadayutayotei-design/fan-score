import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent - top right */}
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "-30px",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Glow accent - bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            left: "-20px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Diagonal light streak */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)",
            display: "flex",
          }}
        />
        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0px",
          }}
        >
          {/* Abstract score meter / rising bars */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "5px",
              marginBottom: "6px",
            }}
          >
            <div style={{ width: "10px", height: "22px", borderRadius: "3px", background: "rgba(255,255,255,0.35)", display: "flex" }} />
            <div style={{ width: "10px", height: "34px", borderRadius: "3px", background: "rgba(255,255,255,0.5)", display: "flex" }} />
            <div style={{ width: "10px", height: "50px", borderRadius: "3px", background: "rgba(255,255,255,0.7)", display: "flex" }} />
            <div style={{ width: "10px", height: "42px", borderRadius: "3px", background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)", display: "flex" }} />
            <div style={{ width: "10px", height: "60px", borderRadius: "3px", background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)", display: "flex" }} />
          </div>
          {/* Text */}
          <div
            style={{
              display: "flex",
              fontSize: "42px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            FS
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
