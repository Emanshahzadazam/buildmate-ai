
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

function addBox(group, { x = 0, y = 0, z = 0, w = 1, h = 1, d = 1, mat, cast = true, receive = true, name = "" }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d)), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function addLabel(group, text, position, color = "#0f172a") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
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
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.position.copy(position);
  sprite.scale.set(2.4, 0.6, 1);
  group.add(sprite);
  return sprite;
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

function addTree(group, x, z, scale = 1) {
  const trunkMat = makeMat("#6B3F24", { roughness: 0.9 });
  const leafMat = makeMat("#238447", { roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.9 * scale, 10), trunkMat);
  trunk.position.set(x, 0.45 * scale, z);
  trunk.castShadow = true;
  group.add(trunk);

  [[0.95, 0.55], [1.35, 0.75], [1.8, 0.55]].forEach(([y, r], i) => {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 16, 12), leafMat);
    crown.position.set(x + (i - 1) * 0.05 * scale, y * scale, z);
    crown.scale.y = 0.8;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
  });
}

function addWindow(group, x, y, z, w, h, direction, label = "") {
  const glass = makeMat("#9FE8FF", {
    transparent: true,
    opacity: 0.66,
    roughness: 0.12,
    metalness: 0.05,
    emissive: "#67E8F9",
    emissiveIntensity: 0.12,
  });
  const frame = makeMat("#334155", { roughness: 0.55 });
  const depth = 0.035;

  const isXFace = direction === "east" || direction === "west";
  addBox(group, {
    x,
    y,
    z,
    w: isXFace ? depth : w,
    h,
    d: isXFace ? w : depth,
    mat: glass,
    name: label,
  });

  const frameT = 0.035;
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

function addDoor(group, x, y, z, w, h, direction) {
  const doorMat = makeMat("#A86432", { roughness: 0.62 });
  const trimMat = makeMat("#3F2A1B", { roughness: 0.7 });
  const depth = 0.05;

  const isXFace = direction === "east" || direction === "west";
  addBox(group, { x, y, z, w: isXFace ? depth : w, h, d: isXFace ? w : depth, mat: doorMat });

  if (isXFace) {
    addBox(group, { x, y: y + h / 2, z, w: depth * 1.2, h: 0.06, d: w + 0.12, mat: trimMat, cast: false });
  } else {
    addBox(group, { x, y: y + h / 2, z, w: w + 0.12, h: 0.06, d: depth * 1.2, mat: trimMat, cast: false });
  }
}

function buildModel({ scene, model, layout, project, options }) {
  const root = new THREE.Group();
  root.name = "BuildMateHouseModel";
  scene.add(root);

  const materials = {
    ground: makeMat("#BDE6A8", { roughness: 0.92 }),
    road: makeMat("#64748B", { roughness: 0.9 }),
    concrete: makeMat("#D7DCE2", { roughness: 0.68 }),
    whiteWall: makeMat("#F5F3EE", { roughness: 0.74 }),
    accentWall: makeMat("#B7C0C8", { roughness: 0.78 }),
    darkWall: makeMat("#334155", { roughness: 0.62 }),
    slab: makeMat("#C9CED6", { roughness: 0.7 }),
    roof: makeMat("#3F4652", { roughness: 0.58 }),
    parapet: makeMat("#E5E7EB", { roughness: 0.7 }),
    internalWall: makeMat("#E9DDD0", { roughness: 0.8, transparent: options.cutaway, opacity: options.cutaway ? 0.62 : 0.92 }),
    path: makeMat("#B6A28A", { roughness: 0.88 }),
    water: makeMat("#2563EB", { transparent: true, opacity: 0.62, roughness: 0.2 }),
    solar: makeMat("#0F172A", { roughness: 0.4, metalness: 0.1, emissive: "#0EA5E9", emissiveIntensity: 0.05 }),
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

  // Plot ground
  addBox(root, { x: 0, y: -0.05, z: 0, w: pW + 3, h: 0.08, d: pL + 3, mat: materials.ground, cast: false, receive: true, name: "Plot ground" });
  addBox(root, { x: 0, y: 0.005, z: pL / 2 + 0.72, w: pW + 3.2, h: 0.025, d: 1.1, mat: materials.road, cast: false, receive: true, name: "Road" });

  // Path and driveway
  addBox(root, { x: 0, y: 0.02, z: pL / 2 - 1.2, w: Math.max(1.0, bW * 0.2), h: 0.035, d: 2.6, mat: materials.path, cast: false, receive: true });
  if (model.hasGarage) {
    addBox(root, { x: -bW * 0.32 + xOffset, y: 0.025, z: pL / 2 - 1.4, w: Math.max(1.8, bW * 0.26), h: 0.03, d: 2.8, mat: materials.concrete, cast: false, receive: true });
  }

  // Plot and buildable outline helpers
  const plotHelper = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(pW, 0.02, pL)),
    new THREE.LineBasicMaterial({ color: "#22C55E", transparent: true, opacity: 0.72 })
  );
  plotHelper.position.y = 0.04;
  root.add(plotHelper);

  const buildHelper = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(bW, 0.03, bL)),
    new THREE.LineDashedMaterial({ color: "#FFFFFF", dashSize: 0.25, gapSize: 0.16, transparent: true, opacity: 0.65 })
  );
  buildHelper.position.set(xOffset, 0.08, zOffset);
  buildHelper.computeLineDistances();
  root.add(buildHelper);

  const house = new THREE.Group();
  house.position.set(xOffset, 0, zOffset);
  root.add(house);

  for (let floor = 0; floor < model.floors; floor += 1) {
    const yBase = floor * (floorH + floorGap);
    const yTop = yBase + floorH;
    const floorGroup = new THREE.Group();
    floorGroup.name = `Floor ${floor + 1}`;
    house.add(floorGroup);

    // Slab
    addBox(floorGroup, { x: 0, y: yBase + slabT / 2, z: 0, w: bW, h: slabT, d: bL, mat: materials.slab, name: "floor slab" });

    // Room floor color plates
    model.rooms.forEach((room, i) => {
      const roomW = safeNumber(room.width, 1) * s;
      const roomL = safeNumber(room.height, 1) * s;
      const roomX = (safeNumber(room.x, 0) - model.metrics.originX + safeNumber(room.width, 1) / 2 - model.metrics.buildableWidth / 2) * s;
      const roomZ = (safeNumber(room.y, 0) - model.metrics.originY + safeNumber(room.height, 1) / 2 - model.metrics.buildableLength / 2) * s;
      const color = ROOM_COLORS[room.type] || ROOM_COLORS.other;
      const mat = makeMat(color, { roughness: 0.78, transparent: true, opacity: options.roomColors ? 0.72 : 0.18 });

      addBox(floorGroup, { x: roomX, y: yBase + slabT + 0.012, z: roomZ, w: Math.max(0.05, roomW - wallT), h: 0.025, d: Math.max(0.05, roomL - wallT), mat, cast: false, receive: true });
      if (options.labels && floor === 0) {
        addLabel(floorGroup, room.name || room.label || room.type || `Room ${i + 1}`, new THREE.Vector3(roomX, yBase + 0.08, roomZ), "#0f172a");
      }
    });

    // Exterior walls. In cutaway mode front wall is low/transparent so house looks like inspiration dollhouse.
    const frontWallH = options.cutaway ? floorH * 0.33 : floorH;
    const frontMat = options.cutaway ? makeMat("#F5F3EE", { transparent: true, opacity: 0.45, roughness: 0.74 }) : materials.whiteWall;
    const rearMat = floor % 2 === 0 ? materials.whiteWall : materials.accentWall;

    addBox(floorGroup, { x: 0, y: yBase + frontWallH / 2, z: bL / 2 - wallT / 2, w: bW, h: frontWallH, d: wallT, mat: frontMat, name: "front wall" });
    addBox(floorGroup, { x: 0, y: yBase + floorH / 2, z: -bL / 2 + wallT / 2, w: bW, h: floorH, d: wallT, mat: rearMat, name: "rear wall" });
    addBox(floorGroup, { x: -bW / 2 + wallT / 2, y: yBase + floorH / 2, z: 0, w: wallT, h: floorH, d: bL, mat: materials.whiteWall, name: "left wall" });
    addBox(floorGroup, { x: bW / 2 - wallT / 2, y: yBase + floorH / 2, z: 0, w: wallT, h: floorH, d: bL, mat: materials.accentWall, name: "right wall" });

    // Internal walls from layout.walls if available, else derive from room outlines.
    if (options.internalWalls) {
      const walls = Array.isArray(layout?.walls) && layout.walls.length ? layout.walls : null;
      if (walls) {
        walls.forEach((wall) => {
          const x1 = safeNumber(wall.x1 ?? wall.start?.x, 0) - model.metrics.originX - model.metrics.buildableWidth / 2;
          const y1 = safeNumber(wall.y1 ?? wall.start?.y, 0) - model.metrics.originY - model.metrics.buildableLength / 2;
          const x2 = safeNumber(wall.x2 ?? wall.end?.x, x1) - model.metrics.originX - model.metrics.buildableWidth / 2;
          const y2 = safeNumber(wall.y2 ?? wall.end?.y, y1) - model.metrics.originY - model.metrics.buildableLength / 2;

          const minX = (Math.min(x1, x2) + Math.abs(x2 - x1) / 2) * s;
          const minZ = (Math.min(y1, y2) + Math.abs(y2 - y1) / 2) * s;
          const ww = Math.max(wallT * 0.8, Math.abs(x2 - x1) * s || wallT);
          const dd = Math.max(wallT * 0.8, Math.abs(y2 - y1) * s || wallT);

          addBox(floorGroup, { x: minX, y: yBase + floorH * 0.42, z: minZ, w: ww, h: floorH * 0.84, d: dd, mat: materials.internalWall, name: "internal wall" });
        });
      } else {
        model.rooms.forEach((room) => {
          const rw = safeNumber(room.width, 1) * s;
          const rl = safeNumber(room.height, 1) * s;
          const rx = (safeNumber(room.x, 0) - model.metrics.originX + safeNumber(room.width, 1) / 2 - model.metrics.buildableWidth / 2) * s;
          const rz = (safeNumber(room.y, 0) - model.metrics.originY + safeNumber(room.height, 1) / 2 - model.metrics.buildableLength / 2) * s;

          addBox(floorGroup, { x: rx, y: yBase + floorH * 0.36, z: rz - rl / 2, w: rw, h: floorH * 0.72, d: wallT * 0.65, mat: materials.internalWall, name: "room partition" });
          addBox(floorGroup, { x: rx - rw / 2, y: yBase + floorH * 0.36, z: rz, w: wallT * 0.65, h: floorH * 0.72, d: rl, mat: materials.internalWall, name: "room partition" });
        });
      }
    }

    // Balcony/terrace for modern look on upper floors
    if (floor > 0) {
      addBox(floorGroup, { x: bW * 0.22, y: yBase + slabT + 0.02, z: bL / 2 + 0.45, w: bW * 0.34, h: 0.1, d: 0.9, mat: materials.concrete });
      const railMat = makeMat("#DCE8EF", { transparent: true, opacity: 0.68, roughness: 0.25 });
      addBox(floorGroup, { x: bW * 0.22, y: yBase + 0.65, z: bL / 2 + 0.9, w: bW * 0.34, h: 0.65, d: 0.035, mat: railMat });
    }

    // Openings from layout data
    if (options.openings) {
      (layout.openings || []).forEach((opening) => {
        const kind = opening.kind || opening.type || "window";
        const direction = opening.direction || "north";
        const ox = (safeNumber(opening.x, 0) - model.metrics.originX - model.metrics.buildableWidth / 2) * s;
        const oz = (safeNumber(opening.y, 0) - model.metrics.originY - model.metrics.buildableLength / 2) * s;
        const ow = clamp(safeNumber(opening.width, kind === "door" ? 3 : 4) * s, 0.45, 1.6);

        if (kind === "door") {
          addDoor(floorGroup, ox, yBase + floorH * 0.34, oz, ow, floorH * 0.68, direction);
        } else {
          addWindow(floorGroup, ox, yBase + floorH * 0.58, oz, ow, floorH * 0.34, direction, opening.label || "window");
        }
      });
    }

    // Extra facade windows to make model pretty even if generator has few openings
    const facadeRooms = model.rooms.filter((r) => safeNumber(r.y, 0) <= model.metrics.originY + 2.0).slice(0, 5);
    facadeRooms.forEach((room) => {
      const rx = (safeNumber(room.x, 0) - model.metrics.originX + safeNumber(room.width, 1) / 2 - model.metrics.buildableWidth / 2) * s;
      const wz = bL / 2 + wallT * 0.56;
      const isDoorRoom = floor === 0 && ["living", "drawing", "entrance", "lounge"].includes(room.type);
      if (isDoorRoom) addDoor(floorGroup, rx, yBase + floorH * 0.34, wz, 0.7, floorH * 0.68, "south");
      else addWindow(floorGroup, rx, yBase + floorH * 0.58, wz, clamp(safeNumber(room.width, 4) * s * 0.38, 0.55, 1.45), floorH * 0.34, "south");
    });

    // Side windows
    addWindow(floorGroup, -bW / 2 - wallT * 0.54, yBase + floorH * 0.6, -bL * 0.18, clamp(bL * 0.16, 0.7, 1.5), floorH * 0.32, "west");
    addWindow(floorGroup, bW / 2 + wallT * 0.54, yBase + floorH * 0.58, bL * 0.12, clamp(bL * 0.14, 0.65, 1.4), floorH * 0.32, "east");
  }

  // Roof slab, parapet, roof features
  const topY = model.floors * (floorH + floorGap) - floorGap;
  addBox(house, { x: 0, y: topY + slabT / 2, z: 0, w: bW + 0.16, h: slabT, d: bL + 0.16, mat: materials.roof, name: "roof" });
  const parapetH = 0.42;

  addBox(house, { x: 0, y: topY + parapetH / 2, z: bL / 2 - wallT / 2, w: bW, h: parapetH, d: wallT, mat: materials.parapet });
  addBox(house, { x: 0, y: topY + parapetH / 2, z: -bL / 2 + wallT / 2, w: bW, h: parapetH, d: wallT, mat: materials.parapet });
  addBox(house, { x: -bW / 2 + wallT / 2, y: topY + parapetH / 2, z: 0, w: wallT, h: parapetH, d: bL, mat: materials.parapet });
  addBox(house, { x: bW / 2 - wallT / 2, y: topY + parapetH / 2, z: 0, w: wallT, h: parapetH, d: bL, mat: materials.parapet });

  addBox(house, { x: -bW * 0.24, y: topY + 0.22, z: -bL * 0.25, w: Math.min(1.7, bW * 0.22), h: 0.08, d: Math.min(1.0, bL * 0.16), mat: materials.solar });
  addBox(house, { x: bW * 0.3, y: topY + 0.35, z: -bL * 0.25, w: 0.75, h: 0.5, d: 0.75, mat: materials.water });

  // If single floor, add a small pitched roof volume like the inspiration image.
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

  // Landscape: trees, shrubs, small walls
  addTree(root, -pW / 2 + 1.0, -pL / 2 + 1.2, 0.9);
  addTree(root, pW / 2 - 1.1, -pL / 2 + 1.0, 1.05);
  addTree(root, pW / 2 - 1.2, pL / 2 - 2.0, 0.75);

  const shrubMat = makeMat("#4D7C0F", { roughness: 0.9 });
  for (let i = 0; i < 12; i += 1) {
    const x = -pW / 2 + 0.7 + i * (pW - 1.4) / 11;
    const z = pL / 2 - 0.45;
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), shrubMat);
    shrub.position.set(x, 0.13, z);
    shrub.scale.set(1.3, 0.6, 1);
    shrub.castShadow = true;
    root.add(shrub);
  }

  return root;
}

