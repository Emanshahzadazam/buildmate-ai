import { useEffect, useRef } from "react";

export default function FloorPlanCanvas({ layout, projectName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 20;
    canvas.height = rect.height - 20;

    drawArchitecturalFloorPlan(ctx, layout, canvas.width, canvas.height, projectName);
  }, [layout, projectName]);

  return (
    <div className="w-full h-full flex items-center justify-center p-3 bg-slate-50">
      <canvas
        ref={canvasRef}
        className="border border-slate-300 bg-white"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
}

function drawArchitecturalFloorPlan(ctx, layout, canvasWidth, canvasHeight, projectName) {
  if (!layout.rooms || layout.rooms.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No layout data available", canvasWidth / 2, canvasHeight / 2);
    return;
  }

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate dimensions
  const plotWidth = layout.dimensions?.buildableWidth || layout.buildable?.width || 40;
  const plotLength = layout.dimensions?.buildableLength || layout.buildable?.length || 70;

  const margin = 60;
  const availableWidth = canvasWidth - 2 * margin;
  const availableHeight = canvasHeight - 2 * margin - 80; // Space for title

  const scaleXRatio = availableWidth / plotWidth;
  const scaleYRatio = availableHeight / plotLength;
  const scale = Math.min(scaleXRatio, scaleYRatio);

  const offsetX = margin;
  const offsetY = margin + 40;

  // ===== DRAW PLOT BOUNDARY =====
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    offsetX,
    offsetY,
    plotWidth * scale,
    plotLength * scale
  );

  // ===== DRAW EXTERIOR WALLS (9" thick, dark blue) =====
  const wallThick = 0.75 * scale; // 9 inches
  ctx.fillStyle = "#1a3a52"; // Dark blue like AutoCAD
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;

  // North wall
  ctx.fillRect(offsetX, offsetY, plotWidth * scale, wallThick);
  ctx.strokeRect(offsetX, offsetY, plotWidth * scale, wallThick);

  // South wall
  ctx.fillRect(
    offsetX,
    offsetY + plotLength * scale - wallThick,
    plotWidth * scale,
    wallThick
  );
  ctx.strokeRect(
    offsetX,
    offsetY + plotLength * scale - wallThick,
    plotWidth * scale,
    wallThick
  );

  // West wall
  ctx.fillRect(offsetX, offsetY, wallThick, plotLength * scale);
  ctx.strokeRect(offsetX, offsetY, wallThick, plotLength * scale);

  // East wall
  ctx.fillRect(
    offsetX + plotWidth * scale - wallThick,
    offsetY,
    wallThick,
    plotLength * scale
  );
  ctx.strokeRect(
    offsetX + plotWidth * scale - wallThick,
    offsetY,
    wallThick,
    plotLength * scale
  );

  // ===== DRAW ROOMS =====
  const roomColors = {
    bedroom: "#E8F4F8",
    bathroom: "#D4E8FF",
    kitchen: "#FFF9E6",
    dining: "#FFE8D4",
    drawing: "#E8F0FF",
    living: "#E8F8E8",
    lounge: "#E8F8E8",
    garage: "#F0F0F0",
    store: "#F5F5F5",
  };

  // Draw room fills and walls
  for (const room of layout.rooms) {
    const x = offsetX + room.x * scale;
    const y = offsetY + room.y * scale;
    const w = room.width * scale;
    const h = room.height * scale;

    // Room background
    ctx.fillStyle = roomColors[room.type] || "#F5F5F5";
    ctx.fillRect(x, y, w, h);

    // Interior walls (thin, gray)
    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  // ===== DRAW DOORS =====
  ctx.lineWidth = 1;
  for (const room of layout.rooms) {
    if (room.type === "bathroom" || room.type === "store") continue;

    const x = offsetX + room.x * scale;
    const y = offsetY + room.y * scale;
    const w = room.width * scale;
    const h = room.height * scale;

    const doorWidth = 3 * scale;
    const doorHeight = 6.83 * scale;

    // Door position (center of wall)
    const doorX = x + w / 2;
    const doorY = y;

    // Door frame (rectangle)
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.strokeRect(doorX - doorWidth / 2, doorY - 1, doorWidth, doorHeight);

    // Door swing (quarter circle arc)
    ctx.strokeStyle = "#FF8C00";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(doorX - doorWidth / 2, doorY, doorWidth, Math.PI, (Math.PI * 3) / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Door label (D1, D2, etc)
    ctx.fillStyle = "#FF8C00";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("D", doorX, doorY - doorHeight - 8);
  }

  // ===== DRAW WINDOWS =====
  for (const room of layout.rooms) {
    if (room.type === "bathroom" || room.type === "store" || room.type === "garage") continue;

    const x = offsetX + room.x * scale;
    const y = offsetY + room.y * scale;
    const w = room.width * scale;

    const winWidth = 3.5 * scale;
    const winX = x + w / 2;
    const winY = y;

    // Window (double line)
    ctx.strokeStyle = "#0099FF";
    ctx.lineWidth = 3;
    ctx.setLineDash([1, 1]);
    ctx.beginPath();
    ctx.moveTo(winX - winWidth / 2, winY);
    ctx.lineTo(winX + winWidth / 2, winY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Window end markers (red squares)
    ctx.fillStyle = "#FF0000";
    const markerSize = 2;
    ctx.fillRect(
      winX - winWidth / 2 - markerSize,
      winY - markerSize,
      markerSize * 2,
      markerSize * 2
    );
    ctx.fillRect(
      winX + winWidth / 2 - markerSize,
      winY - markerSize,
      markerSize * 2,
      markerSize * 2
    );

    // Window label
    ctx.fillStyle = "#0099FF";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("W", winX, winY - 8);
  }

  // ===== DRAW ROOM LABELS & DIMENSIONS =====
  for (const room of layout.rooms) {
    const x = offsetX + room.x * scale;
    const y = offsetY + room.y * scale;
    const w = room.width * scale;
    const h = room.height * scale;

    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // Room name
    ctx.fillStyle = "#1a4d2e";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(room.name, centerX, centerY - 8);

    // Room dimensions
    ctx.fillStyle = "#2d5a3d";
    ctx.font = "10px Arial";
    const dimText = `${room.width.toFixed(1)}' × ${room.height.toFixed(1)}'`;
    ctx.fillText(dimText, centerX, centerY + 8);

    // Area (optional)
    const area = (room.width * room.height).toFixed(0);
    ctx.font = "9px Arial";
    ctx.fillStyle = "#666666";
    ctx.fillText(`${area} sqft`, centerX, centerY + 20);
  }

  // ===== DRAW DIMENSION LINES =====
  ctx.strokeStyle = "#FF0000";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);

  // Top dimension line
  const topDimY = offsetY - 25;
  ctx.beginPath();
  ctx.moveTo(offsetX - 10, topDimY);
  ctx.lineTo(offsetX + plotWidth * scale + 10, topDimY);
  ctx.stroke();

  // Left tick
  ctx.beginPath();
  ctx.moveTo(offsetX, topDimY - 3);
  ctx.lineTo(offsetX, topDimY + 3);
  ctx.stroke();

  // Right tick
  ctx.beginPath();
  ctx.moveTo(offsetX + plotWidth * scale, topDimY - 3);
  ctx.lineTo(offsetX + plotWidth * scale, topDimY + 3);
  ctx.stroke();

  // Dimension text
  ctx.fillStyle = "#FF0000";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${plotWidth.toFixed(1)}'`, offsetX + (plotWidth * scale) / 2, topDimY - 8);

  // Right dimension line
  const rightDimX = offsetX + plotWidth * scale + 25;
  ctx.beginPath();
  ctx.moveTo(rightDimX, offsetY - 10);
  ctx.lineTo(rightDimX, offsetY + plotLength * scale + 10);
  ctx.stroke();

  // Top tick
  ctx.beginPath();
  ctx.moveTo(rightDimX - 3, offsetY);
  ctx.lineTo(rightDimX + 3, offsetY);
  ctx.stroke();

  // Bottom tick
  ctx.beginPath();
  ctx.moveTo(rightDimX - 3, offsetY + plotLength * scale);
  ctx.lineTo(rightDimX + 3, offsetY + plotLength * scale);
  ctx.stroke();

  // Dimension text
  ctx.textAlign = "left";
  ctx.save();
  ctx.translate(rightDimX + 8, offsetY + (plotLength * scale) / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(`${plotLength.toFixed(1)}'`, 0, -3);
  ctx.restore();

  ctx.setLineDash([]);

  // ===== DRAW NORTH ARROW =====
  const arrowX = offsetX + plotWidth * scale + 40;
  const arrowY = offsetY + 30;
  const arrowSize = 15;

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  // Arrow shaft
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY + arrowSize);
  ctx.lineTo(arrowX, arrowY - arrowSize);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(arrowX - arrowSize / 2, arrowY - arrowSize / 2);
  ctx.lineTo(arrowX, arrowY - arrowSize);
  ctx.lineTo(arrowX + arrowSize / 2, arrowY - arrowSize / 2);
  ctx.closePath();
  ctx.fill();

  // N label
  ctx.fillStyle = "#000000";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("N", arrowX, arrowY + arrowSize + 20);

  // ===== DRAW SCALE BAR =====
  const scaleLegendX = offsetX + 20;
  const scaleLegendY = offsetY + plotLength * scale + 20;
  const scaleLength = 10 * scale; // 10 feet

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;

  // Main bar
  ctx.beginPath();
  ctx.moveTo(scaleLegendX, scaleLegendY);
  ctx.lineTo(scaleLegendX + scaleLength, scaleLegendY);
  ctx.stroke();

  // End markers
  ctx.beginPath();
  ctx.moveTo(scaleLegendX, scaleLegendY - 4);
  ctx.lineTo(scaleLegendX, scaleLegendY + 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(scaleLegendX + scaleLength, scaleLegendY - 4);
  ctx.lineTo(scaleLegendX + scaleLength, scaleLegendY + 4);
  ctx.stroke();

  // Scale label
  ctx.fillStyle = "#000000";
  ctx.font = "9px Arial";
  ctx.textAlign = "center";
  ctx.fillText("10'", scaleLegendX + scaleLength / 2, scaleLegendY + 15);

  // ===== DRAW TITLE BLOCK =====
  ctx.fillStyle = "#000000";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`FLOOR PLAN - LAYOUT ${layout.variant || "A"}`, offsetX, 25);

  ctx.font = "10px Arial";
  ctx.fillStyle = "#444444";
  ctx.fillText(`Project: ${projectName}`, offsetX, 40);
  ctx.fillText(
    `Scale: 1:${(1 / (scale / 10)).toFixed(0)} | Plot: ${plotWidth.toFixed(1)}' × ${plotLength.toFixed(1)}'`,
    offsetX,
    52
  );

  // Legend
  const legendX = offsetX + plotWidth * scale - 150;
  const legendY = offsetY + plotLength * scale + 10;

  ctx.font = "9px Arial";
  ctx.fillStyle = "#666666";

  const legendItems = [
    { symbol: "□", color: "#8B4513", label: "Door" },
    { symbol: "∼∼", color: "#0099FF", label: "Window" },
  ];

  let offsetLegend = 0;
  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    ctx.fillText(item.symbol, legendX, legendY + offsetLegend);
    ctx.fillStyle = "#666666";
    ctx.fillText(item.label, legendX + 15, legendY + offsetLegend + 2);
    offsetLegend += 12;
  }
}