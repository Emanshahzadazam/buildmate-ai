import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";

const ROOM_COLORS = {
  bedroom:  { fill: "#FFF7ED", stroke: "#FB923C" },
  bathroom: { fill: "#EFF6FF", stroke: "#60A5FA" },
  kitchen:  { fill: "#FEF3C7", stroke: "#F59E0B" },
  living:   { fill: "#ECFDF5", stroke: "#34D399" },
  dining:   { fill: "#FCE7F3", stroke: "#F472B6" },
  study:    { fill: "#F3E8FF", stroke: "#A78BFA" },
  garage:   { fill: "#F1F5F9", stroke: "#94A3B8" },
  store:    { fill: "#F1F5F9", stroke: "#94A3B8" },
  other:    { fill: "#F8FAFC", stroke: "#CBD5E1" },
};

const getColors = (type) => ROOM_COLORS[type] || ROOM_COLORS.other;

export default function FloorPlanCanvas({ layout }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 600, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setSize({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!layout || !layout.plot || !layout.plot.width) {
    return <div ref={containerRef} className="w-full h-full" />;
  }

  const { plot, rooms = [], walls = [], openings = [] } = layout;

  const padding = 30;
  const usableW = Math.max(100, size.width - padding * 2);
  const usableH = Math.max(100, size.height - padding * 2);
  const scale = Math.min(usableW / plot.width, usableH / plot.length);

  const plotPxW = plot.width * scale;
  const plotPxH = plot.length * scale;
  const offsetX = (size.width - plotPxW) / 2;
  const offsetY = (size.height - plotPxH) / 2;

  const m2px = (m) => m * scale;
  const wallStroke = Math.max(2, 0.15 * scale);

  const openingLines = openings
    .map((o) => {
      const wall = walls.find((w) => w.id === o.wallId);
      if (!wall) return null;
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return null;
      const ux = dx / len;
      const uy = dy / len;
      const startX = wall.x1 + ux * o.offset;
      const startY = wall.y1 + uy * o.offset;
      const endX = startX + ux * o.width;
      const endY = startY + uy * o.width;
      return {
        id: o.id,
        kind: o.kind,
        points: [
          offsetX + m2px(startX),
          offsetY + m2px(startY),
          offsetX + m2px(endX),
          offsetY + m2px(endY),
        ],
      };
    })
    .filter(Boolean);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50">
      <Stage width={size.width} height={size.height}>
        {/* Grid */}
        <Layer listening={false}>
          {Array.from({ length: Math.floor(plot.width) + 1 }).map((_, i) => (
            <Line
              key={`vg-${i}`}
              points={[
                offsetX + m2px(i),
                offsetY,
                offsetX + m2px(i),
                offsetY + plotPxH,
              ]}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.floor(plot.length) + 1 }).map((_, i) => (
            <Line
              key={`hg-${i}`}
              points={[
                offsetX,
                offsetY + m2px(i),
                offsetX + plotPxW,
                offsetY + m2px(i),
              ]}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          ))}
        </Layer>

        {/* Plot boundary */}
        <Layer listening={false}>
          <Rect
            x={offsetX}
            y={offsetY}
            width={plotPxW}
            height={plotPxH}
            stroke="#94A3B8"
            strokeWidth={1}
            dash={[6, 4]}
          />
        </Layer>

        {/* Rooms */}
        <Layer>
          {rooms.map((r) => {
            const colors = getColors(r.type);
            const rx = offsetX + m2px(r.x);
            const ry = offsetY + m2px(r.y);
            const rw = m2px(r.width);
            const rh = m2px(r.height);
            return (
              <Group key={r.id} x={rx} y={ry}>
                <Rect
                  width={rw}
                  height={rh}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                  cornerRadius={2}
                />
                <Text
                  text={r.label}
                  width={rw}
                  padding={6}
                  fontSize={Math.min(14, rw / 8)}
                  fontStyle="600"
                  fill="#0F172A"
                />
                <Text
                  text={`${r.width.toFixed(1)} × ${r.height.toFixed(1)} m`}
                  width={rw}
                  y={rh - 18}
                  padding={6}
                  fontSize={10}
                  fill="#64748B"
                />
              </Group>
            );
          })}
        </Layer>

        {/* Walls */}
        <Layer listening={false}>
          {walls.map((w) => (
            <Line
              key={w.id}
              points={[
                offsetX + m2px(w.x1),
                offsetY + m2px(w.y1),
                offsetX + m2px(w.x2),
                offsetY + m2px(w.y2),
              ]}
              stroke="#1E293B"
              strokeWidth={wallStroke}
              lineCap="square"
            />
          ))}
          {openingLines.map((o) => (
            <Line
              key={o.id}
              points={o.points}
              stroke={o.kind === "door" ? "#F8FAFC" : "#DBEAFE"}
              strokeWidth={wallStroke + 1}
              lineCap="square"
            />
          ))}
        </Layer>

        {/* Scale indicator */}
        <Layer listening={false}>
          <Line
            points={[
              padding,
              size.height - padding,
              padding + m2px(1),
              size.height - padding,
            ]}
            stroke="#0F172A"
            strokeWidth={2}
          />
          <Text
            x={padding}
            y={size.height - padding - 18}
            text="1 m"
            fontSize={11}
            fill="#0F172A"
          />
        </Layer>
      </Stage>
    </div>
  );
}