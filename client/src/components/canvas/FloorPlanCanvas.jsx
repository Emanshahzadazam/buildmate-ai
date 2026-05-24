import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Arc, Shape } from "react-konva";

// ─── Room type config ─────────────────────────────────────────
const ROOM_CONFIG = {
  bedroom:   { fill: "#E8D5F5", border: "#7B2D8B", label: "#7B2D8B" },
  bathroom:  { fill: "#D5EEF5", border: "#1A6B8A", label: "#1A6B8A" },
  kitchen:   { fill: "#D5F5E3", border: "#1A7A40", label: "#1A7A40" },
  living:    { fill: "#FFF3D5", border: "#8A6B1A", label: "#8A6B1A" },
  dining:    { fill: "#FFE5D5", border: "#8A3B1A", label: "#8A3B1A" },
  drawing:   { fill: "#D5E8F5", border: "#1A4B8A", label: "#1A4B8A" },
  study:     { fill: "#F5D5E8", border: "#8A1A6B", label: "#8A1A6B" },
  garage:    { fill: "#E8E8D5", border: "#6B6B1A", label: "#6B6B1A" },
  store:     { fill: "#F0E8D5", border: "#7A5A1A", label: "#7A5A1A" },
  staircase: { fill: "#FFFBD5", border: "#8A8A00", label: "#8A8A00" },
  other:     { fill: "#F0F0F0", border: "#666666", label: "#444444" },
};
const getRoomConfig = (type) => ROOM_CONFIG[type] || ROOM_CONFIG.other;

// ─── Unit helpers ─────────────────────────────────────────────
const mToFt = (m) => m * 3.28084;
const formatFt = (m) => {
  const total = mToFt(m);
  const ft = Math.floor(total);
  const inch = Math.round((total - ft) * 12);
  if (inch === 0) return `${ft}'-0"`;
  if (inch === 12) return `${ft + 1}'-0"`;
  return `${ft}'-${inch}"`;
};

