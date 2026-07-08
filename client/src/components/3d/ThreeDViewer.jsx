import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import ThreeDWalkthrough from "./ThreeDWalkthrough";

const ROOM_COLORS = {
  bedroom: "#9DD7F0",
  bathroom: "#7DB7FF",
  kitchen: "#FFD166",
  dining: "#F4A261",
  drawing: "#A7B7FF",
  living: "#8FE39B",
  lounge: "#8FE39B",
  garage: "#CBD5E1",
  store: "#E5E7EB",
  staircase: "#C4B5FD",
  entrance: "#FDBA74",
  other: "#F8FAFC",
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const safeNumber = (n, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);
const degToRad = (d) => (d * Math.PI) / 180;

function getMetrics(layout, project) {
  const brief = project?.brief || layout?.brief || {};
  const briefPlot = brief.plot || {};
  const plot = layout?.plot || {};
  const dims = layout?.dimensions || {};
  const buildable = layout?.buildable || {};

  const plotWidth =
    safeNumber(dims.plotWidth, 0) ||
    safeNumber(plot.width, 0) ||
    safeNumber(plot.plotWidth, 0) ||
    safeNumber(briefPlot.frontWidth, 0) ||
    safeNumber(brief.plotWidth, 0) ||
    safeNumber(buildable.width, 40) + 2;

  const plotLength =
    safeNumber(dims.plotLength, 0) ||
    safeNumber(plot.length, 0) ||
    safeNumber(plot.plotLength, 0) ||
    safeNumber(briefPlot.leftLength, 0) ||
    safeNumber(brief.plotLength, 0) ||
    safeNumber(buildable.length, 70) + 2;

  const buildableWidth = safeNumber(dims.buildableWidth, 0) || safeNumber(buildable.width, plotWidth);
  const buildableLength = safeNumber(dims.buildableLength, 0) || safeNumber(buildable.length, plotLength);
  const originX = safeNumber(buildable.min_x ?? buildable.offsetX, 0);
  const originY = safeNumber(buildable.min_y ?? buildable.offsetY, 0);

  return { plotWidth, plotLength, buildableWidth, buildableLength, originX, originY };
}

function makeMat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0.02,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    emissive: options.emissive ? new THREE.Color(options.emissive) : new THREE.Color("#000000"),
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
  });
}

function addBox(
  group,
  {
    x = 0,
    y = 0,
    z = 0,
    w = 1,
    h = 1,
    d = 1,
    mat,
    cast = true,
    receive = true,
    name = "",
  }
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d)),
    mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function addLabel(group, text, position, color = "#0f172a") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  roundRect(ctx, 18, 28, 476, 70, 35);
  ctx.fill();
  ctx.strokeStyle = "rgba(15,23,42,0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "800 34px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(text).slice(0, 22), 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  sprite.position.copy(position);
  sprite.scale.set(2.4, 0.6, 1);
  group.add(sprite);
  return sprite;
}

function addTree(group, x, z, scale = 1) {
  const trunkMat = makeMat("#6B3F24", { roughness: 0.9 });
  const leafMat = makeMat("#238447", { roughness: 0.9 });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.9 * scale, 10),
    trunkMat
  );
  trunk.position.set(x, 0.45 * scale, z);
  trunk.castShadow = true;
  group.add(trunk);

  [
    [0.95, 0.55],
    [1.35, 0.75],
    [1.8, 0.55],
  ].forEach(([y, r], i) => {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 16, 12), leafMat);
    crown.position.set(x + (i - 1) * 0.05 * scale, y * scale, z);
    crown.scale.y = 0.8;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
  });
}

function addWindow(group, x, y, z, w, h, direction) {
  const glass = makeMat("#9FE8FF", {
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.05,
    emissive: "#67E8F9",
    emissiveIntensity: 0.12,
  });

  const frame = makeMat("#334155", { roughness: 0.55 });
  const depth = 0.04;
  const isXFace = direction === "east" || direction === "west";

  addBox(group, {
    x,
    y,
    z,
    w: isXFace ? depth : w,
    h,
    d: isXFace ? w : depth,
    mat: glass,
    name: "window",
  });

  const frameT = 0.04;
  if (isXFace) {
    addBox(group, { x, y: y + h / 2, z, w: frameT, h: frameT, d: w + 0.08, mat: frame, cast: false });
    addBox(group, { x, y: y - h / 2, z, w: frameT, h: frameT, d: w + 0.08, mat: frame, cast: false });
    addBox(group, { x, y, z: z - w / 2, w: frameT, h: h + 0.07, d: frameT, mat: frame, cast: false });
    addBox(group, { x, y, z: z + w / 2, w: frameT, h: h + 0.07, d: frameT, mat: frame, cast: false });
  } else {
    addBox(group, { x, y: y + h / 2, z, w: w + 0.08, h: frameT, d: frameT, mat: frame, cast: false });
    addBox(group, { x, y: y - h / 2, z, w: w + 0.08, h: frameT, d: frameT, mat: frame, cast: false });
    addBox(group, { x: x - w / 2, y, z, w: frameT, h: h + 0.07, d: frameT, mat: frame, cast: false });
    addBox(group, { x: x + w / 2, y, z, w: frameT, h: h + 0.07, d: frameT, mat: frame, cast: false });
  }
}

function addDoor(group, x, y, z, w, h, direction, color = "#A86432") {
  const doorMat = makeMat(color, { roughness: 0.58 });
  const trimMat = makeMat("#3F2A1B", { roughness: 0.7 });
  const handleMat = makeMat("#E7C27D", { roughness: 0.24, metalness: 0.35 });
  const depth = 0.06;
  const isXFace = direction === "east" || direction === "west";

  addBox(group, {
    x,
    y,
    z,
    w: isXFace ? depth : w,
    h,
    d: isXFace ? w : depth,
    mat: doorMat,
    name: "door",
  });

  if (isXFace) {
    addBox(group, {
      x,
      y: y + h / 2,
      z,
      w: depth * 1.15,
      h: 0.06,
      d: w + 0.12,
      mat: trimMat,
      cast: false,
    });
    addBox(group, {
      x,
      y,
      z: z + w * 0.28,
      w: 0.03,
      h: 0.03,
      d: 0.03,
      mat: handleMat,
      cast: false,
    });
  } else {
    addBox(group, {
      x,
      y: y + h / 2,
      z,
      w: w + 0.12,
      h: 0.06,
      d: depth * 1.15,
      mat: trimMat,
      cast: false,
    });
    addBox(group, {
      x: x + w * 0.28,
      y,
      z,
      w: 0.03,
      h: 0.03,
      d: 0.03,
      mat: handleMat,
      cast: false,
    });
  }
}

function addDoorwayFrame(group, x, y, z, w, h, direction) {
  const trimMat = makeMat("#EEE7DA", { roughness: 0.75 });
  const darkTrim = makeMat("#6B4A31", { roughness: 0.8 });
  const isXFace = direction === "east" || direction === "west";
  const sideDepth = 0.06;
  const sideW = 0.08;

  if (isXFace) {
    addBox(group, { x, y: y + h / 2, z, w: sideDepth, h: 0.08, d: w + 0.14, mat: darkTrim, cast: false });
    addBox(group, { x, y, z: z - w / 2, w: sideDepth, h: h + 0.06, d: sideW, mat: trimMat, cast: false });
    addBox(group, { x, y, z: z + w / 2, w: sideDepth, h: h + 0.06, d: sideW, mat: trimMat, cast: false });
  } else {
    addBox(group, { x, y: y + h / 2, z, w: w + 0.14, h: 0.08, d: sideDepth, mat: darkTrim, cast: false });
    addBox(group, { x: x - w / 2, y, z, w: sideW, h: h + 0.06, d: sideDepth, mat: trimMat, cast: false });
    addBox(group, { x: x + w / 2, y, z, w: sideW, h: h + 0.06, d: sideDepth, mat: trimMat, cast: false });
  }
}

