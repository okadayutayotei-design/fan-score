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
          background: "linear-gradient(160deg, #0f2557 0%, #1a3a7a 35%, #1e4494 70%, #1a3570 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle top-right glow */}
        <div
          style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Subtle bottom-left glow */}
        <div
          style={{
            position: "absolute",
            bottom: "-15px",
            left: "-15px",
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Top decorative line */}
        <div
          style={{
            position: "absolute",
            top: "28px",
            left: "40px",
            right: "40px",
            height: "1px",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
          }}
        />
        {/* Bottom decorative line */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            left: "40px",
            right: "40px",
            height: "1px",
            background: "rgba(255,255,255,0.2)",
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
          {/* O.M.E text */}
          <div
            style={{
              display: "flex",
              fontSize: "46px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "2px",
              lineHeight: 1,
            }}
          >
            O.M.E
          </div>
          {/* Separator line */}
          <div
            style={{
              width: "60px",
              height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.8), transparent)",
              marginTop: "8px",
              marginBottom: "8px",
              display: "flex",
            }}
          />
          {/* FanScore sub-text */}
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 600,
              color: "rgba(147,197,253,0.9)",
              letterSpacing: "3px",
              lineHeight: 1,
            }}
          >
            FanScore
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