export default function FloorPlanCanvas({ layout, projectName }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 600, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 10 && h > 10) setSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!layout?.generated) {
    return <div ref={containerRef} className="w-full h-full" />;
  }

  const { rooms = [], walls = [], openings = [] } = layout;

  // ── Plot bounds ───────────────────────────────────────────────
  let plotW, plotL, offX, offY;
  if (layout.plot?.corners?.length === 4) {
    const xs = layout.plot.corners.map((c) => c[0]);
    const ys = layout.plot.corners.map((c) => c[1]);
    plotW = Math.max(...xs) - Math.min(...xs);
    plotL = Math.max(...ys) - Math.min(...ys);
    offX = Math.min(...xs);
    offY = Math.min(...ys);
  } else if (layout.buildable?.width) {
    plotW = layout.buildable.width;
    plotL = layout.buildable.length;
    offX = layout.buildable.offsetX || 0;
    offY = layout.buildable.offsetY || 0;
  } else {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <p className="text-slate-400 text-sm">No layout data</p>
      </div>
    );
  }

  // ── Scale + canvas offset ─────────────────────────────────────
  const TITLE_H = 44;
  const DIM_MARGIN = 36; // space for dimension text outside walls
  const pad = DIM_MARGIN + 20;

  const scale = Math.min(
    (size.width - pad * 2) / plotW,
    (size.height - pad * 2 - TITLE_H) / plotL
  );

  const plotPxW = plotW * scale;
  const plotPxH = plotL * scale;
  const originX = (size.width - plotPxW) / 2;
  const originY = (size.height - plotPxH - TITLE_H) / 2;

  const px = (mx) => originX + (mx - offX) * scale;
  const py = (my) => originY + (my - offY) * scale;

  // Wall thickness in pixels
  const extWallPx = Math.max(6, 0.23 * scale);
  const intWallPx = Math.max(3, 0.115 * scale);

  // ── Pre-process openings ──────────────────────────────────────
  const openingData = openings.map((o) => {
    const wall = walls.find((w) => w.id === o.wallId);
    if (!wall) return null;
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;
    const ux = dx / len, uy = dy / len;
    const perp_x = -uy, perp_y = ux;
    const startMX = wall.x1 + ux * o.offset;
    const startMY = wall.y1 + uy * o.offset;
    const endMX = startMX + ux * o.width;
    const endMY = startMY + uy * o.width;
    return {
      id: o.id,
      kind: o.kind,
      wallKind: wall.kind,
      startMX, startMY, endMX, endMY,
      ux, uy, perp_x, perp_y,
      widthM: o.width,
      pxStart: { x: px(startMX), y: py(startMY) },
      pxEnd: { x: px(endMX), y: py(endMY) },
      pxWidth: o.width * scale,
      wallAngleDeg: Math.atan2(dy, dx) * (180 / Math.PI),
    };
  }).filter(Boolean);

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <Stage width={size.width} height={size.height}>

        {/* ── 1. Background + subtle grid ──────────────────────── */}
        <Layer listening={false}>
          <Rect x={0} y={0} width={size.width} height={size.height} fill="#FAFAFA" />
          {/* 1m grid lines */}
          {Array.from({ length: Math.ceil(plotW) + 1 }, (_, i) => (
            <Line key={`vg${i}`}
              points={[px(offX + i), py(offY), px(offX + i), py(offY + plotL)]}
              stroke="#E8EDF2" strokeWidth={0.6} />
          ))}
          {Array.from({ length: Math.ceil(plotL) + 1 }, (_, i) => (
            <Line key={`hg${i}`}
              points={[px(offX), py(offY + i), px(offX + plotW), py(offY + i)]}
              stroke="#E8EDF2" strokeWidth={0.6} />
          ))}
        </Layer>

        {/* ── 2. Room fills ─────────────────────────────────────── */}
        <Layer>
          {rooms.map((r) => {
            const cfg = getRoomConfig(r.type);
            const rx = px(r.x), ry = py(r.y);
            const rw = r.width * scale, rh = r.height * scale;
            const area = (r.width * r.height).toFixed(1);
            const dimText = `${formatFt(r.width)} X ${formatFt(r.height)}`;
            const fs = Math.max(8, Math.min(13, rw / 10));

            return (
              <Group key={r.id}>
                {/* Room fill */}
                <Rect
                  x={rx} y={ry} width={rw} height={rh}
                  fill={cfg.fill}
                />
                {/* Room label — centered */}
                {rw > 45 && rh > 40 && (
                  <>
                    <Text
                      x={rx} y={ry + rh / 2 - fs * 1.4}
                      width={rw}
                      text={r.label.toUpperCase()}
                      fontSize={fs}
                      fontStyle="bold"
                      fill={cfg.label}
                      align="center"
                    />
                    <Text
                      x={rx} y={ry + rh / 2}
                      width={rw}
                      text={dimText}
                      fontSize={Math.max(7, fs - 2)}
                      fill={cfg.label}
                      align="center"
                    />
                    {rh > 55 && (
                      <Text
                        x={rx} y={ry + rh / 2 + fs + 2}
                        width={rw}
                        text={`${area} m²`}
                        fontSize={Math.max(7, fs - 3)}
                        fill="#94A3B8"
                        align="center"
                      />
                    )}
                  </>
                )}
              </Group>
            );
          })}
        </Layer>

        {/* ── 3. Wall fills (thickness as rectangles) ──────────── */}
        <Layer listening={false}>
          {walls.map((w) => {
            const dx = w.x2 - w.x1;
            const dy = w.y2 - w.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return null;
            const ux = dx / len, uy = dy / len;
            const perp_x = -uy, perp_y = ux;
            const thickness = w.kind === "exterior" ? extWallPx : intWallPx;
            const half = thickness / 2;

            // Four corners of the wall rectangle
            const p1x = px(w.x1) - perp_x * half;
            const p1y = py(w.y1) - perp_y * half;
            const p2x = px(w.x2) - perp_x * half;
            const p2y = py(w.y2) - perp_y * half;
            const p3x = px(w.x2) + perp_x * half;
            const p3y = py(w.y2) + perp_y * half;
            const p4x = px(w.x1) + perp_x * half;
            const p4y = py(w.y1) + perp_y * half;

            const wallColor = w.kind === "exterior" ? "#2D3E50" : "#4A5568";

            return (
              <Shape
                key={w.id}
                sceneFunc={(ctx, shape) => {
                  ctx.beginPath();
                  ctx.moveTo(p1x, p1y);
                  ctx.lineTo(p2x, p2y);
                  ctx.lineTo(p3x, p3y);
                  ctx.lineTo(p4x, p4y);
                  ctx.closePath();
                  ctx.fillStrokeShape(shape);
                }}
                fill={wallColor}
                stroke={wallColor}
                strokeWidth={0.5}
              />
            );
          })}
        </Layer>

        {/* ── 4. Opening gaps (cut through walls) ─────────────── */}
        <Layer listening={false}>
          {openingData.map((o) => {
            const thickness = o.wallKind === "exterior" ? extWallPx : intWallPx;
            const half = thickness / 2 + 1;
            const p1x = o.pxStart.x - o.perp_x * half;
            const p1y = o.pxStart.y - o.perp_y * half;
            const p2x = o.pxEnd.x - o.perp_x * half;
            const p2y = o.pxEnd.y - o.perp_y * half;
            const p3x = o.pxEnd.x + o.perp_x * half;
            const p3y = o.pxEnd.y + o.perp_y * half;
            const p4x = o.pxStart.x + o.perp_x * half;
            const p4y = o.pxStart.y + o.perp_y * half;

            return (
              <Shape
                key={`gap-${o.id}`}
                sceneFunc={(ctx, shape) => {
                  ctx.beginPath();
                  ctx.moveTo(p1x, p1y);
                  ctx.lineTo(p2x, p2y);
                  ctx.lineTo(p3x, p3y);
                  ctx.lineTo(p4x, p4y);
                  ctx.closePath();
                  ctx.fillStrokeShape(shape);
                }}
                fill="#FAFAFA"
                stroke="#FAFAFA"
                strokeWidth={1}
              />
            );
          })}
        </Layer>

        {/* ── 5. Door swings + Window symbols ─────────────────── */}
        <Layer listening={false}>
          {openingData.map((o) => {
            if (o.kind === "door") {
              // Door swing arc from start point
              return (
                <Group key={`door-${o.id}`}>
                  {/* Door leaf line */}
                  <Line
                    points={[
                      o.pxStart.x, o.pxStart.y,
                      o.pxEnd.x, o.pxEnd.y,
                    ]}
                    stroke="#DD6B20"
                    strokeWidth={1.5}
                  />
                  {/* Swing arc */}
                  <Arc
                    x={o.pxStart.x}
                    y={o.pxStart.y}
                    innerRadius={0}
                    outerRadius={o.pxWidth}
                    angle={90}
                    rotation={o.wallAngleDeg}
                    stroke="#DD6B20"
                    strokeWidth={1}
                    fill="rgba(221,107,32,0.10)"
                    dash={[4, 3]}
                  />
                </Group>
              );
            } else {
              // Window — cyan lines inside gap
              const midX = (o.pxStart.x + o.pxEnd.x) / 2;
              const midY = (o.pxStart.y + o.pxEnd.y) / 2;
              const thickness = o.wallKind === "exterior" ? extWallPx : intWallPx;
              const offset = thickness * 0.25;

              return (
                <Group key={`win-${o.id}`}>
                  {/* Two parallel glass lines */}
                  <Line
                    points={[
                      o.pxStart.x + o.perp_x * offset,
                      o.pxStart.y + o.perp_y * offset,
                      o.pxEnd.x + o.perp_x * offset,
                      o.pxEnd.y + o.perp_y * offset,
                    ]}
                    stroke="#28C8F8"
                    strokeWidth={1.5}
                  />
                  <Line
                    points={[
                      o.pxStart.x - o.perp_x * offset,
                      o.pxStart.y - o.perp_y * offset,
                      o.pxEnd.x - o.perp_x * offset,
                      o.pxEnd.y - o.perp_y * offset,
                    ]}
                    stroke="#28C8F8"
                    strokeWidth={1.5}
                  />
                  {/* Center frame line */}
                  <Line
                    points={[o.pxStart.x, o.pxStart.y, o.pxEnd.x, o.pxEnd.y]}
                    stroke="#28C8F8"
                    strokeWidth={0.5}
                  />
                  {/* Window squares (red) at both ends */}
                  <Rect
                    x={o.pxStart.x - 4}
                    y={o.pxStart.y - 4}
                    width={8}
                    height={8}
                    fill="#FF4444"
                    stroke="#CC0000"
                    strokeWidth={1}
                  />
                  <Rect
                    x={o.pxEnd.x - 4}
                    y={o.pxEnd.y - 4}
                    width={8}
                    height={8}
                    fill="#FF4444"
                    stroke="#CC0000"
                    strokeWidth={1}
                  />
                </Group>
              );
            }
          })}
        </Layer>

        {/* ── 6. Outer dimension lines ─────────────────────────── */}
        <Layer listening={false}>
          {/* Top dimension — plot width */}
          {(() => {
            const y = originY - 22;
            const x1 = originX;
            const x2 = originX + plotPxW;
            return (
              <Group key="dim-top">
                <Line points={[x1, y, x2, y]} stroke="#CC2020" strokeWidth={1} />
                <Line points={[x1, y - 5, x1, y + 5]} stroke="#CC2020" strokeWidth={1} />
                <Line points={[x2, y - 5, x2, y + 5]} stroke="#CC2020" strokeWidth={1} />
                <Text
                  x={x1} y={y - 16} width={x2 - x1}
                  text={`${formatFt(plotW)}`}
                  fontSize={11} fontStyle="bold"
                  fill="#CC2020" align="center"
                />
              </Group>
            );
          })()}

          {/* Left dimension — plot length */}
          {(() => {
            const x = originX - 22;
            const y1 = originY;
            const y2 = originY + plotPxH;
            const midY = (y1 + y2) / 2;
            return (
              <Group key="dim-left">
                <Line points={[x, y1, x, y2]} stroke="#CC2020" strokeWidth={1} />
                <Line points={[x - 5, y1, x + 5, y1]} stroke="#CC2020" strokeWidth={1} />
                <Line points={[x - 5, y2, x + 5, y2]} stroke="#CC2020" strokeWidth={1} />
                <Text
                  x={x - 30} y={midY - 20}
                  text={formatFt(plotL)}
                  fontSize={11} fontStyle="bold"
                  fill="#CC2020" align="center"
                  rotation={-90}
                />
              </Group>
            );
          })()}
        </Layer>

        {/* ── 7. Scale bar + North arrow ───────────────────────── */}
        <Layer listening={false}>
          {/* Scale bar */}
          <Line
            points={[
              originX, originY + plotPxH + 18,
              originX + scale, originY + plotPxH + 18,
            ]}
            stroke="#1E293B" strokeWidth={2}
          />
          <Line
            points={[originX, originY + plotPxH + 13, originX, originY + plotPxH + 23]}
            stroke="#1E293B" strokeWidth={1.5}
          />
          <Line
            points={[
              originX + scale, originY + plotPxH + 13,
              originX + scale, originY + plotPxH + 23,
            ]}
            stroke="#1E293B" strokeWidth={1.5}
          />
          <Text
            x={originX} y={originY + plotPxH + 25}
            text="1 m" fontSize={10} fill="#475569"
          />

          {/* North arrow */}
          <Line
            points={[
              originX + plotPxW - 20, originY + 30,
              originX + plotPxW - 20, originY + 10,
            ]}
            stroke="#1E293B" strokeWidth={2.5}
          />
          {/* Arrow head */}
          <Shape
            sceneFunc={(ctx, shape) => {
              const ax = originX + plotPxW - 20;
              const ay = originY + 10;
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(ax - 6, ay + 10);
              ctx.lineTo(ax + 6, ay + 10);
              ctx.closePath();
              ctx.fillStrokeShape(shape);
            }}
            fill="#1E293B"
            stroke="#1E293B"
            strokeWidth={1}
          />
          <Text
            x={originX + plotPxW - 27}
            y={originY + 33}
            text="N"
            fontSize={12} fontStyle="bold" fill="#1E293B"
          />
        </Layer>

        {/* ── 8. Title block ────────────────────────────────────── */}
        <Layer listening={false}>
          <Rect
            x={originX} y={size.height - TITLE_H - 2}
            width={plotPxW} height={TITLE_H}
            fill="#F1F5F9" stroke="#94A3B8" strokeWidth={1}
          />
          {/* Vertical divider */}
          <Line
            points={[
              originX + plotPxW * 0.55, size.height - TITLE_H - 2,
              originX + plotPxW * 0.55, size.height - 2,
            ]}
            stroke="#94A3B8" strokeWidth={0.5}
          />
          {/* Horizontal divider */}
          <Line
            points={[
              originX, size.height - TITLE_H / 2 - 2,
              originX + plotPxW, size.height - TITLE_H / 2 - 2,
            ]}
            stroke="#94A3B8" strokeWidth={0.5}
          />
          {/* Title text */}
          <Text
            x={originX + 8} y={size.height - TITLE_H + 4}
            text="FLOOR PLAN — GROUND FLOOR"
            fontSize={11} fontStyle="bold" fill="#0F172A"
          />
          <Text
            x={originX + 8} y={size.height - TITLE_H / 2 + 4}
            text={`Generated by BuildMate AI  ·  ${layout.generatedBy || "smart-zone-v1"}`}
            fontSize={9} fill="#64748B"
          />
          {/* Right side — project name + scale */}
          <Text
            x={originX + plotPxW * 0.55 + 8}
            y={size.height - TITLE_H + 4}
            text={projectName || "BuildMate AI Project"}
            fontSize={11} fontStyle="bold" fill="#0F172A"
          />
          <Text
            x={originX + plotPxW * 0.55 + 8}
            y={size.height - TITLE_H / 2 + 4}
            text={`Scale 1:${Math.round(100 / scale * 100)}`}
            fontSize={9} fill="#64748B"
          />
        </Layer>

      </Stage>
    </div>
  );
}