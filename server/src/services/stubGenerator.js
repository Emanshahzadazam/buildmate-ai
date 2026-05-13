// A simple grid-based layout generator. Given a plot and a list of rooms,
// it places rooms in a row-by-row grid that fits inside the plot.
// This is intentionally naive — it just exists to validate the data shape
// and rendering pipeline. The real generator (Python ml-service) replaces
// this later.

const ROOM_LABELS = {
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  living: "Living",
  dining: "Dining",
  study: "Study",
  garage: "Garage",
  store: "Store",
  other: "Room",
};

// Approximate target sizes per room type, in m². Used to suggest dimensions.
const TARGET_AREA = {
  bedroom: 12,
  bathroom: 4,
  kitchen: 8,
  living: 16,
  dining: 10,
  study: 8,
  garage: 14,
  store: 4,
  other: 8,
};

export const generateStubLayout = (brief) => {
  const plotWidth = brief.plotWidth;
  const plotLength = brief.plotLength;

  // Flatten brief.rooms ([{type, count}]) into individual room instances
  const flatRooms = [];
  brief.rooms.forEach((r) => {
    for (let i = 0; i < r.count; i++) {
      flatRooms.push({ type: r.type, indexLabel: r.count > 1 ? i + 1 : null });
    }
  });

  // Lay out in a grid: pick a column count that roughly squares the layout
  const cols = Math.max(1, Math.round(Math.sqrt(flatRooms.length)));
  const rows = Math.ceil(flatRooms.length / cols);

  const cellWidth = plotWidth / cols;
  const cellLength = plotLength / rows;

  const margin = 0.1; // leave 10cm gap so rooms don't overlap walls

  const rooms = flatRooms.map((r, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const baseLabel = ROOM_LABELS[r.type] || "Room";
    return {
      id: `r${idx + 1}`,
      type: r.type,
      label: r.indexLabel ? `${baseLabel} ${r.indexLabel}` : baseLabel,
      x: col * cellWidth + margin,
      y: row * cellLength + margin,
      width: cellWidth - 2 * margin,
      height: cellLength - 2 * margin,
    };
  });

  // Exterior walls: one rectangle around the plot
  const walls = [
    { id: "w-n", x1: 0, y1: 0, x2: plotWidth, y2: 0, thickness: 0.23, kind: "exterior" },
    { id: "w-e", x1: plotWidth, y1: 0, x2: plotWidth, y2: plotLength, thickness: 0.23, kind: "exterior" },
    { id: "w-s", x1: plotWidth, y1: plotLength, x2: 0, y2: plotLength, thickness: 0.23, kind: "exterior" },
    { id: "w-w", x1: 0, y1: plotLength, x2: 0, y2: 0, thickness: 0.23, kind: "exterior" },
  ];

  // One door on the south wall as a placeholder
  const openings = [
    {
      id: "o1",
      wallId: "w-s",
      kind: "door",
      offset: plotWidth / 2 - 0.45,
      width: 0.9,
    },
  ];

  return {
    plot: { width: plotWidth, length: plotLength },
    rooms,
    walls,
    openings,
    meta: {
      generator: "stub-grid-v1",
      cols,
      rows,
    },
  };
};