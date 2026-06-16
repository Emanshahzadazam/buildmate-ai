/**
 * elevationGenerator.js — Professional AutoCAD-style 2D Elevations
 * Features: Gable roof, vegetation, garden, garage, centering fix, micro details
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBounds(layout) {
  const b = layout.buildable || {};
  const d = layout.dimensions || {};
  const w  = b.width  || d.buildableWidth  || d.plotWidth  || 40;
  const l  = b.length || d.buildableLength || d.plotLength || 70;
  const x0 = b.min_x ?? b.offsetX ?? 0;
  const y0 = b.min_y ?? b.offsetY ?? 0;
  return { w, l, x0, y0, x1: x0 + w, y1: y0 + l };
}

function isFacingRoom(room, dir, b) {
  const tol = 1.5;
  if (dir === "front") return room.y              <= b.y0 + tol;
  if (dir === "rear")  return room.y + room.height >= b.y1 - tol;
  if (dir === "left")  return room.x              <= b.x0 + tol;
  if (dir === "right") return room.x + room.width >= b.x1 - tol;
  return false;
}

function roomPos(room, dir, b) {
  if (dir === "front" || dir === "rear") {
    const cx   = (room.x + room.width / 2  - b.x0) / b.w;
    const span = room.width / b.w;
    return { cx: Math.max(0.04, Math.min(0.96, cx)), span };
  } else {
    const cx   = (room.y + room.height / 2 - b.y0) / b.l;
    const span = room.height / b.l;
    return { cx: Math.max(0.04, Math.min(0.96, cx)), span };
  }
}

function wantsMainDoor(room, dir) {
  if (dir === "front") return ["drawing","living","garage","entrance"].includes(room.type);
  if (dir === "rear")  return ["kitchen","dining"].includes(room.type);
  return false;
}

// ─── Generate elevation data ──────────────────────────────────────────────────

export function generateElevation(layout, direction = "front") {
  const b      = getBounds(layout);
  const floors = Math.max(1, Number(layout.brief?.floors || layout.meta?.floors || 1));
  const fh     = Number(layout.brief?.technical?.floorHeight || 10);
  const facadeW = (direction === "front" || direction === "rear") ? b.w : b.l;
  const hasGarage   = layout.brief?.hasGarage   || false;
  const hasStoreRoom = layout.brief?.hasStoreRoom || false;

  const facingRooms = (layout.rooms || [])
    .filter(r => isFacingRoom(r, direction, b))
    .sort((a, z) =>
      (direction === "front" || direction === "rear") ? a.x - z.x : a.y - z.y
    );

  const openings = [];
  let dIdx = 1, wIdx = 1;
  let hasGarageDoor = false;

  facingRooms.forEach(room => {
    const { cx, span } = roomPos(room, direction, b);
    const isDoor    = wantsMainDoor(room, direction);
    const isPrivate = ["bathroom","store","staircase"].includes(room.type);
    const isGarage  = room.type === "garage";

    if (isGarage) {
      hasGarageDoor = true;
      openings.push({ type:"garage_door", cx, span,
        w: Math.min(span * 0.85, 0.22), h: 7.5, sill: 0,
        label:`GD`, roomType:"garage" });
    } else if (isDoor) {
      openings.push({ type:"door", cx, span,
        w: Math.min(span * 0.5, 0.1), h: 7.0, sill: 0,
        label:`D${dIdx++}`, roomType: room.type, roomName: room.name || room.label });
    } else if (!isPrivate) {
      const isLarge = ["living","drawing","dining"].includes(room.type);
      openings.push({ type:"window", cx, span,
        w: Math.min(span * (isLarge ? 0.62 : 0.45), isLarge ? 0.13 : 0.09),
        h: isLarge ? 4.5 : 3.5, sill: 3.0,
        label:`W${wIdx++}`, roomType: room.type, roomName: room.name || room.label });
    } else {
      openings.push({ type:"ventWindow", cx, span,
        w: Math.min(span * 0.26, 0.06), h: 1.5, sill: 5.5,
        label:`V${wIdx++}`, roomType: room.type });
    }
  });

  // If hasGarage from brief but no garage room facing this direction
  const showGarage = hasGarage && !hasGarageDoor && direction === "front";

  return {
    direction, facadeW, fh,
    totalH: fh * floors,
    floors, openings,
    hasGarage, showGarage, hasStoreRoom,
    wallThk: layout.brief?.technical?.wallThicknessExt || 9,
    hasParapet: true, parapetH: 1.0,
    title: direction.charAt(0).toUpperCase() + direction.slice(1) + " Elevation",
  };
}

export function generateRoofView(layout) {
  const b      = getBounds(layout);
  const floors = Math.max(1, Number(layout.brief?.floors || 1));
  const rooms  = layout.rooms || [];
  const stair  = rooms.find(r => r.type === "staircase");
  const elements = [{ type:"parapet", x:b.x0, y:b.y0, w:b.w, h:b.l }];

  if (stair) {
    elements.push({ type:"stair_headroom", x:stair.x, y:stair.y, w:stair.width, h:stair.height });
  } else if (floors > 1) {
    elements.push({ type:"stair_headroom",
      x: b.x0 + b.w * 0.72, y: b.y0 + b.l * 0.68,
      w: Math.min(7, b.w * 0.16), h: Math.min(9, b.l * 0.12) });
  }
  if (floors > 1) {
    elements.push({ type:"water_tank",
      x: b.x0 + b.w * 0.08, y: b.y0 + b.l * 0.08,
      w: 4.5, h: 4.5 });
  }
  return { direction:"roof", title:"Roof Plan", rooms, elements, b };
}

// ─── Drawing utilities ────────────────────────────────────────────────────────

function drawHatch(ctx, x, y, w, h, spacing=10) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 0.6;
  const d = Math.sqrt(w*w+h*h);
  for (let i = -d; i < d; i += spacing) {
    ctx.beginPath(); ctx.moveTo(x+i, y); ctx.lineTo(x+i+d, y+d); ctx.stroke();
  }
  ctx.restore();
}

function drawBrickwork(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const bh=8, bw=22;
  ctx.strokeStyle = "rgba(130,80,50,0.15)"; ctx.lineWidth = 0.5;
  for (let row=0; row*bh<h; row++) {
    const oy=y+row*bh, off=(row%2)*(bw/2);
    ctx.beginPath(); ctx.moveTo(x,oy); ctx.lineTo(x+w,oy); ctx.stroke();
    for (let col=-1; col*bw<w; col++) {
      const ox=x+col*bw+off;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox,oy+bh); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Vegetation ────────────────────────────────────────────────────────────────

function drawPineTree(ctx, cx, groundY, height) {
  const w = height * 0.45;
  // trunk
  ctx.fillStyle = "#5D4037";
  ctx.fillRect(cx - 3, groundY - height * 0.18, 6, height * 0.18);
  // three tiers of foliage
  [[0.55,0.38],[0.7,0.55],[0.9,0.72]].forEach(([hf,wf], i) => {
    const ty = groundY - height * hf;
    ctx.fillStyle = i === 0 ? "#1B5E20" : i === 1 ? "#2E7D32" : "#388E3C";
    ctx.beginPath();
    ctx.moveTo(cx, groundY - height);
    ctx.lineTo(cx - w * wf, ty);
    ctx.lineTo(cx + w * wf, ty);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.6;
    ctx.stroke();
  });
}

function drawShrub(ctx, cx, groundY, r) {
  // 3 overlapping circles
  [[-r*0.5, r*0.75],[0, r],[r*0.5, r*0.75]].forEach(([dx, cr]) => {
    ctx.beginPath();
    ctx.arc(cx + dx, groundY - cr*0.6, cr*0.7, 0, Math.PI*2);
    ctx.fillStyle = "#558B2F"; ctx.fill();
    ctx.strokeStyle = "#33691E"; ctx.lineWidth = 0.8; ctx.stroke();
  });
  // dark base
  ctx.beginPath();
  ctx.arc(cx, groundY - r*0.25, r*0.35, 0, Math.PI*2);
  ctx.fillStyle = "#33691E"; ctx.fill();
}

function drawGrassLawn(ctx, x, y, w, h) {
  // base grass fill
  ctx.fillStyle = "#8BC34A";
  ctx.fillRect(x, y, w, h);
  // grass blades
  ctx.strokeStyle = "#7CB342"; ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 5) {
    const bx = x + i + Math.random() * 4;
    const bh = 4 + Math.random() * 5;
    ctx.beginPath();
    ctx.moveTo(bx, y + h);
    ctx.quadraticCurveTo(bx + 2, y + h - bh / 2, bx + (Math.random() > 0.5 ? 3 : -3), y + h - bh);
    ctx.stroke();
  }
}

function drawGardenPath(ctx, x, groundY, w) {
  // Paving stones path
  ctx.fillStyle = "#BCAAA4";
  ctx.fillRect(x + w*0.42, groundY, w*0.16, 24);
  ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.strokeRect(x + w*0.42, groundY + i*8, w*0.16, 8);
  }
}

// ── Gable roof ────────────────────────────────────────────────────────────────

function drawGableRoof(ctx, leftX, wallTopY, facWpx, floors, scale) {
  const roofH = Math.max(30, facWpx * 0.18);
  const ridgeX = leftX + facWpx / 2;
  const ridgeY = wallTopY - roofH;
  const overhang = 14;

  // Left slope fill
  ctx.beginPath();
  ctx.moveTo(leftX - overhang, wallTopY);
  ctx.lineTo(ridgeX, ridgeY);
  ctx.lineTo(leftX - overhang, ridgeY + 4);
  ctx.closePath();
  ctx.fillStyle = "#8D6E63"; ctx.fill();
  ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1.5; ctx.stroke();

  // Right slope fill
  ctx.beginPath();
  ctx.moveTo(leftX + facWpx + overhang, wallTopY);
  ctx.lineTo(ridgeX, ridgeY);
  ctx.lineTo(leftX + facWpx + overhang, ridgeY + 4);
  ctx.closePath();
  ctx.fillStyle = "#795548"; ctx.fill();
  ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1.5; ctx.stroke();

  // Main gable outline
  ctx.beginPath();
  ctx.moveTo(leftX - overhang, wallTopY);
  ctx.lineTo(ridgeX, ridgeY);
  ctx.lineTo(leftX + facWpx + overhang, wallTopY);
  ctx.strokeStyle = "#3E2723"; ctx.lineWidth = 2; ctx.stroke();

  // Ridge line
  ctx.beginPath();
  ctx.moveTo(ridgeX - 2, ridgeY);
  ctx.lineTo(ridgeX + 2, ridgeY);
  ctx.strokeStyle = "#3E2723"; ctx.lineWidth = 3; ctx.stroke();

  // Roof tiles (lines along slope)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftX - overhang, wallTopY);
  ctx.lineTo(ridgeX, ridgeY);
  ctx.lineTo(leftX + facWpx + overhang, wallTopY);
  ctx.closePath(); ctx.clip();

  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.8;
  const tileH = 10;
  const slopeLen = Math.sqrt((facWpx/2 + overhang)**2 + roofH**2);
  for (let d = tileH; d < slopeLen; d += tileH) {
    const t = d / slopeLen;
    // Left side tiles
    const lx1 = leftX - overhang + (ridgeX - (leftX - overhang)) * t;
    const ly1 = wallTopY        + (ridgeY - wallTopY) * t;
    ctx.beginPath(); ctx.moveTo(leftX - overhang, ly1); ctx.lineTo(lx1, ly1); ctx.stroke();
    // Right side tiles
    const rx1 = (leftX + facWpx + overhang) - ((leftX + facWpx + overhang) - ridgeX) * t;
    const ry1 = wallTopY + (ridgeY - wallTopY) * t;
    ctx.beginPath(); ctx.moveTo(leftX + facWpx + overhang, ry1); ctx.lineTo(rx1, ry1); ctx.stroke();
  }
  ctx.restore();

  // Eave/fascia
  ctx.fillStyle = "#EFEBE9";
  ctx.fillRect(leftX - overhang, wallTopY - 5, facWpx + overhang*2, 5);
  ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1.2;
  ctx.strokeRect(leftX - overhang, wallTopY - 5, facWpx + overhang*2, 5);

  // Chimney
  if (floors === 1) {
    const chX = leftX + facWpx * 0.72;
    const chW = Math.max(14, facWpx * 0.06);
    const chH = roofH * 0.7;
    const chY = ridgeY - chH * 0.3;
    ctx.fillStyle = "#8D6E63";
    ctx.fillRect(chX, chY, chW, chH + 20);
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1.2;
    ctx.strokeRect(chX, chY, chW, chH + 20);
    // chimney cap
    ctx.fillStyle = "#6D4C41";
    ctx.fillRect(chX - 3, chY, chW + 6, 6);
    ctx.strokeStyle = "#4E342E"; ctx.lineWidth = 1;
    ctx.strokeRect(chX - 3, chY, chW + 6, 6);
    // smoke puffs
    ctx.fillStyle = "rgba(200,200,200,0.4)";
    [0,6,12].forEach((dy, i) => {
      const r = 5 - i;
      ctx.beginPath();
      ctx.arc(chX + chW/2 + (i%2?3:-3), chY - 8 - dy, r, 0, Math.PI*2);
      ctx.fill();
    });
  }

  return ridgeY;
}

// ── Doors & Windows ───────────────────────────────────────────────────────────

function drawDoor(ctx, cx, bY, wPx, hPx) {
  const lx = cx - wPx/2;
  ctx.fillStyle = "#C8B496";
  ctx.fillRect(lx, bY - hPx, wPx, hPx);
  // panels
  const pw = wPx*0.78, ph1 = hPx*0.38, ph2 = hPx*0.43;
  const px = cx - pw/2;
  ctx.strokeStyle = "#5C3D1E"; ctx.lineWidth = 1;
  ctx.strokeRect(px, bY - hPx + hPx*0.06, pw, ph1);
  ctx.strokeRect(px, bY - hPx + hPx*0.5, pw, ph2);
  // frame
  ctx.strokeStyle = "#3E2723"; ctx.lineWidth = 2;
  ctx.strokeRect(lx, bY - hPx, wPx, hPx);
  // knob
  ctx.fillStyle = "#C0A020";
  ctx.beginPath(); ctx.arc(cx + wPx*0.28, bY - hPx*0.5, 3, 0, Math.PI*2); ctx.fill();
  // lintel
  ctx.fillStyle = "#8B7055";
  ctx.fillRect(lx - 4, bY - hPx - 8, wPx + 8, 8);
  ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1;
  ctx.strokeRect(lx - 4, bY - hPx - 8, wPx + 8, 8);
}

function drawGarageDoor(ctx, cx, bY, wPx, hPx) {
  const lx = cx - wPx/2;
  ctx.fillStyle = "#E0D8CC";
  ctx.fillRect(lx, bY - hPx, wPx, hPx);
  // horizontal panels
  const panels = 4;
  const ph = hPx / panels;
  ctx.strokeStyle = "#9E9E9E"; ctx.lineWidth = 1;
  for (let i = 1; i < panels; i++) {
    ctx.beginPath();
    ctx.moveTo(lx, bY - hPx + i*ph);
    ctx.lineTo(lx + wPx, bY - hPx + i*ph);
    ctx.stroke();
  }
  // vertical divisions per panel
  const secs = 3;
  for (let s = 1; s < secs; s++) {
    ctx.beginPath();
    ctx.moveTo(lx + wPx/secs*s, bY - hPx);
    ctx.lineTo(lx + wPx/secs*s, bY);
    ctx.stroke();
  }
  ctx.strokeStyle = "#555"; ctx.lineWidth = 2;
  ctx.strokeRect(lx, bY - hPx, wPx, hPx);
  // handle
  ctx.fillStyle = "#888";
  ctx.fillRect(cx - 10, bY - ph/2 - 3, 20, 6);
  ctx.strokeStyle = "#555"; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 10, bY - ph/2 - 3, 20, 6);
  // label
  ctx.fillStyle = "#546E7A"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center";
  ctx.fillText("GARAGE", cx, bY - hPx - 12);
}

function drawWindow(ctx, cx, bY, wPx, hPx, sillPx) {
  const lx = cx - wPx/2, ty = bY - sillPx - hPx, ry = ty + hPx;
  // sill
  ctx.fillStyle = "#B0A090";
  ctx.fillRect(lx - 4, ry, wPx + 8, 6);
  ctx.strokeStyle = "#777"; ctx.lineWidth = 0.8;
  ctx.strokeRect(lx - 4, ry, wPx + 8, 6);
  // glass
  ctx.fillStyle = "rgba(135,206,235,0.55)";
  ctx.fillRect(lx, ty, wPx, hPx);
  // frame
  ctx.strokeStyle = "#444"; ctx.lineWidth = 1.5;
  ctx.strokeRect(lx, ty, wPx, hPx);
  // mullion
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx, ty+hPx); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx, ty+hPx/2); ctx.lineTo(lx+wPx, ty+hPx/2); ctx.stroke();
  // glazing highlights
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(lx+wPx*0.22,ty+2); ctx.lineTo(lx+wPx*0.22,ty+hPx/2-1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+wPx*0.22,ty+2); ctx.lineTo(cx+wPx*0.22,ty+hPx/2-1); ctx.stroke();
  // lintel
  ctx.fillStyle = "#8B7055";
  ctx.fillRect(lx - 4, ty - 8, wPx + 8, 8);
  ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 0.8;
  ctx.strokeRect(lx - 4, ty - 8, wPx + 8, 8);
}

function drawVentWindow(ctx, cx, bY, wPx, hPx, sillPx) {
  const lx = cx - wPx/2, ty = bY - sillPx - hPx;
  ctx.fillStyle = "rgba(135,206,235,0.4)";
  ctx.fillRect(lx, ty, wPx, hPx);
  ctx.strokeStyle = "#666"; ctx.lineWidth = 1;
  ctx.strokeRect(lx, ty, wPx, hPx);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(lx, ty + hPx/3*i); ctx.lineTo(lx+wPx, ty + hPx/3*i); ctx.stroke();
  }
}

// ── Dimension helpers ─────────────────────────────────────────────────────────

function dimH(ctx, x1, y, x2, label, above=true) {
  ctx.strokeStyle = "#D00000"; ctx.lineWidth = 0.8; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
  ctx.setLineDash([]);
  [x1,x2].forEach(x => {
    ctx.beginPath(); ctx.moveTo(x,y-5); ctx.lineTo(x,y+5); ctx.stroke();
  });
  ctx.fillStyle="#D00000"; ctx.font="bold 10px Arial"; ctx.textAlign="center";
  ctx.fillText(label, (x1+x2)/2, above ? y-12 : y+16);
}

function dimV(ctx, x, y1, y2, label) {
  ctx.strokeStyle="#D00000"; ctx.lineWidth=0.8; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke();
  ctx.setLineDash([]);
  [y1,y2].forEach(y => {
    ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.stroke();
  });
  ctx.save();
  ctx.translate(x-16,(y1+y2)/2); ctx.rotate(-Math.PI/2);
  ctx.fillStyle="#D00000"; ctx.font="bold 10px Arial"; ctx.textAlign="center";
  ctx.fillText(label,0,0);
  ctx.restore();
}

function levelLine(ctx, y, label, leftX, rightX) {
  ctx.strokeStyle="#1E88E5"; ctx.lineWidth=0.7; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(leftX-10,y); ctx.lineTo(rightX+50,y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle="#1E88E5"; ctx.font="bold 9px Arial"; ctx.textAlign="left";
  ctx.fillText(label, rightX+6, y+3);
}

function drawTitleBlock(ctx, W, H, title, subtitle) {
  ctx.fillStyle="#111827"; ctx.font="bold 14px Arial"; ctx.textAlign="center";
  ctx.fillText(title, W/2, 26);
  ctx.fillStyle="#546E7A"; ctx.font="11px Arial";
  ctx.fillText(subtitle, W/2, 42);
  ctx.strokeStyle="#CBD5E1"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(20,H-24); ctx.lineTo(W-20,H-24); ctx.stroke();
  ctx.fillStyle="#90A4AE"; ctx.font="9px Arial"; ctx.textAlign="left";
  ctx.fillText("Scale: NTS | All dimensions in feet", 24, H-10);
  ctx.textAlign="right";
  ctx.fillText("BuildMate AI", W-24, H-10);
}

// ─── Main elevation drawing ───────────────────────────────────────────────────

export function drawElevationOnCanvas(ctx, elevation, W, H) {
  if (!elevation) return;

  const { facadeW, fh, totalH, floors, openings,
          parapetH, title, hasGarage } = elevation;

  // ── Layout calculation — centred ──
  // Total scene: gable roof + wall + plinth + ground/garden strip
  const GARDEN_H_FT = 6;   // feet of garden shown below ground
  const GABLE_RATIO = 0.20; // gable height as fraction of facadeW
  const gableH_ft   = facadeW * GABLE_RATIO;
  const sceneTotalH = gableH_ft + totalH + parapetH + GARDEN_H_FT + 1.5;
  const sceneW      = facadeW * 1.4; // 20% extra each side for trees

  const mL = 72, mR = 60, mT = 58, mB = 52;
  const drawW = W - mL - mR;
  const drawH = H - mT - mB;
  const scale = Math.min(drawW / sceneW, drawH / sceneTotalH);

  const facWpx    = facadeW * scale;
  const wallHpx   = totalH  * scale;
  const parHpx    = parapetH * scale;
  const gardenPx  = GARDEN_H_FT * scale;
  const gableHpx  = gableH_ft * scale;
  const plinthPx  = Math.max(8, 1.5 * scale);

  // Center horizontally and vertically
  const totalSceneHpx = gableHpx + wallHpx + parHpx + gardenPx + plinthPx;
  const leftX   = (W - facWpx) / 2;
  const rightX  = leftX + facWpx;
  const groundY = mT + gableHpx + wallHpx + parHpx + plinthPx +
                  (drawH - totalSceneHpx) / 2;
  const wallTopY = groundY - plinthPx - wallHpx;

  // ── Background ──
  ctx.fillStyle = "#F8F9FA";
  ctx.fillRect(0, 0, W, H);

  // ── Sky gradient (subtle) ──
  const sky = ctx.createLinearGradient(0, mT, 0, groundY - wallHpx - gableHpx);
  sky.addColorStop(0, "#E3F2FD");
  sky.addColorStop(1, "#F8F9FA");
  ctx.fillStyle = sky;
  ctx.fillRect(0, mT, W, groundY - wallHpx - parHpx - gableHpx - mT);

  // ── Garden / lawn area ──
  drawGrassLawn(ctx, leftX - facWpx*0.2, groundY, facWpx*1.4, gardenPx);
  // Garden path
  drawGardenPath(ctx, leftX, groundY, facWpx);
  // Boundary wall (low wall at front)
  ctx.fillStyle = "#9E9E9E";
  ctx.fillRect(leftX - facWpx*0.2, groundY + gardenPx - 8, facWpx*1.4, 8);
  ctx.strokeStyle = "#757575"; ctx.lineWidth = 1;
  ctx.strokeRect(leftX - facWpx*0.2, groundY + gardenPx - 8, facWpx*1.4, 8);

  // ── Ground line ──
  ctx.strokeStyle = "#1a252f"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftX - facWpx*0.22, groundY);
  ctx.lineTo(rightX + facWpx*0.22, groundY);
  ctx.stroke();
  // ground hatch
  ctx.strokeStyle = "#546E7A"; ctx.lineWidth = 0.8;
  const gw = facWpx*1.44, gs = 14;
  for (let i = 0; i < gw/gs; i++) {
    ctx.beginPath();
    ctx.moveTo(leftX - facWpx*0.22 + i*gs, groundY);
    ctx.lineTo(leftX - facWpx*0.22 + i*gs - gs*0.55, groundY + gs*0.75);
    ctx.stroke();
  }

  // ── Vegetation — pine trees ──
  const treeH = Math.max(60, wallHpx * 0.8);
  drawPineTree(ctx, leftX - facWpx*0.13, groundY, treeH);
  drawPineTree(ctx, rightX + facWpx*0.13, groundY, treeH * 0.85);

  // ── Shrubs (beside building) ──
  const shrubR = Math.max(16, scale * 3.5);
  [0.12, 0.25].forEach(fr => {
    drawShrub(ctx, leftX + facWpx*fr,      groundY, shrubR);
    drawShrub(ctx, rightX - facWpx*fr,     groundY, shrubR);
  });

  // ── Plinth ──
  ctx.fillStyle = "#9E9689";
  ctx.fillRect(leftX, groundY - plinthPx, facWpx, plinthPx);
  drawHatch(ctx, leftX, groundY - plinthPx, facWpx, plinthPx, 8);
  ctx.strokeStyle = "#666"; ctx.lineWidth = 1;
  ctx.strokeRect(leftX, groundY - plinthPx, facWpx, plinthPx);

  // ── Main wall ──
  ctx.fillStyle = "#EDE8E0";
  ctx.fillRect(leftX, wallTopY, facWpx, wallHpx);
  drawBrickwork(ctx, leftX, wallTopY, facWpx, wallHpx);

  // ── Floor slabs (multi-storey) ──
  for (let f = 1; f < floors; f++) {
    const fy = groundY - plinthPx - f * fh * scale;
    ctx.fillStyle = "#B0A898";
    ctx.fillRect(leftX, fy - 6, facWpx, 6);
    ctx.strokeStyle = "#666"; ctx.lineWidth = 0.8;
    ctx.strokeRect(leftX, fy - 6, facWpx, 6);
    ctx.fillStyle = "#546E7A"; ctx.font = "9px Arial"; ctx.textAlign = "right";
    ctx.fillText(`FL ${f+1}`, leftX - 6, fy - 1);
    levelLine(ctx, fy, `+${(f*fh).toFixed(1)}'`, leftX, rightX);
  }

  // ── Openings ──
  const bY = groundY - plinthPx;
  openings.forEach(o => {
    const cx  = leftX + o.cx * facWpx;
    const wPx = o.w   * facWpx;
    const hPx = o.h   * scale;
    const sill = o.sill * scale;
    if (o.type === "garage_door") drawGarageDoor(ctx, cx, bY, wPx, hPx);
    else if (o.type === "door")   drawDoor(ctx, cx, bY, wPx, hPx);
    else if (o.type === "window") drawWindow(ctx, cx, bY, wPx, hPx, sill);
    else                          drawVentWindow(ctx, cx, bY, wPx, hPx, sill);
  });

  // ── Parapet ──
  ctx.fillStyle = "#D9D4CA";
  ctx.fillRect(leftX, wallTopY - parHpx, facWpx, parHpx);
  drawBrickwork(ctx, leftX, wallTopY - parHpx, facWpx, parHpx);
  ctx.strokeStyle = "#555"; ctx.lineWidth = 1.2;
  ctx.strokeRect(leftX, wallTopY - parHpx, facWpx, parHpx);
  // coping
  ctx.fillStyle = "#888";
  ctx.fillRect(leftX - 4, wallTopY - parHpx - 5, facWpx + 8, 5);
  ctx.strokeStyle = "#555"; ctx.lineWidth = 1;
  ctx.strokeRect(leftX - 4, wallTopY - parHpx - 5, facWpx + 8, 5);

  // ── Gable roof ──
  drawGableRoof(ctx, leftX, wallTopY - parHpx, facWpx, floors, scale);

  // ── Wall outline (bold) ──
  ctx.strokeStyle = "#111827"; ctx.lineWidth = 2.5;
  ctx.strokeRect(leftX, wallTopY, facWpx, wallHpx);

  // ── Dimension lines ──
  dimH(ctx, leftX, groundY + gardenPx + 28, rightX, `${facadeW.toFixed(1)}'`, false);
  dimV(ctx, rightX + 38, wallTopY, groundY - plinthPx, `${totalH.toFixed(1)}'`);

  // ── Level markers ──
  levelLine(ctx, groundY,         "± 0.00", leftX, rightX);
  levelLine(ctx, wallTopY,        `+${totalH.toFixed(1)}'`, leftX, rightX);

  // ── Title block ──
  drawTitleBlock(ctx, W, H, title,
    `Width: ${facadeW.toFixed(1)}' | Height: ${totalH.toFixed(1)}' | ${floors} Floor${floors>1?"s":""}`);
}

// ─── Roof plan drawing ────────────────────────────────────────────────────────

export function drawRoofOnCanvas(ctx, roof, W, H) {
  const { b, rooms, elements } = roof;
  const mL=60, mR=48, mT=58, mB=58;
  const drawW=W-mL-mR, drawH=H-mT-mB;
  const scale = Math.min(drawW/Math.max(1,b.w), drawH/Math.max(1,b.l));
  const rW=b.w*scale, rL=b.l*scale;
  // centre
  const ox=(W-rW)/2, oy=mT+(drawH-rL)/2;

  ctx.fillStyle="#F8F9FA"; ctx.fillRect(0,0,W,H);

  // roof surface
  ctx.fillStyle="#D4CFC9";
  ctx.fillRect(ox, oy, rW, rL);
  drawHatch(ctx, ox, oy, rW, rL, 14);

  // gable lines (ridge line)
  ctx.strokeStyle="#5D4037"; ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(ox + rW/2, oy);
  ctx.lineTo(ox + rW/2, oy + rL);
  ctx.stroke();
  // hip lines
  ctx.strokeStyle="#795548"; ctx.lineWidth=1; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox+rW/2, oy+rL*0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox+rW, oy); ctx.lineTo(ox+rW/2, oy+rL*0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox, oy+rL); ctx.lineTo(ox+rW/2, oy+rL*0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox+rW, oy+rL); ctx.lineTo(ox+rW/2, oy+rL*0.7); ctx.stroke();
  ctx.setLineDash([]);

  // ghost room outlines
  (rooms||[]).forEach(room => {
    const rx=ox+(room.x-b.x0)*scale, ry=oy+(room.y-b.y0)*scale;
    const rw=room.width*scale, rl=room.height*scale;
    ctx.fillStyle="rgba(240,236,230,0.45)"; ctx.fillRect(rx,ry,rw,rl);
    ctx.strokeStyle="rgba(100,100,100,0.3)"; ctx.lineWidth=0.8;
    ctx.setLineDash([4,3]); ctx.strokeRect(rx,ry,rw,rl); ctx.setLineDash([]);
    ctx.fillStyle="rgba(70,70,70,0.5)"; ctx.font="8px Arial"; ctx.textAlign="center";
    ctx.fillText((room.name||room.type||"").toUpperCase(), rx+rw/2, ry+rl/2+3);
  });

  // elements
  (elements||[]).forEach(el => {
    const ex=ox+(el.x-b.x0)*scale, ey=oy+(el.y-b.y0)*scale;
    const ew=el.w*scale, eh=el.h*scale;
    if (el.type==="stair_headroom") {
      ctx.fillStyle="#94A3B8"; ctx.fillRect(ex,ey,ew,eh);
      drawHatch(ctx,ex,ey,ew,eh,6);
      ctx.strokeStyle="#334155"; ctx.lineWidth=1.5; ctx.strokeRect(ex,ey,ew,eh);
      ctx.fillStyle="#1e3a8a"; ctx.font="bold 9px Arial"; ctx.textAlign="center";
      ctx.fillText("STAIR",ex+ew/2,ey+eh/2+3);
    }
    if (el.type==="water_tank") {
      ctx.fillStyle="rgba(59,130,246,0.3)"; ctx.fillRect(ex,ey,ew,eh);
      ctx.strokeStyle="#1d4ed8"; ctx.lineWidth=1.5; ctx.strokeRect(ex,ey,ew,eh);
      ctx.fillStyle="#1e3a8a"; ctx.font="bold 9px Arial"; ctx.textAlign="center";
      ctx.fillText("TANK",ex+ew/2,ey+eh/2+3);
    }
  });

  // parapet double line
  ctx.strokeStyle="#1a252f"; ctx.lineWidth=3; ctx.strokeRect(ox,oy,rW,rL);
  ctx.strokeStyle="#888"; ctx.lineWidth=1.5; ctx.strokeRect(ox+6,oy+6,rW-12,rL-12);

  // dimensions
  dimH(ctx, ox, oy-28, ox+rW, `${b.w.toFixed(1)}'`, true);
  dimV(ctx, ox-36, oy, oy+rL, `${b.l.toFixed(1)}'`);

  // north arrow
  const ax=ox+rW+36, ay=oy+28;
  ctx.strokeStyle="#111827"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(ax,ay+20); ctx.lineTo(ax,ay-20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax-7,ay-8); ctx.lineTo(ax,ay-20); ctx.lineTo(ax+7,ay-8);
  ctx.fillStyle="#111827"; ctx.fill();
  ctx.fillStyle="#111827"; ctx.font="bold 13px Arial"; ctx.textAlign="center";
  ctx.fillText("N",ax,ay+40);

  drawTitleBlock(ctx,W,H,"Roof Plan",`${b.w.toFixed(1)}' × ${b.l.toFixed(1)}'`);
}