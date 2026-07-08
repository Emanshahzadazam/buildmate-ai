import { RATES } from "./materialsRates.js";

// ── Unit conversion ──────────────────────────────────────────────────────────
// All layout data comes in FEET. Rates are per m².
// 1 sq ft = 0.0929 m²  |  1 ft = 0.3048 m
const SQF_TO_SQM = 0.0929;
const FT_TO_M    = 0.3048;

const CEILING_HEIGHT_FT = 10;   // default floor height in feet
const CEILING_HEIGHT_M  = CEILING_HEIGHT_FT * FT_TO_M; // = 3.048 m

const WET_ROOMS = new Set(["bathroom", "kitchen"]);

// ── Helpers ──────────────────────────────────────────────────────────────────
const wallLengthFt = (wall) => {
  const dx = (wall?.x2 || 0) - (wall?.x1 || 0);
  const dy = (wall?.y2 || 0) - (wall?.y1 || 0);
  return Math.sqrt(dx * dx + dy * dy);
};

const lineItem = (key, qty) => {
  const rate = RATES[key];
  if (!rate) throw new Error(`Unknown rate key: ${key}`);
  return {
    key,
    label:    rate.label,
    unit:     rate.unit,
    quantity: Number(qty.toFixed(2)),
    rate:     rate.rate,
    subtotal: Math.round(qty * rate.rate),
    category: rate.category,
  };
};

// ── Main estimator ────────────────────────────────────────────────────────────
export const estimateCost = (layout) => {
  try {
    if (!layout?.generated) {
      return { items:[], total:0, byCategory:{}, generatedAt:null };
    }

    const plot     = layout?.plot     || {};
    const walls    = Array.isArray(layout?.walls)    ? layout.walls    : [];
    const rooms    = Array.isArray(layout?.rooms)    ? layout.rooms    : [];
    const openings = Array.isArray(layout?.openings) ? layout.openings : [];

    const items = [];

    // ── Plot area (feet → m²) ──────────────────────────────────────────
    const plotWidthFt  = plot.width || plot.frontWidth  || plot.backWidth  || 0;
    const plotLengthFt = plot.length || plot.leftLength || plot.rightLength || 0;
    const plotAreaSqm  = plotWidthFt * plotLengthFt * SQF_TO_SQM;

    if (plotAreaSqm > 0) {
      items.push(lineItem("concreteFloor", plotAreaSqm));
      items.push(lineItem("rccRoof",       plotAreaSqm));
    }

    // ── Walls (feet → m²) ────────────────────────────────────────────
    let exteriorLenM = 0;
    let interiorLenM = 0;

    walls.forEach((w) => {
      const lenM = wallLengthFt(w) * FT_TO_M;
      if (w.kind === "exterior") exteriorLenM += lenM;
      else                       interiorLenM += lenM;
    });

    // If no wall data, estimate from plot perimeter
    if (exteriorLenM === 0 && plotAreaSqm > 0) {
      const perimFt = 2 * (plotWidthFt + plotLengthFt);
      exteriorLenM  = perimFt * FT_TO_M;
      // Interior walls — rough estimate: 60% of exterior length
      interiorLenM  = exteriorLenM * 0.6;
    }

    const ceilH = CEILING_HEIGHT_M;

    if (exteriorLenM > 0) {
      items.push(lineItem("brickWall",         exteriorLenM * ceilH));
    }
    if (interiorLenM > 0) {
      items.push(lineItem("brickWallInterior", interiorLenM * ceilH));
    }

    // Plaster + paint on both sides of all walls
    const totalWallSurfaceM2 = (exteriorLenM + interiorLenM) * ceilH * 2;
    if (totalWallSurfaceM2 > 0) {
      items.push(lineItem("plaster", totalWallSurfaceM2));
      items.push(lineItem("paint",   totalWallSurfaceM2));
    }

    // ── Flooring (feet² → m²) ─────────────────────────────────────────
    let dryFloorSqm = 0;
    let wetFloorSqm = 0;

    rooms.forEach((r) => {
      const areaSqm = (r?.width || 0) * (r?.height || 0) * SQF_TO_SQM;
      if (WET_ROOMS.has(r?.type)) wetFloorSqm += areaSqm;
      else                        dryFloorSqm += areaSqm;
    });

    // If no room data, estimate from 80% of plot area
    if (dryFloorSqm + wetFloorSqm === 0 && plotAreaSqm > 0) {
      dryFloorSqm = plotAreaSqm * 0.75;
      wetFloorSqm = plotAreaSqm * 0.10;
    }

    if (dryFloorSqm > 0) items.push(lineItem("flooringTile",    dryFloorSqm));
    if (wetFloorSqm > 0) items.push(lineItem("flooringTileWet", wetFloorSqm));

    // ── Openings (per unit) ───────────────────────────────────────────
    let doorCount   = openings.filter(o => o?.kind === "door").length;
    let windowCount = openings.filter(o => o?.kind === "window").length;

    // If no opening data, estimate from room count
    if (doorCount === 0 && rooms.length > 0) {
      doorCount   = Math.max(1, rooms.length);        // ~1 door per room
      windowCount = Math.max(2, Math.floor(rooms.length * 1.5)); // ~1.5 windows per room
    }

    if (doorCount   > 0) items.push(lineItem("door",   doorCount));
    if (windowCount > 0) items.push(lineItem("window", windowCount));

    // ── Fixtures ──────────────────────────────────────────────────────
    const bathroomCount = rooms.filter(r => r?.type === "bathroom").length || 1;
    const kitchenCount  = rooms.filter(r => r?.type === "kitchen").length  || 1;
    const roomCount     = rooms.length || Math.max(3, Math.round(plotAreaSqm / 12));

    items.push(lineItem("fixturesBathroom",  bathroomCount));
    items.push(lineItem("fixturesKitchen",   kitchenCount));
    items.push(lineItem("electricalPerRoom", roomCount));

    // ── Aggregate ─────────────────────────────────────────────────────
    const byCategory = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.subtotal;
      return acc;
    }, {});

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    // ── Sanity check: PKR 2,500–6,000 per sq ft is normal in Pakistan 2026
    // If total is wildly off, warn in notes
    const costPerSqft = plotAreaSqm > 0
      ? total / (plotAreaSqm / SQF_TO_SQM)
      : 0;

    const notes = [
      "Rates based on Pakistan 2026 market prices (Rawalpindi/Islamabad baseline).",
      `Ceiling height assumed: ${CEILING_HEIGHT_FT} ft.`,
      costPerSqft > 0
        ? `Estimated Rs ${Math.round(costPerSqft).toLocaleString()} per sq ft — typical range: Rs 2,500–6,000/sqft.`
        : "",
    ].filter(Boolean);

    return {
      currency: "PKR",
      items,
      byCategory,
      total,
      generatedAt: new Date().toISOString(),
      notes,
    };

  } catch (error) {
    console.error("Cost estimation error:", error);
    return {
      currency: "PKR",
      items: [],
      byCategory: {},
      total: 0,
      generatedAt: null,
      error: error.message,
    };
  }
};