function addSimpleFurniture(group, room, s, model, yBase, floorH) {
  const type = room.type || "other";
  const rw = safeNumber(room.width, 1) * s;
  const rl = safeNumber(room.height, 1) * s;
  const rx =
    (safeNumber(room.x, 0) - model.metrics.originX + safeNumber(room.width, 1) / 2 - model.metrics.buildableWidth / 2) * s;
  const rz =
    (safeNumber(room.y, 0) - model.metrics.originY + safeNumber(room.height, 1) / 2 - model.metrics.buildableLength / 2) * s;

  const baseY = yBase + 0.18;
  const wood = makeMat("#A47148", { roughness: 0.72 });
  const top = makeMat("#DCC5A1", { roughness: 0.76 });
  const fabric = makeMat("#94A3B8", { roughness: 0.85 });
  const white = makeMat("#F8FAFC", { roughness: 0.8 });
  const dark = makeMat("#334155", { roughness: 0.7 });

  if (type === "bedroom") {
    addBox(group, { x: rx, y: baseY, z: rz, w: Math.min(rw * 0.62, 1.9), h: 0.22, d: Math.min(rl * 0.42, 1.4), mat: wood });
    addBox(group, { x: rx, y: baseY + 0.16, z: rz, w: Math.min(rw * 0.58, 1.8), h: 0.12, d: Math.min(rl * 0.38, 1.28), mat: white });
    addBox(group, { x: rx, y: baseY + 0.3, z: rz - Math.min(rl * 0.18, 0.45), w: Math.min(rw * 0.46, 1.3), h: 0.12, d: 0.18, mat: fabric });
  } else if (type === "living" || type === "lounge" || type === "drawing") {
    addBox(group, { x: rx, y: baseY, z: rz, w: Math.min(rw * 0.55, 1.7), h: 0.22, d: Math.min(rl * 0.24, 0.82), mat: fabric });
    addBox(group, { x: rx, y: baseY + 0.24, z: rz - Math.min(rl * 0.13, 0.24), w: Math.min(rw * 0.55, 1.7), h: 0.2, d: 0.12, mat: fabric });
    addBox(group, { x: rx, y: baseY + 0.09, z: rz + 0.55, w: 0.7, h: 0.12, d: 0.45, mat: top });
  } else if (type === "dining") {
    addBox(group, { x: rx, y: baseY + 0.12, z: rz, w: Math.min(rw * 0.42, 1.3), h: 0.08, d: Math.min(rl * 0.32, 1), mat: top });
    addBox(group, { x: rx, y: baseY - 0.02, z: rz, w: 0.12, h: 0.24, d: 0.12, mat: dark });
  } else if (type === "kitchen") {
    addBox(group, { x: rx - rw * 0.18, y: baseY + 0.12, z: rz - rl * 0.22, w: Math.min(rw * 0.42, 1.45), h: 0.32, d: 0.42, mat: top });
    addBox(group, { x: rx + rw * 0.1, y: baseY + 0.12, z: rz - rl * 0.22, w: 0.52, h: 0.32, d: 0.42, mat: white });
  } else if (type === "bathroom") {
    addBox(group, { x: rx - 0.18, y: baseY + 0.08, z: rz, w: 0.34, h: 0.16, d: 0.5, mat: white });
    addBox(group, { x: rx + 0.24, y: baseY + 0.18, z: rz - 0.2, w: 0.3, h: 0.24, d: 0.22, mat: white });
  } else if (type === "garage") {
    addBox(group, { x: rx, y: baseY + 0.22, z: rz, w: Math.min(rw * 0.72, 2.6), h: 0.42, d: Math.min(rl * 0.46, 1.25), mat: dark });
  } else if (type === "entrance") {
    addBox(group, { x: rx, y: baseY + 0.09, z: rz, w: 0.85, h: 0.08, d: 0.28, mat: wood });
  }

  if (floorH > 1.5 && ["living", "drawing", "lounge", "bedroom"].includes(type)) {
    const lampMat = makeMat("#FDE68A", { emissive: "#FCD34D", emissiveIntensity: 0.35, roughness: 0.4 });
    addBox(group, {
      x: rx + Math.min(rw * 0.22, 0.5),
      y: yBase + floorH * 0.66,
      z: rz + Math.min(rl * 0.18, 0.35),
      w: 0.14,
      h: 0.14,
      d: 0.14,
      mat: lampMat,
      cast: false,
    });
  }
}

function getRoomWorldData(room, model) {
  const x =
    (safeNumber(room.x, 0) -
      model.metrics.originX +
      safeNumber(room.width, 1) / 2 -
      model.metrics.buildableWidth / 2) *
    model.worldScale;

  const z =
    (safeNumber(room.y, 0) -
      model.metrics.originY +
      safeNumber(room.height, 1) / 2 -
      model.metrics.buildableLength / 2) *
    model.worldScale;

  const w = safeNumber(room.width, 1) * model.worldScale;
  const d = safeNumber(room.height, 1) * model.worldScale;

  return { x, z, w, d };
}

