// Pakistani construction material rates — April 2026.
//
// Sources (verify before final demo, refresh quarterly):
//   [1] Pakistan Bureau of Statistics, Monthly Inflation Report April 2026
//       https://www.pbs.gov.pk/monthly-inflation-report-for-april-2026/
//       (Urban + Rural Construction Items Prices, Excel downloads)
//   [2] Glorious Builders public price list, 2026
//       https://gloriousbuilders.com/construction-cost-in-pakistan-2026/
//   [3] The Family Builders, Construction Cost Per Square Foot Pakistan 2026
//       https://thefamilybuilders.com/blogs/construction-cost-per-square-foot-pakistan-2026-updated-rates-breakdown
//   [4] Avenir Developments, House Construction Cost Calculator 2026
//       https://avenirdevelopments.com/house-construction-cost/
//   [5] Elegant Design & Construction, 2026 update
//       https://elegantdesignpk.com/latest-construction-material-rates-in-pakistan-2026-update/
//
// Notes:
//   • All rates in PKR (Pakistani Rupees), per the unit specified.
//   • Wall and roof rates include material + standard labor.
//   • Per-m² conversions from raw prices use standard construction quantities;
//     each conversion is documented in the comment above the rate.
//   • Rates rounded to the nearest 50 PKR — precision beyond that is illusory.
//   • Last refreshed: <fill in date when you update>.

