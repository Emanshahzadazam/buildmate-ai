import { RATES } from "./materialsRates.js";

const CEILING_HEIGHT = 3.0;
const WET_ROOMS = new Set(["bathroom", "kitchen"]);

const wallLengthMeters = (wall) => {
  const dx = (wall?.x2 || 0) - (wall?.x1 || 0);
  const dy = (wall?.y2 || 0) - (wall?.y1 || 0);
  return Math.sqrt(dx * dx + dy * dy);
};

const lineItem = (key, qty) => {
  const rate = RATES[key];

  if (!rate) {
    throw new Error(`Unknown rate key: ${key}`);
  }

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
  try {
    if (!layout?.generated) {
      return {
        items: [],
        total: 0,
        byCategory: {},
        generatedAt: null,
      };
    }

    const plot = layout?.plot || {};
    const walls = Array.isArray(layout?.walls) ? layout.walls : [];
    const rooms = Array.isArray(layout?.rooms) ? layout.rooms : [];
    const openings = Array.isArray(layout?.openings)
      ? layout.openings
      : [];

    const items = [];

    // Support both old and new plot formats
    const plotWidth =
      plot.width ||
      plot.frontWidth ||
      plot.backWidth ||
      0;

    const plotLength =
      plot.length ||
      plot.leftLength ||
      plot.rightLength ||
      0;

    const plotArea = plotWidth * plotLength;

    if (plotArea > 0) {
      items.push(lineItem("concreteFloor", plotArea));
      items.push(lineItem("rccRoof", plotArea));
    }

    // Walls
    let exteriorLen = 0;
    let interiorLen = 0;

    walls.forEach((w) => {
      const len = wallLengthMeters(w);

      if (w.kind === "exterior") {
        exteriorLen += len;
      } else {
        interiorLen += len;
      }
    });

    if (exteriorLen > 0) {
      items.push(
        lineItem(
          "brickWall",
          exteriorLen * CEILING_HEIGHT
        )
      );
    }

    if (interiorLen > 0) {
      items.push(
        lineItem(
          "brickWallInterior",
          interiorLen * CEILING_HEIGHT
        )
      );
    }

    const totalWallSurface =
      (exteriorLen + interiorLen) *
      CEILING_HEIGHT *
      2;

    if (totalWallSurface > 0) {
      items.push(
        lineItem("plaster", totalWallSurface)
      );

      items.push(
        lineItem("paint", totalWallSurface)
      );
    }

    // Flooring
    let dryFloorArea = 0;
    let wetFloorArea = 0;

    rooms.forEach((r) => {
      const width = r?.width || 0;
      const height = r?.height || 0;

      const area = width * height;

      if (WET_ROOMS.has(r?.type)) {
        wetFloorArea += area;
      } else {
        dryFloorArea += area;
      }
    });

    if (dryFloorArea > 0) {
      items.push(
        lineItem("flooringTile", dryFloorArea)
      );
    }

    if (wetFloorArea > 0) {
      items.push(
        lineItem(
          "flooringTileWet",
          wetFloorArea
        )
      );
    }

    // Openings
    const doorCount = openings.filter(
      (o) => o?.kind === "door"
    ).length;

    const windowCount = openings.filter(
      (o) => o?.kind === "window"
    ).length;

    if (doorCount > 0) {
      items.push(lineItem("door", doorCount));
    }

    if (windowCount > 0) {
      items.push(
        lineItem("window", windowCount)
      );
    }

    // Fixtures
    const bathroomCount = rooms.filter(
      (r) => r?.type === "bathroom"
    ).length;

    const kitchenCount = rooms.filter(
      (r) => r?.type === "kitchen"
    ).length;

    if (bathroomCount > 0) {
      items.push(
        lineItem(
          "fixturesBathroom",
          bathroomCount
        )
      );
    }

    if (kitchenCount > 0) {
      items.push(
        lineItem(
          "fixturesKitchen",
          kitchenCount
        )
      );
    }

    if (rooms.length > 0) {
      items.push(
        lineItem(
          "electricalPerRoom",
          rooms.length
        )
      );
    }

    const byCategory = items.reduce(
      (acc, item) => {
        acc[item.category] =
          (acc[item.category] || 0) +
          item.subtotal;
        return acc;
      },
      {}
    );

    const total = items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

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
  } catch (error) {
    console.error(
      "Cost estimation error:",
      error
    );

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