function chooseFrontDoor(model) {
  const s = model.worldScale;
  const bL = model.metrics.buildableLength * s;
  const frontZ = bL / 2 + 0.03;

  const roomRank = ["garage", "entrance", "living", "drawing", "lounge"];
  const preferred = [...model.rooms].sort((a, b) => {
    const ai = roomRank.indexOf((a.type || "").toLowerCase());
    const bi = roomRank.indexOf((b.type || "").toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  })[0];

  if (preferred) {
    const info = getRoomWorldData(preferred, model);
    return {
      x: info.x,
      z: frontZ,
      w: 0.95,
      h: 1.95,
      roomName: preferred.name || preferred.label || preferred.type || "Entrance",
      roomType: preferred.type || "entrance",
    };
  }

  return { x: 0, z: frontZ, w: 0.95, h: 1.95, roomName: "Entrance", roomType: "entrance" };
}

function createCollisionData(layout, model, wallT) {
  const s = model.worldScale;
  const bW = model.metrics.buildableWidth * s;
  const bL = model.metrics.buildableLength * s;

  const boundary = {
    minX: -bW / 2 + wallT * 0.8,
    maxX: bW / 2 - wallT * 0.8,
    minZ: -bL / 2 + wallT * 0.8,
    maxZ: bL / 2 - wallT * 0.8,
  };

  return { boundary };
}

function isBlocked(next, collisionData, radius = 0.16) {
  const { boundary } = collisionData;
  if (
    next.x < boundary.minX + radius ||
    next.x > boundary.maxX - radius ||
    next.z < boundary.minZ + radius ||
    next.z > boundary.maxZ - radius
  ) {
    return true;
  }
  return false;
}

function getPrioritizedRooms(model) {
  const order = {
    garage: 1,
    entrance: 2,
    living: 3,
    lounge: 3,
    drawing: 4,
    dining: 5,
    kitchen: 6,
    bedroom: 7,
    bathroom: 8,
    staircase: 9,
    store: 10,
    other: 20,
  };

  return [...model.rooms]
    .map((room, index) => {
      const info = getRoomWorldData(room, model);
      return { room, index, ...info, priority: order[room.type] ?? order.other };
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 10);
}

function buildAutoTourPath(model, entryDoor) {
  const bL = model.metrics.buildableLength * model.worldScale;
  const rooms = getPrioritizedRooms(model);
  const firstInterior = rooms[0] || { x: 0, z: bL * 0.18, room: { type: "garage" } };

  const path = [
    { title: "Front overview", x: 0, y: 1.78, z: bL * 0.98, lookX: 0, lookY: 1.35, lookZ: 0, pause: 1.25 },
    { title: "Front facade", x: entryDoor.x - 1.2, y: 1.72, z: bL * 0.82, lookX: entryDoor.x, lookY: 1.28, lookZ: 0, pause: 0.95 },
    { title: "Approaching main entry", x: entryDoor.x, y: 1.66, z: bL * 0.7, lookX: entryDoor.x, lookY: 1.24, lookZ: entryDoor.z - 0.12, pause: 0.95 },
    { title: "At the entrance", x: entryDoor.x, y: 1.62, z: entryDoor.z + 0.5, lookX: entryDoor.x, lookY: 1.24, lookZ: entryDoor.z - 0.18, pause: 0.85 },
    { title: "Entering the house", x: entryDoor.x, y: 1.58, z: entryDoor.z - 0.6, lookX: firstInterior.x, lookY: 1.3, lookZ: firstInterior.z, pause: 1.0 },
  ];

  rooms.forEach((roomEntry) => {
    path.push({
      title: roomEntry.room.name || roomEntry.room.label || roomEntry.room.type || `Room ${roomEntry.index + 1}`,
      x: roomEntry.x,
      y: 1.58,
      z: roomEntry.z + Math.min(roomEntry.d * 0.18, 0.26),
      lookX: roomEntry.x,
      lookY: 1.28,
      lookZ: roomEntry.z,
      pause: 1.05,
    });
  });

  path.push({
    title: "Final interior overview",
    x: 0,
    y: 1.62,
    z: Math.max(0.7, bL * 0.15),
    lookX: 0,
    lookY: 1.35,
    lookZ: 0,
    pause: 1.0,
  });

  return path;
}

function buildModel({ scene, model, layout, options }) {
  const root = new THREE.Group();
  root.name = "BuildMateHouseModel";
  scene.add(root);

  const materials = {
    ground: makeMat("#BDE6A8", { roughness: 0.92 }),
    road: makeMat("#64748B", { roughness: 0.9 }),
    concrete: makeMat("#D7DCE2", { roughness: 0.68 }),
    whiteWall: makeMat("#F5F3EE", { roughness: 0.74 }),
    accentWall: makeMat("#B7C0C8", { roughness: 0.78 }),
    slab: makeMat("#C9CED6", { roughness: 0.7 }),
    roof: makeMat("#3F4652", { roughness: 0.58 }),
    parapet: makeMat("#E5E7EB", { roughness: 0.7 }),
    internalWall: makeMat("#E9DDD0", {
      roughness: 0.8,
      transparent: options.cutaway,
      opacity: options.cutaway ? 0.58 : 0.92,
    }),
    path: makeMat("#B6A28A", { roughness: 0.88 }),
    water: makeMat("#2563EB", { transparent: true, opacity: 0.62, roughness: 0.2 }),
    solar: makeMat("#0F172A", {
      roughness: 0.4,
      metalness: 0.1,
      emissive: "#0EA5E9",
      emissiveIntensity: 0.05,
    }),
  };

  const s = model.worldScale;
  const bW = model.metrics.buildableWidth * s;
  const bL = model.metrics.buildableLength * s;
  const pW = model.metrics.plotWidth * s;
  const pL = model.metrics.plotLength * s;
  const xOffset = ((model.metrics.originX + model.metrics.buildableWidth / 2) - model.metrics.plotWidth / 2) * s;
  const zOffset = ((model.metrics.originY + model.metrics.buildableLength / 2) - model.metrics.plotLength / 2) * s;

  const floorH = model.floorHeightFt * s;
  const wallT = clamp(0.28 * s, 0.08, 0.18);
  const slabT = 0.14;
  const floorGap = options.exploded ? 0.75 : 0;
  const entryDoor = chooseFrontDoor(model);

  addBox(root, { x: 0, y: -0.05, z: 0, w: pW + 3.8, h: 0.08, d: pL + 3.8, mat: materials.ground, cast: false, receive: true });
  addBox(root, { x: 0, y: 0.005, z: pL / 2 + 0.92, w: pW + 3.8, h: 0.025, d: 1.5, mat: materials.road, cast: false, receive: true });
  addBox(root, { x: entryDoor.x + xOffset, y: 0.02, z: pL / 2 - 1.45, w: Math.max(1.1, bW * 0.16), h: 0.035, d: 3.0, mat: materials.path, cast: false, receive: true });

  if (model.hasGarage) {
    addBox(root, {
      x: -bW * 0.32 + xOffset,
      y: 0.025,
      z: pL / 2 - 1.4,
      w: Math.max(1.8, bW * 0.26),
      h: 0.03,
      d: 2.8,
      mat: materials.concrete,
      cast: false,
      receive: true,
    });
  }

  const plotHelper = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(pW, 0.02, pL)),
    new THREE.LineBasicMaterial({ color: "#22C55E", transparent: true, opacity: 0.72 })
  );
  plotHelper.position.y = 0.04;
  root.add(plotHelper);

  const house = new THREE.Group();
  house.position.set(xOffset, 0, zOffset);
  root.add(house);

  for (let floor = 0; floor < model.floors; floor += 1) {
    const yBase = floor * (floorH + floorGap);
    const floorGroup = new THREE.Group();
    floorGroup.name = `Floor ${floor + 1}`;
    house.add(floorGroup);

    addBox(floorGroup, { x: 0, y: yBase + slabT / 2, z: 0, w: bW, h: slabT, d: bL, mat: materials.slab, name: "floor slab" });

    model.rooms.forEach((room, i) => {
      const roomW = safeNumber(room.width, 1) * s;
      const roomL = safeNumber(room.height, 1) * s;
      const roomX = (safeNumber(room.x, 0) - model.metrics.originX + safeNumber(room.width, 1) / 2 - model.metrics.buildableWidth / 2) * s;
      const roomZ = (safeNumber(room.y, 0) - model.metrics.originY + safeNumber(room.height, 1) / 2 - model.metrics.buildableLength / 2) * s;

      const color = ROOM_COLORS[room.type] || ROOM_COLORS.other;
      const mat = makeMat(color, { roughness: 0.78, transparent: true, opacity: options.roomColors ? 0.72 : 0.15 });

      addBox(floorGroup, {
        x: roomX,
        y: yBase + slabT + 0.012,
        z: roomZ,
        w: Math.max(0.05, roomW - wallT),
        h: 0.025,
        d: Math.max(0.05, roomL - wallT),
        mat,
        cast: false,
        receive: true,
      });

      if (options.labels && floor === 0) {
        addLabel(floorGroup, room.name || room.label || room.type || `Room ${i + 1}`, new THREE.Vector3(roomX, yBase + 0.08, roomZ), "#0f172a");
      }

      if (options.furniture && floor === 0) {
        addSimpleFurniture(floorGroup, room, s, model, yBase, floorH);
      }
    });

    const frontWallH = options.cutaway ? floorH * 0.28 : floorH;
    const frontMat = options.cutaway
      ? makeMat("#F5F3EE", { transparent: true, opacity: 0.4, roughness: 0.74 })
      : materials.whiteWall;

    const rearMat = floor % 2 === 0 ? materials.whiteWall : materials.accentWall;

    if (floor === 0 && !options.cutaway) {
      const doorW = entryDoor.w + 0.18;
      const leftEnd = -bW / 2;
      const rightEnd = bW / 2;
      const doorLeft = entryDoor.x - doorW / 2;
      const doorRight = entryDoor.x + doorW / 2;

      const leftWidth = Math.max(0.01, doorLeft - leftEnd);
      const rightWidth = Math.max(0.01, rightEnd - doorRight);

      if (leftWidth > 0.02) {
        addBox(floorGroup, { x: leftEnd + leftWidth / 2, y: yBase + floorH / 2, z: bL / 2 - wallT / 2, w: leftWidth, h: floorH, d: wallT, mat: frontMat });
      }

      if (rightWidth > 0.02) {
        addBox(floorGroup, { x: doorRight + rightWidth / 2, y: yBase + floorH / 2, z: bL / 2 - wallT / 2, w: rightWidth, h: floorH, d: wallT, mat: frontMat });
      }

      addBox(floorGroup, {
        x: entryDoor.x,
        y: yBase + floorH - (floorH - entryDoor.h) / 2,
        z: bL / 2 - wallT / 2,
        w: doorW,
        h: Math.max(0.2, floorH - entryDoor.h),
        d: wallT,
        mat: frontMat,
      });

      addDoorwayFrame(floorGroup, entryDoor.x, yBase + entryDoor.h / 2, bL / 2 + 0.005, entryDoor.w, entryDoor.h, "south");
      addDoor(floorGroup, entryDoor.x, yBase + entryDoor.h / 2, bL / 2 + 0.03, entryDoor.w * 0.92, entryDoor.h * 0.96, "south");
    } else {
      addBox(floorGroup, { x: 0, y: yBase + frontWallH / 2, z: bL / 2 - wallT / 2, w: bW, h: frontWallH, d: wallT, mat: frontMat });
      if (floor === 0) {
        addDoorwayFrame(floorGroup, entryDoor.x, yBase + entryDoor.h / 2, bL / 2 + 0.005, entryDoor.w, entryDoor.h, "south");
        addDoor(floorGroup, entryDoor.x, yBase + entryDoor.h / 2, bL / 2 + 0.03, entryDoor.w * 0.92, entryDoor.h * 0.96, "south");
      }
    }

    addBox(floorGroup, { x: 0, y: yBase + floorH / 2, z: -bL / 2 + wallT / 2, w: bW, h: floorH, d: wallT, mat: rearMat });
    addBox(floorGroup, { x: -bW / 2 + wallT / 2, y: yBase + floorH / 2, z: 0, w: wallT, h: floorH, d: bL, mat: materials.whiteWall });
    addBox(floorGroup, { x: bW / 2 - wallT / 2, y: yBase + floorH / 2, z: 0, w: wallT, h: floorH, d: bL, mat: materials.accentWall });

    if (options.internalWalls) {
      const walls = Array.isArray(layout?.walls) && layout.walls.length ? layout.walls : null;
      if (walls) {
        walls.forEach((wall) => {
          const x1 = safeNumber(wall.x1 ?? wall.start?.x, 0) - model.metrics.originX - model.metrics.buildableWidth / 2;
          const y1 = safeNumber(wall.y1 ?? wall.start?.y, 0) - model.metrics.originY - model.metrics.buildableLength / 2;
          const x2 = safeNumber(wall.x2 ?? wall.end?.x, x1) - model.metrics.originX - model.metrics.buildableWidth / 2;
          const y2 = safeNumber(wall.y2 ?? wall.end?.y, y1) - model.metrics.originY - model.metrics.buildableLength / 2;

          const centerX = (Math.min(x1, x2) + Math.abs(x2 - x1) / 2) * s;
          const centerZ = (Math.min(y1, y2) + Math.abs(y2 - y1) / 2) * s;
          const ww = Math.max(wallT * 0.8, Math.abs(x2 - x1) * s || wallT);
          const dd = Math.max(wallT * 0.8, Math.abs(y2 - y1) * s || wallT);

          addBox(floorGroup, {
            x: centerX,
            y: yBase + floorH * 0.42,
            z: centerZ,
            w: ww,
            h: floorH * 0.84,
            d: dd,
            mat: materials.internalWall,
          });
        });
      }
    }

    if (floor > 0) {
      addBox(floorGroup, { x: bW * 0.22, y: yBase + slabT + 0.02, z: bL / 2 + 0.45, w: bW * 0.34, h: 0.1, d: 0.9, mat: materials.concrete });
      const railMat = makeMat("#DCE8EF", { transparent: true, opacity: 0.68, roughness: 0.25 });
      addBox(floorGroup, { x: bW * 0.22, y: yBase + 0.65, z: bL / 2 + 0.9, w: bW * 0.34, h: 0.65, d: 0.035, mat: railMat });
    }

    if (options.openings) {
      (layout?.openings || []).forEach((opening) => {
        const kind = opening.kind || opening.type || "window";
        const direction = opening.direction || "north";
        const ox = (safeNumber(opening.x, 0) - model.metrics.originX - model.metrics.buildableWidth / 2) * s;
        const oz = (safeNumber(opening.y, 0) - model.metrics.originY - model.metrics.buildableLength / 2) * s;
        const ow = clamp(safeNumber(opening.width, kind === "door" ? 3 : 4) * s, 0.45, 1.6);

        if (kind === "door") {
          addDoorwayFrame(floorGroup, ox, yBase + floorH * 0.34, oz, ow, floorH * 0.68, direction);
          addDoor(floorGroup, ox, yBase + floorH * 0.34, oz, ow * 0.92, floorH * 0.66, direction, "#99623A");
        } else {
          addWindow(floorGroup, ox, yBase + floorH * 0.58, oz, ow, floorH * 0.34, direction);
        }
      });
    }

    addWindow(floorGroup, -bW / 2 - wallT * 0.54, yBase + floorH * 0.6, -bL * 0.18, clamp(bL * 0.16, 0.7, 1.5), floorH * 0.32, "west");
    addWindow(floorGroup, bW / 2 + wallT * 0.54, yBase + floorH * 0.58, bL * 0.12, clamp(bL * 0.14, 0.65, 1.4), floorH * 0.32, "east");
  }

  const topY = model.floors * (floorH + floorGap) - floorGap;
  addBox(house, { x: 0, y: topY + slabT / 2, z: 0, w: bW + 0.16, h: slabT, d: bL + 0.16, mat: materials.roof });

  const parapetH = 0.42;
  addBox(house, { x: 0, y: topY + parapetH / 2, z: bL / 2 - wallT / 2, w: bW, h: parapetH, d: wallT, mat: materials.parapet });
  addBox(house, { x: 0, y: topY + parapetH / 2, z: -bL / 2 + wallT / 2, w: bW, h: parapetH, d: wallT, mat: materials.parapet });
  addBox(house, { x: -bW / 2 + wallT / 2, y: topY + parapetH / 2, z: 0, w: wallT, h: parapetH, d: bL, mat: materials.parapet });
  addBox(house, { x: bW / 2 - wallT / 2, y: topY + parapetH / 2, z: 0, w: wallT, h: parapetH, d: bL, mat: materials.parapet });

  addBox(house, { x: -bW * 0.24, y: topY + 0.22, z: -bL * 0.25, w: Math.min(1.7, bW * 0.22), h: 0.08, d: Math.min(1.0, bL * 0.16), mat: materials.solar });
  addBox(house, { x: bW * 0.3, y: topY + 0.35, z: -bL * 0.25, w: 0.75, h: 0.5, d: 0.75, mat: materials.water });

  if (model.floors === 1) {
    const roofGroup = new THREE.Group();
    roofGroup.position.set(0, topY + 0.14, -bL * 0.06);
    house.add(roofGroup);

    const roofMat = makeMat("#374151", { roughness: 0.5 });
    const roofGeo = new THREE.ConeGeometry(Math.max(bW, bL) * 0.42, 1.1, 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.scale.set(1.25, 0.55, 0.75);
    roofMesh.position.y = 0.45;
    roofMesh.castShadow = true;
    roofGroup.add(roofMesh);
  }

  addTree(root, -pW / 2 + 1.0, -pL / 2 + 1.2, 0.9);
  addTree(root, pW / 2 - 1.1, -pL / 2 + 1.0, 1.05);
  addTree(root, pW / 2 - 1.2, pL / 2 - 2.0, 0.75);

  const shrubMat = makeMat("#4D7C0F", { roughness: 0.9 });
  for (let i = 0; i < 12; i += 1) {
    const x = -pW / 2 + 0.7 + (i * (pW - 1.4)) / 11;
    const z = pL / 2 - 0.45;
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), shrubMat);
    shrub.position.set(x, 0.13, z);
    shrub.scale.set(1.3, 0.6, 1);
    shrub.castShadow = true;
    root.add(shrub);
  }

  return { root, entryDoor };
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" className="bm3d-toggle" data-active={checked} onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span
        style={{
          width: 36,
          height: 21,
          borderRadius: 999,
          padding: 2,
          background: checked ? "linear-gradient(135deg,#7C3AED,#06B6D4)" : "#CBD5E1",
          transition: "all .2s",
          flex: "0 0 auto",
        }}
      >
        <i
          style={{
            display: "block",
            width: 17,
            height: 17,
            borderRadius: 999,
            background: "white",
            transform: `translateX(${checked ? 15 : 0}px)`,
            transition: "transform .2s",
            boxShadow: "0 2px 5px rgba(15,23,42,.2)",
          }}
        />
      </span>
    </button>
  );
}

