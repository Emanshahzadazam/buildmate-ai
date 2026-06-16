// dxfExporter.js
// Reusable DXF export helper for floor plan layout
// Generates valid ASCII DXF with LINE entities for all walls
// Uses exact coordinates from the layout (no scaling or approximation)

function getMetrics(layout) {
  const plot = layout.plot || {};
  const dims = layout.dimensions || {};
  const buildable = layout.buildable || {};
  const plotWidth = dims.plotWidth || plot.width || plot.plotWidth || buildable.width + 2 || 40;
  const plotLength = dims.plotLength || plot.length || plot.plotLength || buildable.length + 2 || 70;
  return {
    plotWidth,
    plotLength,
    buildableWidth: dims.buildableWidth || buildable.width || plotWidth,
    buildableLength: dims.buildableLength || buildable.length || plotLength,
    originX: buildable.min_x ?? buildable.offsetX ?? 0,
    originY: buildable.min_y ?? buildable.offsetY ?? 0,
  };
}

function createLineEntity(x1, y1, x2, y2) {
  return [
    "0", "LINE",
    "8", "0",           // Layer 0
    "10", x1.toFixed(4),
    "20", y1.toFixed(4),
    "30", "0.0",
    "11", x2.toFixed(4),
    "21", y2.toFixed(4),
    "31", "0.0"
  ].join("\n") + "\n";
}

export function generateDXF(layout) {
  if (!layout || !Array.isArray(layout.rooms) || layout.rooms.length === 0) {
    return null;
  }

  const metrics = getMetrics(layout);
  const originX = metrics.originX;
  const originY = metrics.originY;
  const bw = metrics.buildableWidth;
  const bl = metrics.buildableLength;

  let dxf = "";

  // HEADER section
  dxf += "0\nSECTION\n2\nHEADER\n";
  dxf += "9\n$ACADVER\n1\nAC1021\n"; // AutoCAD 2018 compatible
  dxf += "9\n$INSUNITS\n70\n1\n";    // Inches (or 0 for unitless)
  dxf += "0\nENDSEC\n";

  // TABLES section (minimal)
  dxf += "0\nSECTION\n2\nTABLES\n";
  dxf += "0\nTABLE\n2\nLAYER\n70\n1\n";
  dxf += "0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n";
  dxf += "0\nENDTAB\n0\nENDSEC\n";

  // ENTITIES section
  dxf += "0\nSECTION\n2\nENTITIES\n";

  // Exterior walls (buildable boundary) - 4 lines
  dxf += createLineEntity(originX, originY, originX + bw, originY);
  dxf += createLineEntity(originX + bw, originY, originX + bw, originY + bl);
  dxf += createLineEntity(originX + bw, originY + bl, originX, originY + bl);
  dxf += createLineEntity(originX, originY + bl, originX, originY);

  // All room boundaries (walls)
  for (const room of layout.rooms) {
    const x = room.x || 0;
    const y = room.y || 0;
    const w = room.width || 0;
    const h = room.height || 0;

    // Four sides of each room
    dxf += createLineEntity(x, y, x + w, y);           // top
    dxf += createLineEntity(x + w, y, x + w, y + h);   // right
    dxf += createLineEntity(x + w, y + h, x, y + h);   // bottom
    dxf += createLineEntity(x, y + h, x, y);           // left
  }

  dxf += "0\nENDSEC\n";

  // EOF
  dxf += "0\nEOF\n";

  return dxf;
}

export function downloadDXF(layout, filename = "floorplan.dxf") {
  if (!layout || !Array.isArray(layout.rooms) || layout.rooms.length === 0) {
    alert("No floorplan available to export.");
    return;
  }

  const dxfContent = generateDXF(layout);
  if (!dxfContent) {
    alert("No floorplan available to export.");
    return;
  }

  const blob = new Blob([dxfContent], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
