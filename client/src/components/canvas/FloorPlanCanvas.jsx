import { useEffect, useRef } from "react";

const ROOM_COLORS = {
  bedroom:   "#E8F4F8",
  bathroom:  "#D4E8FF",
  kitchen:   "#FFF9E6",
  dining:    "#FFE8D4",
  drawing:   "#E8F0FF",
  living:    "#E8F8E8",
  lounge:    "#E8F8E8",
  garage:    "#F0F0F0",
  store:     "#F5F5F5",
  staircase: "#EFEFEF",
  corridor:  "#F7F7F5",
  other:     "#FAFAFA",
};

export default function FloorPlanCanvas({ layout, projectName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!layout || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width  = Math.max(800, (rect?.width  || 800) - 20);
    canvas.height = Math.max(620, (rect?.height || 620) - 20);
    drawArchitecturalFloorPlan(ctx, layout, canvas.width, canvas.height, projectName);
  }, [layout, projectName]);

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

/* ── Drawing logic — same visual output as before, with defensive guards
   added so a layout missing an optional field (e.g. an older record saved
   before `wallId` was required, or a variant with no openings/rooms yet)
   degrades gracefully instead of throwing mid-render. ── */

function getMetrics(layout) {
  const plot      = layout.plot       || {};
  const dims      = layout.dimensions || {};
  const buildable = layout.buildable  || {};
  const plotWidth  = dims.plotWidth  || plot.width  || plot.plotWidth  || (buildable.width  || 0) + 2 || 40;
  const plotLength = dims.plotLength || plot.length || plot.plotLength || (buildable.length || 0) + 2 || 70;
  return {
    plotWidth,
    plotLength,
    buildableWidth:  dims.buildableWidth  || buildable.width  || plotWidth,
    buildableLength: dims.buildableLength || buildable.length || plotLength,
    originX: buildable.min_x ?? buildable.offsetX ?? 0,
    originY: buildable.min_y ?? buildable.offsetY ?? 0,
  };
}