function ControlsSection({
  mode,
  switchMode,
  autoTourPlaying,
  setAutoTourPlaying,
  controlsRef,
  resetCamera,
  takeScreenshot,
  model,
  cutaway,
  setCutaway,
  exploded,
  setExploded,
  labels,
  setLabels,
  openings,
  setOpenings,
  internalWalls,
  setInternalWalls,
  roomColors,
  setRoomColors,
  furniture,
  setFurniture,
  collision,
  setCollision,
  quality,
  setQuality,
}) {
  return (
    <div className="bm3d-controls-wrap">
      <div className="bm3d-controls-top">
        <div className="bm3d-controls-title">
          <div className="bm3d-icon-box">🏠</div>
          <div>
            <h3>3D Model Controls</h3>
            <p>Full-width viewer + bottom controls</p>
          </div>
        </div>

        <button
          type="button"
          className="bm3d-btn bm3d-primary"
          onClick={() => window.dispatchEvent(new Event("buildmate:open-3d-guide"))}
        >
          ✨ Start 3D Guide
        </button>
      </div>

      <div className="bm3d-controls-grid">
        <section className="bm3d-control-card" data-tour="mode-controls">
          <p className="bm3d-section-label">Navigation</p>
          <div className="bm3d-three-grid">
            <button className={`bm3d-btn ${mode === "orbit" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => switchMode("orbit")}>
              🛰️ Orbit
            </button>
            <button className={`bm3d-btn ${mode === "walk" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => switchMode("walk")}>
              🚶 Walk
            </button>
            <button className={`bm3d-btn ${mode === "tour" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => switchMode("tour")}>
              ▶ Tour
            </button>
          </div>

          {mode === "tour" && (
            <div data-tour="tour-controls" className="bm3d-two-grid" style={{ marginTop: ".6rem" }}>
              <button className="bm3d-btn bm3d-secondary" onClick={() => setAutoTourPlaying((v) => !v)}>
                {autoTourPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                className="bm3d-btn bm3d-secondary"
                onClick={() => {
                  controlsRef.current?.reset?.("tour");
                  setAutoTourPlaying(true);
                }}
              >
                ↺ Restart Tour
              </button>
            </div>
          )}
        </section>

        <section className="bm3d-control-card" data-tour="reset-controls">
          <p className="bm3d-section-label">Actions</p>
          <div className="bm3d-two-grid">
            <button className="bm3d-btn bm3d-secondary" onClick={resetCamera}>
              ↺ Reset
            </button>
            <button className="bm3d-btn bm3d-secondary" onClick={takeScreenshot}>
              📸 PNG
            </button>
          </div>
        </section>

        <section className="bm3d-control-card">
          <p className="bm3d-section-label">Project Stats</p>
          <div className="bm3d-stat-grid">
            {[
              ["Rooms", model.rooms.length],
              ["Floors", model.floors],
              ["Area", `${Math.round(model.totalArea).toLocaleString()} ft²`],
              ["Height", `${Math.round(model.floorHeightFt * model.floors)}'`],
            ].map(([label, value]) => (
              <div className="bm3d-stat" key={label}>
                <p>{label}</p>
                <p>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bm3d-control-card bm3d-wide-card" data-tour="visual-toggles">
          <p className="bm3d-section-label">Visual Controls</p>
          <div className="bm3d-toggle-grid">
            <Toggle checked={cutaway} onChange={setCutaway} label="Dollhouse cutaway view" />
            <Toggle checked={exploded} onChange={setExploded} label="Exploded floors" />
            <Toggle checked={labels} onChange={setLabels} label="Room labels" />
            <Toggle checked={openings} onChange={setOpenings} label="Doors/windows from layout" />
            <Toggle checked={internalWalls} onChange={setInternalWalls} label="Internal walls" />
            <Toggle checked={roomColors} onChange={setRoomColors} label="Room color zoning" />
            <Toggle checked={furniture} onChange={setFurniture} label="Simple furniture" />
            <Toggle checked={collision} onChange={setCollision} label="Walk boundary collision" />
          </div>
        </section>

        <section className="bm3d-control-card">
          <p className="bm3d-section-label">Render Quality</p>
          <div className="bm3d-two-grid">
            <button className={`bm3d-btn ${quality === "fast" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => setQuality("fast")}>
              Fast
            </button>
            <button className={`bm3d-btn ${quality === "high" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => setQuality("high")}>
              High
            </button>
          </div>
        </section>

        <section className="bm3d-control-card">
          <p className="bm3d-section-label">Tips</p>
          <div className="bm3d-note-box">
            Front entry now prefers <strong>garage → entrance → living</strong>. Walk mode starts near the entry so movement feels more natural, and the viewer stays large with controls below.
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ThreeDViewer({ project, layout }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef({});

  const [mode, setMode] = useState("orbit");
  const [cutaway, setCutaway] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [labels, setLabels] = useState(true);
  const [openings, setOpenings] = useState(true);
  const [internalWalls, setInternalWalls] = useState(true);
  const [roomColors, setRoomColors] = useState(true);
  const [furniture, setFurniture] = useState(true);
  const [collision, setCollision] = useState(true);
  const [quality, setQuality] = useState("high");
  const [autoTourPlaying, setAutoTourPlaying] = useState(false);
  const [tourTitle, setTourTitle] = useState("Front overview");

  const model = useMemo(() => {
    const brief = project?.brief || layout?.brief || {};
    const technical = brief.technical || {};
    const metrics = getMetrics(layout, project);
    const rooms = Array.isArray(layout?.rooms) ? layout.rooms : [];
    const floors = clamp(Math.round(safeNumber(brief.floors ?? layout?.meta?.floors, 1)), 1, 6);
    const floorHeightFt = safeNumber(technical.floorHeight, 10);
    const hasGarage = Boolean(brief.hasGarage || rooms.some((r) => r.type === "garage"));
    const worldScale = clamp(16 / Math.max(metrics.plotWidth, metrics.plotLength, 30), 0.16, 0.38);
    const totalArea = rooms.reduce((sum, room) => sum + safeNumber(room.width, 0) * safeNumber(room.height, 0), 0);
    return { brief, metrics, rooms, floors, floorHeightFt, hasGarage, worldScale, totalArea };
  }, [layout, project]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const width = mount.clientWidth || 1200;
    const height = mount.clientHeight || 780;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#DDEAF3");
    scene.fog = new THREE.Fog("#DDEAF3", 18, 56);

    const camera = new THREE.PerspectiveCamera(54, width / height, 0.05, 500);

    const renderer = new THREE.WebGLRenderer({
      antialias: quality === "high",
      alpha: false,
      preserveDrawingBuffer: true,
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "high" ? 2 : 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.HemisphereLight("#E0F2FE", "#7C5A3A", 1.6));

    const sun = new THREE.DirectionalLight("#FFFFFF", 2.35);
    sun.position.set(-8, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = quality === "high" ? 2048 : 1024;
    sun.shadow.mapSize.height = quality === "high" ? 2048 : 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    scene.add(sun);

    const warm = new THREE.PointLight("#FDBA74", 1.15, 22);
    warm.position.set(3, 4, 5);
    scene.add(warm);

    const { root: modelRoot, entryDoor } = buildModel({
      scene,
      model,
      layout,
      options: { cutaway, exploded, labels, openings, internalWalls, roomColors, furniture },
    });

    const grid = new THREE.GridHelper(38, 38, "#38BDF8", "#93C5FD");
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.14;
    scene.add(grid);

    const wallT = clamp(0.28 * model.worldScale, 0.08, 0.18);
    const collisionData = createCollisionData(layout, model, wallT);
    const autoTourPath = buildAutoTourPath(model, entryDoor);
    const initialRadius = width < 900 ? 13.5 : 16;
    const walkStart = autoTourPath[3] || autoTourPath[0] || { x: entryDoor.x, z: entryDoor.z - 0.6 };

    const controls = {
      mode,
      target: new THREE.Vector3(0, 1.35, 0),
      radius: initialRadius,
      theta: degToRad(38),
      phi: degToRad(width < 900 ? 60 : 56),
      yaw: degToRad(180),
      pitch: degToRad(-2),
      walkPos: new THREE.Vector3(walkStart.x, 1.62, walkStart.z),
      walkVel: new THREE.Vector3(0, 0, 0),
      dragging: false,
      lastX: 0,
      lastY: 0,
      keys: {},
      autoTourIndex: 0,
      autoTourPause: 0,
      autoTourLookAt: new THREE.Vector3(0, 1.35, 0),
      reset(nextMode = mode) {
        this.radius = initialRadius;
        this.theta = degToRad(38);
        this.phi = degToRad(width < 900 ? 60 : 56);
        this.yaw = degToRad(180);
        this.pitch = degToRad(-2);
        this.walkVel.set(0, 0, 0);
        this.autoTourIndex = 0;
        this.autoTourPause = 0;

        if (nextMode === "walk") {
          this.walkPos.set(walkStart.x, 1.62, walkStart.z);
        } else {
          this.walkPos.set(0, 1.62, autoTourPath[0]?.z || 4.8);
        }

        const first = autoTourPath[0] || { lookX: 0, lookY: 1.35, lookZ: 0, title: "Front overview" };
        this.autoTourLookAt.set(first.lookX, first.lookY, first.lookZ);
        setTourTitle(first.title || "Front overview");
      },
    };

    controlsRef.current = controls;

    const setOrbitCamera = () => {
      const x = controls.target.x + controls.radius * Math.sin(controls.phi) * Math.sin(controls.theta);
      const y = controls.target.y + controls.radius * Math.cos(controls.phi);
      const z = controls.target.z + controls.radius * Math.sin(controls.phi) * Math.cos(controls.theta);
      camera.position.set(x, y, z);
      camera.lookAt(controls.target);
    };

    const setWalkCamera = () => {
      camera.position.copy(controls.walkPos);
      const dir = new THREE.Vector3(
        Math.sin(controls.yaw) * Math.cos(controls.pitch),
        Math.sin(controls.pitch),
        Math.cos(controls.yaw) * Math.cos(controls.pitch)
      );
      camera.lookAt(camera.position.clone().add(dir));
    };

    const setAutoTourCamera = (lookAt) => {
      camera.position.copy(controls.walkPos);
      camera.lookAt(lookAt);
    };

    setOrbitCamera();

    const onResize = () => {
      const w = mount.clientWidth || 1200;
      const h = mount.clientHeight || 780;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onPointerDown = (e) => {
      controls.dragging = true;
      controls.lastX = e.clientX;
      controls.lastY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!controls.dragging) return;

      const dx = e.clientX - controls.lastX;
      const dy = e.clientY - controls.lastY;
      controls.lastX = e.clientX;
      controls.lastY = e.clientY;

      if (controls.mode === "walk") {
        controls.yaw -= dx * 0.0031;
        controls.pitch = clamp(controls.pitch - dy * 0.0024, degToRad(-50), degToRad(50));
      } else if (controls.mode === "orbit") {
        controls.theta -= dx * 0.0055;
        controls.phi = clamp(controls.phi - dy * 0.0039, degToRad(20), degToRad(82));
      }
    };

    const onPointerUp = (e) => {
      controls.dragging = false;
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    };

    const onWheel = (e) => {
      e.preventDefault();
      if (controls.mode === "walk") {
        const dir = new THREE.Vector3(Math.sin(controls.yaw), 0, Math.cos(controls.yaw));
        const next = controls.walkPos.clone().addScaledVector(dir, e.deltaY > 0 ? -0.22 : 0.22);
        if (!collision || !isBlocked(next, collisionData, 0.18)) {
          controls.walkPos.copy(next);
        }
      } else if (controls.mode === "orbit") {
        controls.radius = clamp(controls.radius + e.deltaY * 0.012, 4.8, 34);
      }
    };

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      controls.keys[key] = true;
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e) => {
      controls.keys[e.key.toLowerCase()] = false;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    let last = performance.now();

    const animate = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      controls.mode = mode;

      if (controls.mode === "walk") {
        const moveSpeed = (controls.keys.shift ? 3.7 : 1.95) * dt;
        const forward = new THREE.Vector3(Math.sin(controls.yaw), 0, Math.cos(controls.yaw));
        const right = new THREE.Vector3(Math.cos(controls.yaw), 0, -Math.sin(controls.yaw));
        const desired = new THREE.Vector3();

        if (controls.keys.w || controls.keys.arrowup) desired.addScaledVector(forward, moveSpeed);
        if (controls.keys.s || controls.keys.arrowdown) desired.addScaledVector(forward, -moveSpeed);
        if (controls.keys.d || controls.keys.arrowright) desired.addScaledVector(right, moveSpeed);
        if (controls.keys.a || controls.keys.arrowleft) desired.addScaledVector(right, -moveSpeed);

        controls.walkVel.lerp(desired, 0.18);

        const nextX = controls.walkPos.clone();
        nextX.x += controls.walkVel.x;
        if (!collision || !isBlocked(nextX, collisionData, 0.16)) {
          controls.walkPos.x = nextX.x;
        }

        const nextZ = controls.walkPos.clone();
        nextZ.z += controls.walkVel.z;
        if (!collision || !isBlocked(nextZ, collisionData, 0.16)) {
          controls.walkPos.z = nextZ.z;
        }

        if (controls.keys.q) controls.walkPos.y = clamp(controls.walkPos.y - moveSpeed, 1.05, 3.6);
        if (controls.keys.e) controls.walkPos.y = clamp(controls.walkPos.y + moveSpeed, 1.05, 3.6);

        setWalkCamera();
      } else if (controls.mode === "tour") {
        if (autoTourPlaying && autoTourPath.length) {
          const current = autoTourPath[controls.autoTourIndex] || autoTourPath[0];
          const targetPos = new THREE.Vector3(current.x, current.y, current.z);
          const targetLook = new THREE.Vector3(current.lookX, current.lookY, current.lookZ);

          setTourTitle(current.title || "Tour");

          const distance = controls.walkPos.distanceTo(targetPos);

          if (distance > 0.06) {
            controls.walkPos.lerp(targetPos, 0.022 + dt * 1.45);
            controls.autoTourLookAt.lerp(targetLook, 0.028 + dt * 1.5);
          } else if (controls.autoTourPause < (current.pause ?? 1.0)) {
            controls.autoTourPause += dt;
            controls.autoTourLookAt.lerp(targetLook, 0.05);
          } else {
            controls.autoTourIndex = (controls.autoTourIndex + 1) % autoTourPath.length;
            controls.autoTourPause = 0;
          }
        }

        setAutoTourCamera(controls.autoTourLookAt);
      } else {
        setOrbitCamera();
      }

      modelRoot.rotation.y = Math.sin(now * 0.00016) * 0.01;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
        if (obj.material?.map) obj.material.map.dispose?.();
      });

      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [
    model,
    layout,
    mode,
    cutaway,
    exploded,
    labels,
    openings,
    internalWalls,
    roomColors,
    furniture,
    collision,
    quality,
    autoTourPlaying,
  ]);

  const resetCamera = () => controlsRef.current?.reset?.(mode);

  const takeScreenshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const link = document.createElement("a");
    link.download = `${project?.name || "buildmate"}-3d-house.png`;
    link.href = renderer.domElement.toDataURL("image/png", 1);
    link.click();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "tour") {
      controlsRef.current?.reset?.("tour");
      setAutoTourPlaying(true);
    } else if (nextMode === "walk") {
      controlsRef.current?.reset?.("walk");
      setAutoTourPlaying(false);
    } else {
      controlsRef.current?.reset?.("orbit");
      setAutoTourPlaying(false);
    }
  };

  return (
    <div className="bm3d-full-page">
      <style>{`
        .bm3d-full-page {
          display:flex;
          flex-direction:column;
          gap:1rem;
          width:100%;
        }

        .bm3d-render-card {
          min-height: 72vh;
          height: 72vh;
          width:100%;
          border-radius: 30px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,.55);
          box-shadow: 0 34px 100px rgba(15,23,42,.25);
          background: linear-gradient(135deg,#DDEAF3,#EEF7FF);
        }

        .bm3d-render-mount { position:absolute; inset:0; }
        .bm3d-render-mount canvas { width:100%!important; height:100%!important; display:block; cursor:grab; }
        .bm3d-render-mount canvas:active { cursor:grabbing; }

        .bm3d-top-hud {
          position:absolute;
          left:18px;
          top:18px;
          z-index:5;
          color:#0f172a;
          display:flex;
          flex-direction:column;
          gap:.55rem;
          max-width:min(560px, calc(100% - 36px));
        }

        .bm3d-badge {
          width:max-content;
          display:inline-flex;
          align-items:center;
          gap:.48rem;
          padding:.5rem .82rem;
          border-radius:999px;
          background:rgba(255,255,255,.8);
          border:1px solid rgba(255,255,255,.72);
          backdrop-filter:blur(12px);
          box-shadow:0 10px 24px rgba(15,23,42,.10);
          font-size:.78rem;
          font-weight:900;
        }

        .bm3d-bottom-help {
          position:absolute;
          left:18px;
          bottom:18px;
          z-index:5;
          display:flex;
          gap:.5rem;
          flex-wrap:wrap;
          max-width:calc(100% - 36px);
        }

        .bm3d-help-chip {
          padding:.42rem .62rem;
          border-radius:999px;
          background:rgba(15,23,42,.74);
          color:white;
          border:1px solid rgba(255,255,255,.15);
          font-size:.7rem;
          font-weight:800;
          backdrop-filter:blur(10px);
        }

        .bm3d-tour-chip {
          position:absolute;
          right:18px;
          top:18px;
          z-index:6;
          padding:.55rem .8rem;
          border-radius:16px;
          background:rgba(255,255,255,.82);
          color:#0f172a;
          border:1px solid rgba(255,255,255,.72);
          box-shadow:0 12px 28px rgba(15,23,42,.12);
          backdrop-filter:blur(12px);
          font-size:.76rem;
          font-weight:900;
          max-width:min(280px, calc(100% - 36px));
        }

        .bm3d-controls-wrap {
          border-radius: 30px;
          background:rgba(255,255,255,.88);
          border:1px solid rgba(255,255,255,.58);
          box-shadow:0 24px 80px rgba(15,23,42,.12), inset 0 1px 0 rgba(255,255,255,.9);
          backdrop-filter:blur(22px) saturate(180%);
          padding:1.15rem;
        }

        .bm3d-controls-top {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:1rem;
          flex-wrap:wrap;
          margin-bottom:1rem;
        }

        .bm3d-controls-title {
          display:flex;
          align-items:center;
          gap:.7rem;
        }

        .bm3d-controls-title h3 {
          margin:0;
          font-family:'Syne',sans-serif;
          font-size:1.02rem;
          color:#111827;
          font-weight:950;
        }

        .bm3d-controls-title p {
          margin:0;
          font-size:.72rem;
          color:#64748B;
          font-weight:700;
        }

        .bm3d-icon-box {
          width:40px;
          height:40px;
          border-radius:14px;
          display:grid;
          place-items:center;
          color:white;
          background:linear-gradient(135deg,#7C3AED,#06B6D4);
          box-shadow:0 10px 22px rgba(124,58,237,.28);
          flex:0 0 auto;
        }

        .bm3d-controls-grid {
          display:grid;
          grid-template-columns:repeat(12, minmax(0,1fr));
          gap:.8rem;
        }

        .bm3d-control-card {
          grid-column:span 4;
          border-radius:22px;
          background:rgba(255,255,255,.66);
          border:1px solid rgba(148,163,184,.18);
          padding:.9rem;
        }

        .bm3d-wide-card {
          grid-column:span 8;
        }

        .bm3d-section-label {
          margin:0 0 .65rem;
          font-size:.68rem;
          text-transform:uppercase;
          letter-spacing:.08em;
          color:#94A3B8;
          font-weight:950;
        }

        .bm3d-three-grid {
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
          gap:.55rem;
        }

        .bm3d-two-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:.55rem;
        }

        .bm3d-toggle-grid {
          display:grid;
          grid-template-columns:repeat(auto-fit, minmax(230px, 1fr));
          gap:.55rem;
        }

        .bm3d-stat-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:.55rem;
        }

        .bm3d-stat {
          padding:.72rem;
          border-radius:17px;
          background:rgba(124,58,237,.07);
          border:1px solid rgba(124,58,237,.12);
        }

        .bm3d-stat p:first-child {
          font-size:.62rem;
          text-transform:uppercase;
          letter-spacing:.08em;
          color:#7C3AED;
          font-weight:950;
          margin-bottom:.18rem;
        }

        .bm3d-stat p:last-child {
          font-size:.9rem;
          color:#111827;
          font-weight:950;
          margin:0;
        }

        .bm3d-btn {
          border:none;
          border-radius:999px;
          padding:.62rem .9rem;
          font-family:inherit;
          cursor:pointer;
          font-size:.78rem;
          font-weight:900;
          transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .bm3d-btn:hover { transform:translateY(-1px); }

        .bm3d-primary {
          color:white;
          background:linear-gradient(135deg,#7C3AED,#06B6D4);
          box-shadow:0 10px 22px rgba(124,58,237,.25);
        }

        .bm3d-secondary {
          color:#334155;
          background:rgba(241,245,249,.9);
          border:1px solid rgba(148,163,184,.25);
        }

        .bm3d-toggle {
          width:100%;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:.75rem;
          padding:.6rem .68rem;
          border-radius:15px;
          border:1px solid rgba(148,163,184,.24);
          background:rgba(255,255,255,.66);
          font-family:inherit;
          cursor:pointer;
          color:#334155;
          font-size:.78rem;
          font-weight:850;
        }

        .bm3d-toggle[data-active="true"] {
          background:rgba(124,58,237,.09);
          border-color:rgba(124,58,237,.18);
        }

        .bm3d-note-box {
          padding:.85rem;
          border-radius:18px;
          background:rgba(14,165,233,.07);
          border:1px solid rgba(14,165,233,.14);
          color:#475569;
          font-size:.75rem;
          line-height:1.65;
          font-weight:700;
        }

        @media (max-width:1200px) {
          .bm3d-control-card { grid-column:span 6; }
          .bm3d-wide-card { grid-column:span 12; }
        }

        @media (max-width:900px) {
          .bm3d-render-card {
            min-height:68vh;
            height:68vh;
          }
          .bm3d-control-card,
          .bm3d-wide-card {
            grid-column:span 12;
          }
        }

        @media (max-width:720px) {
          .bm3d-render-card {
            min-height:64vh;
            height:64vh;
            border-radius:24px;
          }

          .bm3d-top-hud {
            left:14px;
            top:14px;
            max-width:calc(100% - 28px);
          }

          .bm3d-bottom-help {
            left:14px;
            bottom:14px;
            max-width:calc(100% - 28px);
          }

          .bm3d-tour-chip {
            right:14px;
            top:14px;
            max-width:calc(100% - 28px);
          }

          .bm3d-three-grid,
          .bm3d-two-grid {
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <section className="bm3d-render-card" data-tour="scene">
        <div ref={mountRef} className="bm3d-render-mount" />

        <div className="bm3d-top-hud">
          <div className="bm3d-badge">
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: "#22C55E",
                boxShadow: "0 0 14px #22C55E",
              }}
            />
            Real WebGL 3D model from selected layout
          </div>

          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 22,
              background: "rgba(255,255,255,.74)",
              border: "1px solid rgba(255,255,255,.68)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 14px 34px rgba(15,23,42,.10)",
              width: "200px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Syne',sans-serif",
                fontSize: "1.15rem",
                fontWeight: 950,
                letterSpacing: "-0.04em",
                color: "#0f172a",
              }}
            >
              Architectural 3D House + Full Viewer Walkthrough
            </h2>
            <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.78rem", fontWeight: 700 }}>
              Larger full-width 3D view, bottom controls, corrected front entry preference, and improved walk mode.
            </p>
          </div>
        </div>

        {mode === "tour" && <div className="bm3d-tour-chip">🧭 {tourTitle}</div>}

        <div className="bm3d-bottom-help" data-tour="helper-chips">
          {mode === "walk" ? (
            <>
              <span className="bm3d-help-chip">W/A/S/D or arrows: move</span>
              <span className="bm3d-help-chip">Drag mouse: look</span>
              <span className="bm3d-help-chip">Shift: faster</span>
              <span className="bm3d-help-chip">Starts near front entry</span>
            </>
          ) : mode === "tour" ? (
            <>
              <span className="bm3d-help-chip">Tour starts outside</span>
              <span className="bm3d-help-chip">Enters from front</span>
              <span className="bm3d-help-chip">Visits rooms</span>
            </>
          ) : (
            <>
              <span className="bm3d-help-chip">Drag: orbit</span>
              <span className="bm3d-help-chip">Wheel: zoom</span>
              <span className="bm3d-help-chip">Cutaway shows interior rooms</span>
            </>
          )}
        </div>
      </section>

      <ControlsSection
        mode={mode}
        switchMode={switchMode}
        autoTourPlaying={autoTourPlaying}
        setAutoTourPlaying={setAutoTourPlaying}
        controlsRef={controlsRef}
        resetCamera={() => controlsRef.current?.reset?.(mode)}
        takeScreenshot={takeScreenshot}
        model={model}
        cutaway={cutaway}
        setCutaway={setCutaway}
        exploded={exploded}
        setExploded={setExploded}
        labels={labels}
        setLabels={setLabels}
        openings={openings}
        setOpenings={setOpenings}
        internalWalls={internalWalls}
        setInternalWalls={setInternalWalls}
        roomColors={roomColors}
        setRoomColors={setRoomColors}
        furniture={furniture}
        setFurniture={setFurniture}
        collision={collision}
        setCollision={setCollision}
        quality={quality}
        setQuality={setQuality}
      />

      <ThreeDWalkthrough />
    </div>
  );
}