import { useEffect, useRef } from "react";

export default function ElevationCanvas({ layout, direction }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !layout) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = canvas.width / layout.dimensions.totalWidth;
    const groundY = canvas.height * 0.6;
    const wallHeight = layout.brief?.technical?.floorHeight || 10;

    // Ground line
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, groundY);
    ctx.lineTo(canvas.width - 20, groundY);
    ctx.stroke();

    // Ground hatching
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    for (let i = 0; i < (canvas.width - 40) / 20; i++) {
      ctx.beginPath();
      ctx.moveTo(20 + i * 20, groundY);
      ctx.lineTo(40 + i * 20, groundY + 20);
      ctx.stroke();
    }

    // Front wall
    const wallTopY = groundY - wallHeight * scale;
    ctx.fillStyle = "#E8D4C4";
    ctx.fillRect(20, wallTopY, canvas.width - 40, groundY - wallTopY);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, wallTopY, canvas.width - 40, groundY - wallTopY);

    // Plinth band
    ctx.fillStyle = "#A0826D";
    ctx.fillRect(20, groundY - 10, canvas.width - 40, 10);

    // Door openings (simplified)
    ctx.fillStyle = "#8B7355";
    const doorWidth = 30;
    const doorHeight = 60;
    const doorsCount = Math.ceil(layout.rooms.length / 4);
    for (let i = 0; i < doorsCount; i++) {
      const doorX = 50 + i * ((canvas.width - 100) / doorsCount);
      ctx.fillRect(doorX, groundY - doorHeight, doorWidth, doorHeight);
    }

    // Windows
    ctx.fillStyle = "#87CEEB";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const winX = 100 + i * ((canvas.width - 200) / 3);
      const winY = wallTopY + 20;
      const winW = 40;
      const winH = 30;
      
      ctx.fillRect(winX, winY, winW, winH);
      ctx.strokeRect(winX, winY, winW, winH);
      ctx.beginPath();
      ctx.moveTo(winX + winW / 2, winY);
      ctx.lineTo(winX + winW / 2, winY + winH);
      ctx.stroke();
    }

    // Parapet (roof edge)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, wallTopY);
    ctx.lineTo(canvas.width - 20, wallTopY);
    ctx.stroke();

    // Dimension lines
    ctx.strokeStyle = "#D00000";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, wallTopY - 30);
    ctx.lineTo(canvas.width - 20, wallTopY - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#D00000";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${layout.dimensions.totalWidth.toFixed(1)}'`,
      canvas.width / 2,
      wallTopY - 40
    );

    ctx.fillText(
      `H: ${wallHeight}'`,
      canvas.width - 40,
      wallTopY - 15
    );

    // Direction label
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${direction.charAt(0).toUpperCase() + direction.slice(1)} Elevation`,
      canvas.width / 2,
      30
    );
  }, [layout, direction]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="border border-gray-300 rounded-lg w-full"
    />
  );
}