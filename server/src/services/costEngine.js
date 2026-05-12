import { RATES } from "./materialsRates.js";

const CEILING_HEIGHT = 3.0; // meters — standard residential
const WET_ROOMS = new Set(["bathroom", "kitchen"]);

const wallLengthMeters = (wall) => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.sqrt(dx * dx + dy * dy);
};

const lineItem = (key, qty) => {
  const rate = RATES[key];
  if (!rate) throw new Error(`Unknown rate key: ${key}`);
  return {
    key,
    label: rate.label,
    unit: rate.unit,
    quantity: Number(qty.toFixed(2)),
    rate: rate.rate,
    subtotal: Math.round(qty * rate.rate),
    category: rate.category,
  };
};

export const estimateCost = (layout) => {
  if (!layout?.generated) {
    return { items: [], total: 0, byCategory: {}, generatedAt: null };
  }

  const items = [];

  // 1. Concrete floor (whole plot footprint)
  const plotArea = layout.plot.width * layout.plot.length;
  items.push(lineItem("concreteFloor", plotArea));

  // 2. RCC roof slab
  items.push(lineItem("rccRoof", plotArea));

  // 3. Walls — exterior vs interior, length × ceiling height
  let exteriorLen = 0;
  let interiorLen = 0;
  layout.walls.forEach((w) => {
    const len = wallLengthMeters(w);
    if (w.kind === "exterior") exteriorLen += len;
    else interiorLen += len;
  });

  if (exteriorLen > 0) {
    items.push(lineItem("brickWall", exteriorLen * CEILING_HEIGHT));
  }
  if (interiorLen > 0) {
    items.push(lineItem("brickWallInterior", interiorLen * CEILING_HEIGHT));
  }

  // 4. Plaster — both sides of all walls
  const totalWallSurface = (exteriorLen + interiorLen) * CEILING_HEIGHT * 2;
  if (totalWallSurface > 0) {
    items.push(lineItem("plaster", totalWallSurface));
  }

  // 5. Paint — interior wall surfaces
  if (totalWallSurface > 0) {
    items.push(lineItem("paint", totalWallSurface));
  }

  // 6. Flooring — wet vs dry per room
  let dryFloorArea = 0;
  let wetFloorArea = 0;
  layout.rooms.forEach((r) => {
    const area = r.width * r.height;
    if (WET_ROOMS.has(r.type)) wetFloorArea += area;
    else dryFloorArea += area;
  });

  if (dryFloorArea > 0) items.push(lineItem("flooringTile", dryFloorArea));
  if (wetFloorArea > 0) items.push(lineItem("flooringTileWet", wetFloorArea));

  // 7. Doors and windows
  const doorCount = layout.openings.filter((o) => o.kind === "door").length;
  const windowCount = layout.openings.filter((o) => o.kind === "window").length;
  if (doorCount > 0) items.push(lineItem("door", doorCount));
  if (windowCount > 0) items.push(lineItem("window", windowCount));

  // 8. Fixtures
  const bathroomCount = layout.rooms.filter((r) => r.type === "bathroom").length;
  const kitchenCount = layout.rooms.filter((r) => r.type === "kitchen").length;
  if (bathroomCount > 0) items.push(lineItem("fixturesBathroom", bathroomCount));
  if (kitchenCount > 0) items.push(lineItem("fixturesKitchen", kitchenCount));

  // 9. Electrical per room
  if (layout.rooms.length > 0) {
    items.push(lineItem("electricalPerRoom", layout.rooms.length));
  }

  // Aggregate
  const byCategory = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.subtotal;
    return acc;
  }, {});

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  return {
    currency: "PKR",
    items,
    byCategory,
    total,
    generatedAt: new Date().toISOString(),
    notes: [
      "Estimates use standard rates and may differ from actual market prices.",
      `Based on ${CEILING_HEIGHT}m ceiling height.`,
    ],
  };
};