function drawOpening(ctx, opening, originX, originY, scale) {
  if (!opening) return;
  const x     = originX + (opening.x     || 0) * scale;
  const y     = originY + (opening.y     || 0) * scale;
  const width = (opening.width || 3) * scale;

  ctx.strokeStyle = opening.kind === "door" ? "#8B4513" : "#0099FF";
  ctx.fillStyle   = opening.kind === "door" ? "#8B4513" : "#87CEEB";
  ctx.lineWidth   = opening.kind === "door" ? 2 : 3;

  const direction = opening.direction;

  if (direction === "north") {
    const yLine = y;
    const x1 = x - width / 2, x2 = x + width / 2;
    if (opening.kind === "door") {
      ctx.beginPath(); ctx.moveTo(x1, yLine); ctx.lineTo(x2, yLine); ctx.stroke();
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(x1, yLine, width, 0, Math.PI / 2); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath(); ctx.moveTo(x1, yLine); ctx.lineTo(x2, yLine); ctx.stroke();
    }
  } else if (direction === "south") {
    const yLine = y;
    const x1 = x - width / 2, x2 = x + width / 2;
    if (opening.kind === "door") {
      ctx.beginPath(); ctx.moveTo(x1, yLine); ctx.lineTo(x2, yLine); ctx.stroke();
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(x2, yLine, width, Math.PI, (Math.PI * 3) / 2); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath(); ctx.moveTo(x1, yLine); ctx.lineTo(x2, yLine); ctx.stroke();
    }
  } else if (direction === "west") {
    const xLine = x;
    const y1 = y - width / 2, y2 = y + width / 2;
    if (opening.kind === "door") {
      ctx.beginPath(); ctx.moveTo(xLine, y1); ctx.lineTo(xLine, y2); ctx.stroke();
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(xLine, y1, width, Math.PI / 2, Math.PI); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath(); ctx.moveTo(xLine, y1); ctx.lineTo(xLine, y2); ctx.stroke();
    }
  } else if (direction === "east") {
    const xLine = x;
    const y1 = y - width / 2, y2 = y + width / 2;
    if (opening.kind === "door") {
      ctx.beginPath(); ctx.moveTo(xLine, y1); ctx.lineTo(xLine, y2); ctx.stroke();
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(xLine, y2, width, Math.PI * 1.5, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath(); ctx.moveTo(xLine, y1); ctx.lineTo(xLine, y2); ctx.stroke();
    }
  }

  ctx.fillStyle = opening.kind === "door" ? "#FF8C00" : "#0099FF";
  ctx.font = "9px Arial"; ctx.textAlign = "center";
  ctx.fillText(opening.label || (opening.kind === "door" ? "D" : "W"), x, y - 8);
}

function drawArchitecturalFloorPlan(ctx, layout, canvasWidth, canvasHeight, projectName) {
  if (!layout || !Array.isArray(layout.rooms) || layout.rooms.length === 0) {
    ctx.fillStyle = "#94a3b8"; ctx.font = "16px Arial"; ctx.textAlign = "center";
    ctx.fillText("No layout data available", canvasWidth / 2, canvasHeight / 2);
    return;
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const metrics = getMetrics(layout);
  const margin  = 60;
  const availableWidth  = canvasWidth  - 2 * margin;
  const availableHeight = canvasHeight - 2 * margin - 90;
  const scale = Math.min(availableWidth / Math.max(1, metrics.plotWidth), availableHeight / Math.max(1, metrics.plotLength));
  const offsetX = margin, offsetY = margin + 42;

  // Plot boundary
  ctx.strokeStyle = "#000000"; ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, metrics.plotWidth * scale, metrics.plotLength * scale);

  // Buildable boundary
  ctx.strokeStyle = "#888"; ctx.lineWidth = 1.25; ctx.setLineDash([6, 4]);
  ctx.strokeRect(offsetX + metrics.originX * scale, offsetY + metrics.originY * scale, metrics.buildableWidth * scale, metrics.buildableLength * scale);
  ctx.setLineDash([]);

  // Exterior walls
  ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(2, 0.75 * scale);
  ctx.beginPath();
  ctx.moveTo(offsetX + metrics.originX * scale, offsetY + metrics.originY * scale);
  ctx.lineTo(offsetX + (metrics.originX + metrics.buildableWidth) * scale, offsetY + metrics.originY * scale);
  ctx.lineTo(offsetX + (metrics.originX + metrics.buildableWidth) * scale, offsetY + (metrics.originY + metrics.buildableLength) * scale);
  ctx.lineTo(offsetX + metrics.originX * scale, offsetY + (metrics.originY + metrics.buildableLength) * scale);
  ctx.closePath(); ctx.stroke();

  // Rooms
  for (const room of layout.rooms) {
    if (!room) continue;
    const x = offsetX + (room.x || 0) * scale, y = offsetY + (room.y || 0) * scale;
    const w = (room.width || 0) * scale,       h = (room.height || 0) * scale;
    ctx.fillStyle = ROOM_COLORS[room.type] || room.color || "#F5F5F5";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#666666"; ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  // Openings
  if (Array.isArray(layout.openings)) {
    layout.openings.forEach((o) => drawOpening(ctx, o, offsetX, offsetY, scale));
  }

  // Room labels
  for (const room of layout.rooms) {
    if (!room) continue;
    const x = offsetX + (room.x || 0) * scale, y = offsetY + (room.y || 0) * scale;
    const w = (room.width || 0) * scale,       h = (room.height || 0) * scale;
    const cx = x + w / 2, cy = y + h / 2;
    const roomWidth  = room.width  || 0;
    const roomHeight = room.height || 0;
    const roomType   = room.type || "other";
    ctx.fillStyle = "#17324D"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(room.name || room.label || roomType.toUpperCase(), cx, cy - 8);
    ctx.fillStyle = "#334155"; ctx.font = "10px Arial";
    ctx.fillText(`${roomWidth.toFixed(1)}' × ${roomHeight.toFixed(1)}'`, cx, cy + 8);
    ctx.font = "9px Arial"; ctx.fillStyle = "#666";
    ctx.fillText(`${(roomWidth * roomHeight).toFixed(0)} sqft`, cx, cy + 21);
  }

  // North arrow
  const arrowX = offsetX + metrics.plotWidth * scale + 42, arrowY = offsetY + 28;
  ctx.fillStyle = "#000"; ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(arrowX, arrowY + 16); ctx.lineTo(arrowX, arrowY - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(arrowX - 6, arrowY - 6); ctx.lineTo(arrowX, arrowY - 16); ctx.lineTo(arrowX + 6, arrowY - 6); ctx.fill();
  ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.fillText("N", arrowX, arrowY + 34);

  // Dimension lines
  ctx.strokeStyle = "#D00000"; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
  const topDimY = offsetY - 24;
  ctx.beginPath(); ctx.moveTo(offsetX, topDimY); ctx.lineTo(offsetX + metrics.plotWidth * scale, topDimY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#D00000"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center";
  ctx.fillText(`${metrics.plotWidth.toFixed(1)}'`, offsetX + (metrics.plotWidth * scale) / 2, topDimY - 8);

  const rightDimX = offsetX + metrics.plotWidth * scale + 26;
  ctx.strokeStyle = "#D00000"; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(rightDimX, offsetY); ctx.lineTo(rightDimX, offsetY + metrics.plotLength * scale); ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(rightDimX + 8, offsetY + (metrics.plotLength * scale) / 2); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#D00000"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center";
  ctx.fillText(`${metrics.plotLength.toFixed(1)}'`, 0, 0);
  ctx.restore();

  // Title block
  ctx.fillStyle = "#111"; ctx.font = "bold 13px Arial"; ctx.textAlign = "left";
  ctx.fillText(`FLOOR PLAN - LAYOUT ${layout.variant || "A"}${layout.variantName ? " · " + layout.variantName : ""}`, offsetX, 25);
  ctx.font = "10px Arial"; ctx.fillStyle = "#444";
  ctx.fillText(`Project: ${projectName || "Untitled"}`, offsetX, 40);
  ctx.fillText(`Scale: auto-fit | Plot: ${metrics.plotWidth.toFixed(1)}' × ${metrics.plotLength.toFixed(1)}'`, offsetX, 54);

  // Legend
  const legendX = offsetX + metrics.plotWidth * scale - 150;
  const legendY = offsetY + metrics.plotLength * scale + 12;
  ctx.font = "9px Arial";
  [{ symbol:"■", color:"#8B4513", label:"Door" }, { symbol:"—", color:"#0099FF", label:"Window" }].forEach((item, i) => {
    ctx.fillStyle = item.color; ctx.fillText(item.symbol, legendX, legendY + i * 12);
    ctx.fillStyle = "#666";    ctx.fillText(item.label,  legendX + 15, legendY + i * 12 + 2);
  });
}