export default function ThreeDViewer({ project, layout }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef({});

  const [mode, setMode] = useState("orbit");
  const [cutaway, setCutaway] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [labels, setLabels] = useState(true);
  const [openings, setOpenings] = useState(true);
  const [internalWalls, setInternalWalls] = useState(true);
  const [roomColors, setRoomColors] = useState(true);
  const [quality, setQuality] = useState("high");

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

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 640;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#DDEAF3");
    scene.fog = new THREE.Fog("#DDEAF3", 18, 48);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.05, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: quality === "high", alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "high" ? 2 : 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.HemisphereLight("#E0F2FE", "#7C5A3A", 1.55));

    const sun = new THREE.DirectionalLight("#FFFFFF", 2.25);
    sun.position.set(-8, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = quality === "high" ? 2048 : 1024;
    sun.shadow.mapSize.height = quality === "high" ? 2048 : 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    scene.add(sun);

    const warm = new THREE.PointLight("#FDBA74", 1.0, 18);
    warm.position.set(3, 4, 5);
    scene.add(warm);

    const modelRoot = buildModel({
      scene,
      model,
      layout,
      project,
      options: { cutaway, exploded, labels, openings, internalWalls, roomColors },
    });

    // Pretty blueprint floor grid
    const grid = new THREE.GridHelper(34, 34, "#38BDF8", "#93C5FD");
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    scene.add(grid);

    const controls = {
      mode,
      target: new THREE.Vector3(0, 1.4, 0),
      radius: 16,
      theta: degToRad(42),
      phi: degToRad(58),
      yaw: degToRad(180),
      pitch: 0,
      walkPos: new THREE.Vector3(0, 1.55, Math.max(2.2, model.metrics.buildableLength * model.worldScale * 0.28)),
      dragging: false,
      lastX: 0,
      lastY: 0,
      keys: {},
      reset() {
        this.radius = 16;
        this.theta = degToRad(42);
        this.phi = degToRad(58);
        this.yaw = degToRad(180);
        this.pitch = 0;
        this.walkPos.set(0, 1.55, Math.max(2.2, model.metrics.buildableLength * model.worldScale * 0.28));
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

    setOrbitCamera();

    const onResize = () => {
      const w = mount.clientWidth || 900;
      const h = mount.clientHeight || 640;
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
        controls.yaw -= dx * 0.004;
        controls.pitch = clamp(controls.pitch - dy * 0.003, degToRad(-55), degToRad(55));
      } else {
        controls.theta -= dx * 0.006;
        controls.phi = clamp(controls.phi - dy * 0.004, degToRad(22), degToRad(82));
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
        controls.walkPos.addScaledVector(dir, e.deltaY > 0 ? -0.35 : 0.35);
      } else {
        controls.radius = clamp(controls.radius + e.deltaY * 0.012, 5, 34);
      }
    };

    const onKeyDown = (e) => {
      controls.keys[e.key.toLowerCase()] = true;
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
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
        const speed = (controls.keys.shift ? 4.4 : 2.4) * dt;
        const forward = new THREE.Vector3(Math.sin(controls.yaw), 0, Math.cos(controls.yaw));
        const right = new THREE.Vector3(Math.cos(controls.yaw), 0, -Math.sin(controls.yaw));

        if (controls.keys.w || controls.keys.arrowup) controls.walkPos.addScaledVector(forward, speed);
        if (controls.keys.s || controls.keys.arrowdown) controls.walkPos.addScaledVector(forward, -speed);
        if (controls.keys.d || controls.keys.arrowright) controls.walkPos.addScaledVector(right, speed);
        if (controls.keys.a || controls.keys.arrowleft) controls.walkPos.addScaledVector(right, -speed);
        if (controls.keys.q) controls.walkPos.y = clamp(controls.walkPos.y - speed, 0.8, 12);
        if (controls.keys.e) controls.walkPos.y = clamp(controls.walkPos.y + speed, 0.8, 12);

        const limitX = model.metrics.plotWidth * model.worldScale * 0.62;
        const limitZ = model.metrics.plotLength * model.worldScale * 0.62;
        controls.walkPos.x = clamp(controls.walkPos.x, -limitX, limitX);
        controls.walkPos.z = clamp(controls.walkPos.z, -limitZ, limitZ + 1.5);
        setWalkCamera();
      } else {
        setOrbitCamera();
      }

      modelRoot.rotation.y = Math.sin(now * 0.00018) * 0.015;
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
  }, [model, layout, project, mode, cutaway, exploded, labels, openings, internalWalls, roomColors, quality]);

  const resetCamera = () => controlsRef.current?.reset?.();

  const takeScreenshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const link = document.createElement("a");
    link.download = `${project?.name || "buildmate"}-3d-house.png`;
    link.href = renderer.domElement.toDataURL("image/png", 1);
    link.click();
  };

  return (
    <div className="bm3d-page-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: "1rem", alignItems: "stretch" }}>
      <style>{`
        .bm3d-render-card {
          min-height: 700px;
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
          position:absolute; left:22px; top:20px; z-index:5; color:#0f172a;
          display:flex; flex-direction:column; gap:.55rem; max-width:min(520px, calc(100% - 44px));
        }
        .bm3d-badge {
          width:max-content; display:inline-flex; align-items:center; gap:.48rem;
          padding:.5rem .82rem; border-radius:999px; background:rgba(255,255,255,.78);
          border:1px solid rgba(255,255,255,.72); backdrop-filter:blur(12px); box-shadow:0 10px 24px rgba(15,23,42,.10);
          font-size:.78rem; font-weight:900;
        }
        .bm3d-bottom-help {
          position:absolute; left:22px; bottom:20px; z-index:5; display:flex; gap:.5rem; flex-wrap:wrap;
        }
        .bm3d-help-chip {
          padding:.42rem .62rem; border-radius:999px; background:rgba(15,23,42,.72); color:white;
          border:1px solid rgba(255,255,255,.15); font-size:.7rem; font-weight:800; backdrop-filter:blur(10px);
        }
        .bm3d-panel {
          border-radius: 30px; background:rgba(255,255,255,.88); border:1px solid rgba(255,255,255,.58);
          box-shadow:0 24px 80px rgba(15,23,42,.12), inset 0 1px 0 rgba(255,255,255,.9);
          backdrop-filter:blur(22px) saturate(180%); padding:1.15rem;
          height:fit-content;
        }
        .bm3d-stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:.55rem; margin:1rem 0; }
        .bm3d-stat { padding:.72rem; border-radius:17px; background:rgba(124,58,237,.07); border:1px solid rgba(124,58,237,.12); }
        .bm3d-stat p:first-child { font-size:.62rem; text-transform:uppercase; letter-spacing:.08em; color:#7C3AED; font-weight:950; margin-bottom:.18rem; }
        .bm3d-stat p:last-child { font-size:.9rem; color:#111827; font-weight:950; margin:0; }
        .bm3d-btn {
          border:none; border-radius:999px; padding:.62rem .9rem; font-family:inherit; cursor:pointer; font-size:.78rem; font-weight:900;
          transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .bm3d-btn:hover { transform:translateY(-1px); }
        .bm3d-primary { color:white; background:linear-gradient(135deg,#7C3AED,#06B6D4); box-shadow:0 10px 22px rgba(124,58,237,.25); }
        .bm3d-secondary { color:#334155; background:rgba(241,245,249,.9); border:1px solid rgba(148,163,184,.25); }
        .bm3d-toggle { width:100%; display:flex; justify-content:space-between; align-items:center; gap:.75rem; padding:.6rem .68rem; border-radius:15px; border:1px solid rgba(148,163,184,.24); background:rgba(255,255,255,.66); font-family:inherit; cursor:pointer; color:#334155; font-size:.78rem; font-weight:850; }
        .bm3d-toggle[data-active="true"] { background:rgba(124,58,237,.09); border-color:rgba(124,58,237,.18); }
        @media (max-width:1080px) {
          .bm3d-page-grid { grid-template-columns:1fr!important; }
          .bm3d-render-card { min-height:590px; }
        }
      `}</style>

      <section className="bm3d-render-card" data-tour="scene">
        <div ref={mountRef} className="bm3d-render-mount" />
        <div className="bm3d-top-hud">
          <div className="bm3d-badge">
            <span style={{ width: 9, height: 9, borderRadius: 999, background: "#22C55E", boxShadow: "0 0 14px #22C55E" }} />
            Real WebGL 3D model from selected layout
          </div>
          <div style={{ padding: "0.85rem 1rem", borderRadius: 22, background: "rgba(255,255,255,.72)", border: "1px solid rgba(255,255,255,.68)", backdropFilter: "blur(12px)", boxShadow: "0 14px 34px rgba(15,23,42,.10)" }}>
            <h2 style={{ margin: 0, fontFamily: "'Syne',sans-serif", fontSize: "1.15rem", fontWeight: 950, letterSpacing: "-0.04em", color: "#0f172a" }}>Architectural 3D House + Walkthrough</h2>
            <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.78rem", fontWeight: 700 }}>Drag to look around. Switch to Walkthrough for inside movement.</p>
          </div>
        </div>
        <div className="bm3d-bottom-help" data-tour="helper-chips">
          {mode === "walk" ? (
            <>
              <span className="bm3d-help-chip">W/A/S/D or arrows: move</span>
              <span className="bm3d-help-chip">Drag mouse: look</span>
              <span className="bm3d-help-chip">Shift: faster</span>
              <span className="bm3d-help-chip">Q/E: down/up</span>
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

      <aside className="bm3d-panel">
        <div style={{ display: "flex", alignItems: "center", gap: ".65rem", marginBottom: ".9rem" }}>
          <div style={{ width: 38, height: 38, borderRadius: 14, display: "grid", placeItems: "center", color: "white", background: "linear-gradient(135deg,#7C3AED,#06B6D4)", boxShadow: "0 10px 22px rgba(124,58,237,.28)" }}>🏠</div>
          <div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "1.02rem", color: "#111827", fontWeight: 950, margin: 0 }}>3D Model Controls</h3>
            <p style={{ fontSize: ".72rem", color: "#64748B", fontWeight: 700, margin: 0 }}>Three.js walkthrough viewer</p>
          </div>
        </div>

        <button
          type="button"
          className="bm3d-btn bm3d-primary"
          style={{ width: "100%", marginBottom: ".65rem" }}
          onClick={() => window.dispatchEvent(new Event("buildmate:open-3d-guide"))}
        >
          ✨ Start 3D Guide
        </button>

        <div
          data-tour="mode-controls"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: ".55rem",
            position: "relative",
          }}
        >
          <button className={`bm3d-btn ${mode === "orbit" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => setMode("orbit")}>🛰️ Orbit</button>
          <button className={`bm3d-btn ${mode === "walk" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => setMode("walk")}>🚶 Walkthrough</button>
        </div>

        <div
          data-tour="reset-controls"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: ".55rem",
            marginTop: ".6rem",
            position: "relative",
          }}
        >
          <button className="bm3d-btn bm3d-secondary" onClick={resetCamera}>↺ Reset</button>
          <button className="bm3d-btn bm3d-secondary" onClick={takeScreenshot}>📸 PNG</button>
        </div>

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

        <div
          data-tour="visual-toggles"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: ".55rem",
            position: "relative",
          }}
        >
          <Toggle checked={cutaway} onChange={setCutaway} label="Dollhouse cutaway view" />
          <Toggle checked={exploded} onChange={setExploded} label="Exploded floors" />
          <Toggle checked={labels} onChange={setLabels} label="Room labels" />
          <Toggle checked={openings} onChange={setOpenings} label="Doors/windows from layout" />
          <Toggle checked={internalWalls} onChange={setInternalWalls} label="Internal walls" />
          <Toggle checked={roomColors} onChange={setRoomColors} label="Room color zoning" />
        </div>

        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(15,23,42,.08)" }}>
          <p style={{ fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".08em", color: "#94A3B8", fontWeight: 950, marginBottom: ".55rem" }}>Render Quality</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".55rem" }}>
            <button className={`bm3d-btn ${quality === "fast" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => setQuality("fast")}>Fast</button>
            <button className={`bm3d-btn ${quality === "high" ? "bm3d-primary" : "bm3d-secondary"}`} onClick={() => setQuality("high")}>High</button>
          </div>
        </div>

        <div style={{ marginTop: "1rem", padding: ".85rem", borderRadius: 18, background: "rgba(14,165,233,.07)", border: "1px solid rgba(14,165,233,.14)", color: "#475569", fontSize: ".75rem", lineHeight: 1.65, fontWeight: 700 }}>
          This viewer creates a real WebGL 3D house from the selected generated layout. For a more realistic final render, keep <strong>Dollhouse cutaway</strong> off; for walkthrough/interior checking, keep it on.
        </div>
      </aside>

      <ThreeDWalkthrough />
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" className="bm3d-toggle" data-active={checked} onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span style={{ width: 36, height: 21, borderRadius: 999, padding: 2, background: checked ? "linear-gradient(135deg,#7C3AED,#06B6D4)" : "#CBD5E1", transition: "all .2s", flex: "0 0 auto" }}>
        <i style={{ display: "block", width: 17, height: 17, borderRadius: 999, background: "white", transform: `translateX(${checked ? 15 : 0}px)`, transition: "transform .2s", boxShadow: "0 2px 5px rgba(15,23,42,.2)" }} />
      </span>
    </button>
  );
}