export const RATES = {
  // ────────────────────────────────────────────────────────────────────
  // STRUCTURE
  // ────────────────────────────────────────────────────────────────────

  // Exterior brick wall, 9-inch (228mm) thick.
  // Source [3]: bricks ~Rs 25,000/1000. ~55 bricks per ft² of 9" wall =
  //   ~590 bricks per m². Brick material alone: 590 × 25 = ~14,750.
  //   Cement+sand mortar adds ~1,500. Labor adds ~1,500. Total ~17,750.
  //   Conservatively rounded to 17,500 PKR/m² (wall surface area).
  brickWall: {
    label: "Brick wall (9-inch, exterior)",
    unit: "m²",
    rate: 17500,
    category: "structure",
    source: "Source [3]",
  },

  // Interior brick wall, 4.5-inch (115mm) thick.
  // Roughly half the bricks of a 9" wall: ~9,000 + mortar 800 + labor 1,200
  //   = ~11,000. Rounded: 11,000 PKR/m².
  brickWallInterior: {
    label: "Brick wall (4.5-inch, interior)",
    unit: "m²",
    rate: 11000,
    category: "structure",
    source: "Source [3]",
  },

  // Concrete floor / PCC base layer (4-inch thick).
  // Cement [3]: ~1,400/bag. ~0.5 bag + sand + crush + labor per m² of 4" PCC.
  //   Rough cost ~3,500 PKR/m² including labor.
  concreteFloor: {
    label: "Concrete floor (PCC, 4-inch)",
    unit: "m²",
    rate: 3500,
    category: "structure",
    source: "Source [3]",
  },

  // RCC roof slab (5-inch thick, with steel reinforcement).
  // Steel [3]: ~250,000/ton. ~6 kg steel + cement + labor per ft² of slab.
  //   Per m²: ~65 kg steel = ~16,250 + cement/sand/crush ~2,500 + labor ~3,000
  //   = ~21,750. Rounded: 22,000 PKR/m². This is the single biggest cost line
  //   in any building.
  rccRoof: {
    label: "RCC roof slab (5-inch, with steel)",
    unit: "m²",
    rate: 22000,
    category: "structure",
    source: "Source [3]",
  },

  // ────────────────────────────────────────────────────────────────────
  // FINISHES
  // ────────────────────────────────────────────────────────────────────

  // Cement plaster on wall surfaces (single side, ~12mm thick).
  // ~0.15 bag cement + sand + labor per m². Rough total: ~900 PKR/m².
  plaster: {
    label: "Cement plaster (per side)",
    unit: "m²",
    rate: 900,
    category: "finishes",
    source: "Source [3]",
  },

  // Interior wall paint (two coats of mid-range emulsion).
  // Material ~150 + labor ~250 = ~400 PKR/m².
  paint: {
    label: "Wall paint (interior, 2 coats)",
    unit: "m²",
    rate: 400,
    category: "finishes",
    source: "Source [4]",
  },

  // Standard floor tiles (12×12 or 16×16, mid-range local brand).
  // Source [2]: branded floor tiles Rs 3,000–6,000/sq ft (premium range).
  // Mid-range local: ~Rs 250–350/sq ft = ~Rs 2,700–3,800/m². With cement
  // mortar and labor: ~3,500 PKR/m² total installed.
  flooringTile: {
    label: "Floor tiles (standard)",
    unit: "m²",
    rate: 3500,
    category: "finishes",
    source: "Source [2]",
  },

  // Bathroom/kitchen grade tiles (anti-skid, water-resistant).
  // Higher grade tiles ~Rs 400–500/sq ft + labor + grouting.
  //   ~5,000 PKR/m² installed.
  flooringTileWet: {
    label: "Floor tiles (wet area, anti-skid)",
    unit: "m²",
    rate: 5000,
    category: "finishes",
    source: "Source [2]",
  },

  // ────────────────────────────────────────────────────────────────────
  // OPENINGS
  // ────────────────────────────────────────────────────────────────────

  // Standard wooden door with frame and basic hardware.
  // Source [4]: woodwork ranges widely. Mid-range local solid wood door
  //   with frame, lock, hinges: ~30,000–45,000. Picking 35,000.
  door: {
    label: "Door (wooden, with frame & hardware)",
    unit: "each",
    rate: 35000,
    category: "openings",
    source: "Source [4]",
  },

  // Aluminium-framed window with glass.
  // Source [4]: aluminium windows ~Rs 800–1200/sq ft. A standard 4×4 ft
  //   window = 16 sq ft × ~1,000 = ~16,000. Round to 18,000 to include
  //   installation.
  window: {
    label: "Window (aluminium, ~4×4 ft)",
    unit: "each",
    rate: 18000,
    category: "openings",
    source: "Source [4]",
  },

  // ────────────────────────────────────────────────────────────────────
  // FIXTURES
  // ────────────────────────────────────────────────────────────────────

  // Bathroom: WC, washbasin, taps, shower, geyser, plumbing rough-in.
  // Source [4]: shower cabins, taps, geysers vary; mid-range complete
  //   bathroom ~80,000–120,000 PKR. Picking 90,000.
  fixturesBathroom: {
    label: "Bathroom fixtures (complete set)",
    unit: "each",
    rate: 90000,
    category: "fixtures",
    source: "Source [4]",
  },

  // Kitchen: cabinets (basic), sink, taps, plumbing & gas connections.
  // Excludes appliances. Source [4]: kitchen woodwork is highly variable.
  //   Mid-range: ~150,000.
  fixturesKitchen: {
    label: "Kitchen fixtures (cabinets, sink, plumbing)",
    unit: "each",
    rate: 150000,
    category: "fixtures",
    source: "Source [4]",
  },

  // Electrical per room: wiring, switches, sockets, fan + light points,
  //   distribution cabling. Source [4]: CPR cables + electrician rates.
  //   Per standard room: ~22,000 PKR.
  electricalPerRoom: {
    label: "Electrical (per room)",
    unit: "each",
    rate: 22000,
    category: "fixtures",
    source: "Source [4]",
  },
};

export const CATEGORIES = ["structure", "finishes", "openings", "fixtures"];

// Optional: a rough sanity check exposed for tests / admin UI
export const META = {
  currency: "PKR",
  region: "Pakistan (Rawalpindi/Islamabad baseline)",
  lastUpdated: "2026-04-30",
  notes: [
    "Rates include standard material + labor where applicable.",
    "Regional variation: Karachi/Lahore typically ±10%, smaller cities often -10–15%.",
    "Rates do NOT include: site grading, foundation depth variations, plumbing/sewerage routing, contingency markup (typically 10–15%).",
  ],
};

//"The cost-estimation engine uses static material rates derived from publicly available 2026 sources, including the Pakistan Bureau of Statistics' monthly construction item indices and several Pakistani construction companies' published rate cards. Per-m² conversions from raw prices (per bag, per ton, per 1000 units) follow standard construction-industry quantity assumptions documented inline in source code. The current implementation does not include real-time rate updates; future work could integrate periodic scraping of PBS data or admin-managed rate updates."