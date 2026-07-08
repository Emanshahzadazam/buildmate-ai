import { useEffect, useRef } from "react";
import {
  generateElevation,
  generateRoofView,
  drawElevationOnCanvas,
  drawRoofOnCanvas,
} from "../../lib/elevationGenerator";

export default function ElevationCanvas({ layout, direction = "front" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;

    const parent = canvas.parentElement;
    const rect   = parent?.getBoundingClientRect();
    const width  = Math.max(700, (rect?.width  || 700) - 20);
    const height = Math.max(420, (rect?.height || 420) - 20);

    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    if (direction === "roof") {
      const roof = generateRoofView(layout);
      drawRoofOnCanvas(ctx, roof, width, height);
    } else {
      const elevation = generateElevation(layout, direction);
      drawElevationOnCanvas(ctx, elevation, width, height);
    }
  }, [layout, direction]);

  return (
    <div style={{
      width:"100%", height:"100%",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"12px",
      background:"linear-gradient(135deg,rgba(232,245,233,0.4),rgba(255,248,225,0.3))",
      borderRadius:"inherit",
    }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth:"100%", maxHeight:"100%",
          borderRadius:"12px",
          border:"1px solid rgba(200,215,225,0.5)",
          background:"white",
          boxShadow:"0 4px 20px rgba(0,0,0,0.06)",
        }}
      />
    </div>
  );
}