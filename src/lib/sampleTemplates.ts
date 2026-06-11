import { DUPATemplate, GeneralCategoryTemplate } from "@/types";

function id() { return crypto.randomUUID(); }

export function createSampleDupaTemplates(): DUPATemplate[] {
  return [
    {
      id: id(), name: "Mobilization & Demobilization", description: "Mobilization & Demobilization", unit: "lot", quantity: 1,
      materials: [
        { id: id(), description: "Transportation of Equipment", quantity: 1, unit: "lot", unitCost: 15000, totalCost: 15000 },
        { id: id(), description: "Setup Materials", quantity: 1, unit: "lot", unitCost: 8000, totalCost: 8000 },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 2, wageRate: 650, totalCost: 1300 },
        { id: id(), description: "Skilled Worker", manDays: 4, wageRate: 550, totalCost: 2200 },
        { id: id(), description: "Laborer", manDays: 6, wageRate: 450, totalCost: 2700 },
      ],
      equipment: [
        { id: id(), description: "Crane Truck", period: 1, rate: 5000, totalCost: 5000 },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Construction Occupational Safety & Health", description: "Construction Occupational Safety & Health", unit: "lot", quantity: 1,
      materials: [
        { id: id(), description: "Safety Signages", quantity: 1, unit: "lot", unitCost: 5000, totalCost: 5000 },
        { id: id(), description: "PPE Set (Hard Hat, Vest, Gloves, Boots)", quantity: 10, unit: "set", unitCost: 1500, totalCost: 15000, quantityFormula: "qty * 10" },
        { id: id(), description: "First Aid Kit", quantity: 2, unit: "set", unitCost: 2500, totalCost: 5000 },
      ],
      labor: [
        { id: id(), description: "Safety Officer", manDays: 30, wageRate: 800, totalCost: 24000, manDaysFormula: "qty * 30" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Temporary Facilities, Billboard and Barricade", description: "Temporary Facilities, Billboard and Barricade", unit: "lot", quantity: 1,
      materials: [
        { id: id(), description: "Temporary Office/Bunkhouse Materials", quantity: 1, unit: "lot", unitCost: 25000, totalCost: 25000 },
        { id: id(), description: "Project Billboard (4'x8')", quantity: 1, unit: "pc", unitCost: 8000, totalCost: 8000 },
        { id: id(), description: "Barricade/Temporary Fence", quantity: 50, unit: "l.m.", unitCost: 350, totalCost: 17500, quantityFormula: "qty * 50" },
      ],
      labor: [
        { id: id(), description: "Carpenter", manDays: 5, wageRate: 550, totalCost: 2750 },
        { id: id(), description: "Laborer", manDays: 5, wageRate: 450, totalCost: 2250 },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Demolition/Removal of Existing Structures", description: "Demolition/Removal of Existing Solar Battery, slab, railings, drywall and all affected area", unit: "lot", quantity: 1,
      materials: [
        { id: id(), description: "Consumables (Cutting Disc, etc.)", quantity: 1, unit: "lot", unitCost: 3000, totalCost: 3000 },
      ],
      labor: [
        { id: id(), description: "Skilled Worker", manDays: 8, wageRate: 550, totalCost: 4400, manDaysFormula: "qty * 8" },
        { id: id(), description: "Laborer", manDays: 12, wageRate: 450, totalCost: 5400, manDaysFormula: "qty * 12" },
      ],
      equipment: [
        { id: id(), description: "Demolition Hammer", period: 3, rate: 1500, totalCost: 4500, periodFormula: "qty * 3" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Hauling and Disposal of Debris", description: "Hauling and Disposal of Debris and Scrap Materials from Affected Areas", unit: "cu.m.", quantity: 10,
      materials: [],
      labor: [
        { id: id(), description: "Laborer", manDays: 1, wageRate: 450, totalCost: 450, manDaysFormula: "qty * 0.1" },
      ],
      equipment: [
        { id: id(), description: "Dump Truck (6-wheeler)", period: 0.5, rate: 4500, totalCost: 2250, periodFormula: "qty * 0.05" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Repair/Restoration of Affected Areas", description: "Repair/Restoration of All Affected/Damaged Areas", unit: "lot", quantity: 1,
      materials: [
        { id: id(), description: "Cement", quantity: 5, unit: "bag", unitCost: 280, totalCost: 1400, quantityFormula: "qty * 5" },
        { id: id(), description: "Sand", quantity: 0.5, unit: "cu.m.", unitCost: 1200, totalCost: 600, quantityFormula: "qty * 0.5" },
        { id: id(), description: "Paint & Patching Materials", quantity: 1, unit: "lot", unitCost: 3000, totalCost: 3000 },
      ],
      labor: [
        { id: id(), description: "Mason", manDays: 3, wageRate: 550, totalCost: 1650, manDaysFormula: "qty * 3" },
        { id: id(), description: "Painter", manDays: 2, wageRate: 550, totalCost: 1100, manDaysFormula: "qty * 2" },
        { id: id(), description: "Laborer", manDays: 3, wageRate: 450, totalCost: 1350, manDaysFormula: "qty * 3" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Excavation", description: "Excavation", unit: "cu.m.", quantity: 10,
      materials: [],
      labor: [
        { id: id(), description: "Laborer", manDays: 1.2, wageRate: 450, totalCost: 540, manDaysFormula: "qty * 0.12" },
      ],
      equipment: [
        { id: id(), description: "Backhoe (0.80 cu.m.)", period: 0.5, rate: 3500, totalCost: 1750, periodFormula: "qty * 0.05" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Concrete 3000 psi", description: "Concrete 3000 psi", unit: "cu.m.", quantity: 1,
      materials: [
        { id: id(), description: "Portland Cement Type I", quantity: 9, unit: "bag", unitCost: 280, totalCost: 2520, quantityFormula: "qty * 9" },
        { id: id(), description: "Fine Aggregate (Sand)", quantity: 0.5, unit: "cu.m.", unitCost: 1200, totalCost: 600, quantityFormula: "qty * 0.5" },
        { id: id(), description: "Coarse Aggregate (Gravel)", quantity: 0.9, unit: "cu.m.", unitCost: 1400, totalCost: 1260, quantityFormula: "qty * 0.9" },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 0.1, wageRate: 650, totalCost: 65, manDaysFormula: "qty * 0.1" },
        { id: id(), description: "Mason", manDays: 0.57, wageRate: 550, totalCost: 313.5, manDaysFormula: "qty * 0.57" },
        { id: id(), description: "Laborer", manDays: 1.14, wageRate: 450, totalCost: 513, manDaysFormula: "qty * 1.14" },
      ],
      equipment: [
        { id: id(), description: "Concrete Mixer (1-bagger)", period: 0.33, rate: 1500, totalCost: 495, periodFormula: "qty * 0.33" },
        { id: id(), description: "Concrete Vibrator", period: 0.17, rate: 1200, totalCost: 204, periodFormula: "qty * 0.17" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Reinforcing Steel Bar (Grade 33)", description: "Reinforcing Steel Bar (Grade 33) including #16 GI tie wire", unit: "kg", quantity: 100,
      materials: [
        { id: id(), description: "Deformed Steel Bar (Grade 33)", quantity: 105, unit: "kg", unitCost: 55, totalCost: 5775, quantityFormula: "qty * 1.05" },
        { id: id(), description: "#16 GI Tie Wire", quantity: 3, unit: "kg", unitCost: 85, totalCost: 255, quantityFormula: "qty * 0.03" },
      ],
      labor: [
        { id: id(), description: "Steel Man", manDays: 3.33, wageRate: 550, totalCost: 1831.5, manDaysFormula: "qty * 0.0333" },
        { id: id(), description: "Laborer", manDays: 3.33, wageRate: 450, totalCost: 1498.5, manDaysFormula: "qty * 0.0333" },
      ],
      equipment: [
        { id: id(), description: "Bar Cutter", period: 0.5, rate: 800, totalCost: 400, periodFormula: "qty * 0.005" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Gravel Bedding", description: "Gravel Bedding", unit: "cu.m.", quantity: 1,
      materials: [
        { id: id(), description: "Gravel", quantity: 1.1, unit: "cu.m.", unitCost: 1400, totalCost: 1540, quantityFormula: "qty * 1.1" },
      ],
      labor: [
        { id: id(), description: "Laborer", manDays: 0.2, wageRate: 450, totalCost: 90, manDaysFormula: "qty * 0.2" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Soil Backfilling with Compaction", description: "Soil Backfilling with Compaction", unit: "cu.m.", quantity: 1,
      materials: [],
      labor: [
        { id: id(), description: "Laborer", manDays: 0.15, wageRate: 450, totalCost: 67.5, manDaysFormula: "qty * 0.15" },
      ],
      equipment: [
        { id: id(), description: "Plate Compactor", period: 0.1, rate: 1200, totalCost: 120, periodFormula: "qty * 0.1" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Slab on Grade - Concrete 3000 psi", description: "Slab on Grade Concrete 3000 psi", unit: "cu.m.", quantity: 1,
      materials: [
        { id: id(), description: "Portland Cement Type I", quantity: 9, unit: "bag", unitCost: 280, totalCost: 2520, quantityFormula: "qty * 9" },
        { id: id(), description: "Fine Aggregate (Sand)", quantity: 0.5, unit: "cu.m.", unitCost: 1200, totalCost: 600, quantityFormula: "qty * 0.5" },
        { id: id(), description: "Coarse Aggregate (Gravel)", quantity: 0.9, unit: "cu.m.", unitCost: 1400, totalCost: 1260, quantityFormula: "qty * 0.9" },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 0.1, wageRate: 650, totalCost: 65, manDaysFormula: "qty * 0.1" },
        { id: id(), description: "Mason", manDays: 0.5, wageRate: 550, totalCost: 275, manDaysFormula: "qty * 0.5" },
        { id: id(), description: "Laborer", manDays: 1.0, wageRate: 450, totalCost: 450, manDaysFormula: "qty * 1.0" },
      ],
      equipment: [
        { id: id(), description: "Concrete Mixer (1-bagger)", period: 0.33, rate: 1500, totalCost: 495, periodFormula: "qty * 0.33" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "4\" CHB Wall System", description: "4\" CHB Wall System (including tie wire, mortar and 10mm ∅ steel reinforcement every three layer, 0.60m vertical spacing and anchoring epoxy)", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "4\" CHB", quantity: 12.5, unit: "pc", unitCost: 14, totalCost: 175, quantityFormula: "qty * 12.5" },
        { id: id(), description: "Portland Cement", quantity: 0.46, unit: "bag", unitCost: 280, totalCost: 128.8, quantityFormula: "qty * 0.46" },
        { id: id(), description: "Sand", quantity: 0.025, unit: "cu.m.", unitCost: 1200, totalCost: 30, quantityFormula: "qty * 0.025" },
        { id: id(), description: "10mm ∅ RSB", quantity: 3.12, unit: "kg", unitCost: 55, totalCost: 171.6, quantityFormula: "qty * 3.12" },
        { id: id(), description: "#16 GI Tie Wire", quantity: 0.15, unit: "kg", unitCost: 85, totalCost: 12.75, quantityFormula: "qty * 0.15" },
      ],
      labor: [
        { id: id(), description: "Mason", manDays: 0.24, wageRate: 550, totalCost: 132, manDaysFormula: "qty * 0.24" },
        { id: id(), description: "Laborer", manDays: 0.24, wageRate: 450, totalCost: 108, manDaysFormula: "qty * 0.24" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Cement Plastering", description: "Cement Plastering of Interior and Exterior: Walls, Beams, Columns, Lintel Beams, Window & Door Openings, Mouldings etc.", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "Portland Cement", quantity: 0.4, unit: "bag", unitCost: 280, totalCost: 112, quantityFormula: "qty * 0.4" },
        { id: id(), description: "Sand", quantity: 0.016, unit: "cu.m.", unitCost: 1200, totalCost: 19.2, quantityFormula: "qty * 0.016" },
      ],
      labor: [
        { id: id(), description: "Mason", manDays: 0.13, wageRate: 550, totalCost: 71.5, manDaysFormula: "qty * 0.13" },
        { id: id(), description: "Laborer", manDays: 0.13, wageRate: 450, totalCost: 58.5, manDaysFormula: "qty * 0.13" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Prepainted Longspan Roofing", description: "0.50mm thk Prepainted Longspan Rib Type Roofing", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "0.50mm thk Prepainted Longspan Rib Type Roofing", quantity: 1.1, unit: "sq.m.", unitCost: 450, totalCost: 495, quantityFormula: "qty * 1.1" },
        { id: id(), description: "Tekscrew", quantity: 8, unit: "pc", unitCost: 5, totalCost: 40, quantityFormula: "qty * 8" },
        { id: id(), description: "Sealant", quantity: 0.05, unit: "tube", unitCost: 250, totalCost: 12.5, quantityFormula: "qty * 0.05" },
      ],
      labor: [
        { id: id(), description: "Tinsmith", manDays: 0.08, wageRate: 550, totalCost: 44, manDaysFormula: "qty * 0.08" },
        { id: id(), description: "Laborer", manDays: 0.08, wageRate: 450, totalCost: 36, manDaysFormula: "qty * 0.08" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "GI Sheet Flashing", description: "0.50mm thk. Prepainted G.I Sheet Flashing", unit: "l.m.", quantity: 1,
      materials: [
        { id: id(), description: "0.50mm thk Prepainted G.I Sheet", quantity: 0.3, unit: "sq.m.", unitCost: 450, totalCost: 135, quantityFormula: "qty * 0.3" },
        { id: id(), description: "Pop Rivets", quantity: 4, unit: "pc", unitCost: 3, totalCost: 12, quantityFormula: "qty * 4" },
        { id: id(), description: "Sealant", quantity: 0.05, unit: "tube", unitCost: 250, totalCost: 12.5, quantityFormula: "qty * 0.05" },
      ],
      labor: [
        { id: id(), description: "Tinsmith", manDays: 0.05, wageRate: 550, totalCost: 27.5, manDaysFormula: "qty * 0.05" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Roof Framing System", description: "Roof Framing System", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "C-Purlins (2\"x3\"x1.2mm)", quantity: 2, unit: "pc", unitCost: 650, totalCost: 1300, quantityFormula: "qty * 2" },
        { id: id(), description: "Sagrods (10mm ∅)", quantity: 0.5, unit: "pc", unitCost: 380, totalCost: 190, quantityFormula: "qty * 0.5" },
        { id: id(), description: "Tekscrew & Bolts", quantity: 1, unit: "lot", unitCost: 50, totalCost: 50, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Welder", manDays: 0.15, wageRate: 600, totalCost: 90, manDaysFormula: "qty * 0.15" },
        { id: id(), description: "Laborer", manDays: 0.15, wageRate: 450, totalCost: 67.5, manDaysFormula: "qty * 0.15" },
      ],
      equipment: [
        { id: id(), description: "Welding Machine", period: 0.15, rate: 800, totalCost: 120, periodFormula: "qty * 0.15" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Fiber Cement Board Ceiling", description: "4.50 mm thk. Fiber Cement Board Ceiling on Framing System with complete accessories", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "4.5mm Fiber Cement Board (4'x8')", quantity: 0.35, unit: "pc", unitCost: 380, totalCost: 133, quantityFormula: "qty * 0.35" },
        { id: id(), description: "Metal Furring (0.40mm)", quantity: 3, unit: "pc", unitCost: 85, totalCost: 255, quantityFormula: "qty * 3" },
        { id: id(), description: "Carrying Channel", quantity: 1, unit: "pc", unitCost: 120, totalCost: 120, quantityFormula: "qty * 1" },
        { id: id(), description: "Blind Rivets & Screws", quantity: 15, unit: "pc", unitCost: 2, totalCost: 30, quantityFormula: "qty * 15" },
      ],
      labor: [
        { id: id(), description: "Carpenter", manDays: 0.16, wageRate: 550, totalCost: 88, manDaysFormula: "qty * 0.16" },
        { id: id(), description: "Laborer", manDays: 0.08, wageRate: 450, totalCost: 36, manDaysFormula: "qty * 0.08" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Pre-Painted Spandrel Ceiling", description: "0.5mm thk. Pre-Painted Spandrel on Framing System with complete accessories", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "0.5mm Pre-Painted Spandrel", quantity: 1.1, unit: "sq.m.", unitCost: 420, totalCost: 462, quantityFormula: "qty * 1.1" },
        { id: id(), description: "Metal Furring & Accessories", quantity: 1, unit: "lot", unitCost: 250, totalCost: 250, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Carpenter", manDays: 0.12, wageRate: 550, totalCost: 66, manDaysFormula: "qty * 0.12" },
        { id: id(), description: "Laborer", manDays: 0.06, wageRate: 450, totalCost: 27, manDaysFormula: "qty * 0.06" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Semi-Gloss Latex Paint (Wall)", description: "Semi-Gloss Latex Paint Finish on Interior and Exterior Wall (scraping, surface preparation, primer and top coats)", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "Semi-Gloss Latex Paint", quantity: 0.12, unit: "gal", unitCost: 950, totalCost: 114, quantityFormula: "qty * 0.12" },
        { id: id(), description: "Latex Primer/Sealer", quantity: 0.06, unit: "gal", unitCost: 750, totalCost: 45, quantityFormula: "qty * 0.06" },
        { id: id(), description: "Sandpaper & Putty", quantity: 1, unit: "lot", unitCost: 15, totalCost: 15, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Painter", manDays: 0.1, wageRate: 550, totalCost: 55, manDaysFormula: "qty * 0.1" },
        { id: id(), description: "Laborer", manDays: 0.05, wageRate: 450, totalCost: 22.5, manDaysFormula: "qty * 0.05" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Flat Latex Paint (Ceiling)", description: "Flat Latex Paint Finish on Ceiling (surface preparation, primer and top coats)", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "Flat Latex Paint", quantity: 0.12, unit: "gal", unitCost: 850, totalCost: 102, quantityFormula: "qty * 0.12" },
        { id: id(), description: "Latex Primer/Sealer", quantity: 0.06, unit: "gal", unitCost: 750, totalCost: 45, quantityFormula: "qty * 0.06" },
      ],
      labor: [
        { id: id(), description: "Painter", manDays: 0.12, wageRate: 550, totalCost: 66, manDaysFormula: "qty * 0.12" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Porcelain Floor Tiles (Glazed)", description: "0.60 m x 0.60 m Porcelain Floor Tiles (Glazed) including tile adhesive, tile grout and topping", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "0.60x0.60m Porcelain Tiles (Glazed)", quantity: 1.1, unit: "sq.m.", unitCost: 450, totalCost: 495, quantityFormula: "qty * 1.1" },
        { id: id(), description: "Tile Adhesive", quantity: 0.25, unit: "bag", unitCost: 380, totalCost: 95, quantityFormula: "qty * 0.25" },
        { id: id(), description: "Tile Grout", quantity: 0.1, unit: "bag", unitCost: 200, totalCost: 20, quantityFormula: "qty * 0.1" },
      ],
      labor: [
        { id: id(), description: "Tile Setter", manDays: 0.15, wageRate: 600, totalCost: 90, manDaysFormula: "qty * 0.15" },
        { id: id(), description: "Laborer", manDays: 0.08, wageRate: 450, totalCost: 36, manDaysFormula: "qty * 0.08" },
      ],
      equipment: [
        { id: id(), description: "Tile Cutter", period: 0.05, rate: 500, totalCost: 25, periodFormula: "qty * 0.05" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Porcelain Floor Tiles (Non-Skid)", description: "0.60 m x 0.60 m Porcelain Floor Tiles (Non-Skid) including tile adhesive, tile grout and topping", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "0.60x0.60m Porcelain Tiles (Non-Skid)", quantity: 1.1, unit: "sq.m.", unitCost: 500, totalCost: 550, quantityFormula: "qty * 1.1" },
        { id: id(), description: "Tile Adhesive", quantity: 0.25, unit: "bag", unitCost: 380, totalCost: 95, quantityFormula: "qty * 0.25" },
        { id: id(), description: "Tile Grout", quantity: 0.1, unit: "bag", unitCost: 200, totalCost: 20, quantityFormula: "qty * 0.1" },
      ],
      labor: [
        { id: id(), description: "Tile Setter", manDays: 0.15, wageRate: 600, totalCost: 90, manDaysFormula: "qty * 0.15" },
        { id: id(), description: "Laborer", manDays: 0.08, wageRate: 450, totalCost: 36, manDaysFormula: "qty * 0.08" },
      ],
      equipment: [
        { id: id(), description: "Tile Cutter", period: 0.05, rate: 500, totalCost: 25, periodFormula: "qty * 0.05" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Porcelain Wall Tiles", description: "0.30 m x 0.60 m Porcelain Wall Tiles (including adhesive and grout)", unit: "sq.m.", quantity: 1,
      materials: [
        { id: id(), description: "0.30x0.60m Porcelain Wall Tiles", quantity: 1.1, unit: "sq.m.", unitCost: 400, totalCost: 440, quantityFormula: "qty * 1.1" },
        { id: id(), description: "Tile Adhesive", quantity: 0.3, unit: "bag", unitCost: 380, totalCost: 114, quantityFormula: "qty * 0.3" },
        { id: id(), description: "Tile Grout", quantity: 0.1, unit: "bag", unitCost: 200, totalCost: 20, quantityFormula: "qty * 0.1" },
      ],
      labor: [
        { id: id(), description: "Tile Setter", manDays: 0.18, wageRate: 600, totalCost: 108, manDaysFormula: "qty * 0.18" },
        { id: id(), description: "Laborer", manDays: 0.09, wageRate: 450, totalCost: 40.5, manDaysFormula: "qty * 0.09" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "D1 - Single Swing Panel Door", description: "D1- 0.80 m width x 2.10 m height Tanguile Single Swing Panel Door with Steel Jamb, Heavy Duty Dome Type Door Knob, Heavy Duty Hinges, including complete accessories and paint finish", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Tanguile Panel Door (0.80x2.10m)", quantity: 1, unit: "set", unitCost: 4500, totalCost: 4500, quantityFormula: "qty * 1" },
        { id: id(), description: "Steel Door Jamb", quantity: 1, unit: "set", unitCost: 1800, totalCost: 1800, quantityFormula: "qty * 1" },
        { id: id(), description: "Heavy Duty Hinges (3pcs)", quantity: 1, unit: "set", unitCost: 450, totalCost: 450, quantityFormula: "qty * 1" },
        { id: id(), description: "Dome Type Door Knob", quantity: 1, unit: "set", unitCost: 850, totalCost: 850, quantityFormula: "qty * 1" },
        { id: id(), description: "Paint & Accessories", quantity: 1, unit: "lot", unitCost: 350, totalCost: 350, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Carpenter", manDays: 0.5, wageRate: 550, totalCost: 275, manDaysFormula: "qty * 0.5" },
        { id: id(), description: "Painter", manDays: 0.25, wageRate: 550, totalCost: 137.5, manDaysFormula: "qty * 0.25" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "D2 - Single Swing Panel Door with Louver", description: "D2- 0.60 m width x 2.10 m height Tanguile Single Swing Panel Door with Louver Vent, Steel Jamb, Heavy Duty Dome Type Door Knob, Heavy Duty Hinges, including complete accessories and paint finish", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Tanguile Panel Door w/ Louver (0.60x2.10m)", quantity: 1, unit: "set", unitCost: 4200, totalCost: 4200, quantityFormula: "qty * 1" },
        { id: id(), description: "Steel Door Jamb", quantity: 1, unit: "set", unitCost: 1600, totalCost: 1600, quantityFormula: "qty * 1" },
        { id: id(), description: "Heavy Duty Hinges (3pcs)", quantity: 1, unit: "set", unitCost: 450, totalCost: 450, quantityFormula: "qty * 1" },
        { id: id(), description: "Dome Type Door Knob", quantity: 1, unit: "set", unitCost: 850, totalCost: 850, quantityFormula: "qty * 1" },
        { id: id(), description: "Paint & Accessories", quantity: 1, unit: "lot", unitCost: 350, totalCost: 350, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Carpenter", manDays: 0.5, wageRate: 550, totalCost: 275, manDaysFormula: "qty * 0.5" },
        { id: id(), description: "Painter", manDays: 0.25, wageRate: 550, totalCost: 137.5, manDaysFormula: "qty * 0.25" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "W1 - Aluminum Awning Window (1.50x0.50)", description: "W1- 1.50 m width x 0.50 m height White Powder Coated Aluminum Awning Window with 6 mm thk. One Way Reflective Bronze Tempered Glass with complete accessories", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Aluminum Awning Window (1.50x0.50m) with Tempered Glass", quantity: 1, unit: "set", unitCost: 6500, totalCost: 6500, quantityFormula: "qty * 1" },
        { id: id(), description: "Sealant & Accessories", quantity: 1, unit: "lot", unitCost: 200, totalCost: 200, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Aluminum Installer", manDays: 0.5, wageRate: 600, totalCost: 300, manDaysFormula: "qty * 0.5" },
        { id: id(), description: "Laborer", manDays: 0.25, wageRate: 450, totalCost: 112.5, manDaysFormula: "qty * 0.25" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "W2 - Aluminum Awning Window (1.00x0.50)", description: "W2- 1.00 m width x 0.50 m height White Powder Coated Aluminum Awning Window with 6 mm thk. One Way Reflective Bronze Tempered Glass with complete accessories", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Aluminum Awning Window (1.00x0.50m) with Tempered Glass", quantity: 1, unit: "set", unitCost: 4800, totalCost: 4800, quantityFormula: "qty * 1" },
        { id: id(), description: "Sealant & Accessories", quantity: 1, unit: "lot", unitCost: 200, totalCost: 200, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Aluminum Installer", manDays: 0.4, wageRate: 600, totalCost: 240, manDaysFormula: "qty * 0.4" },
        { id: id(), description: "Laborer", manDays: 0.2, wageRate: 450, totalCost: 90, manDaysFormula: "qty * 0.2" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "W3 - Aluminum Awning Window (0.50x1.00)", description: "W3- 0.50 m width x 1.00 m height White Powder Coated Aluminum Awning Window with 6 mm thk. One Way Reflective Bronze Tempered Glass with complete accessories", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Aluminum Awning Window (0.50x1.00m) with Tempered Glass", quantity: 1, unit: "set", unitCost: 4500, totalCost: 4500, quantityFormula: "qty * 1" },
        { id: id(), description: "Sealant & Accessories", quantity: 1, unit: "lot", unitCost: 200, totalCost: 200, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Aluminum Installer", manDays: 0.4, wageRate: 600, totalCost: 240, manDaysFormula: "qty * 0.4" },
        { id: id(), description: "Laborer", manDays: 0.2, wageRate: 450, totalCost: 90, manDaysFormula: "qty * 0.2" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "W4 - Aluminum Sliding Window (0.50x0.50)", description: "W4- 0.50 m width x 0.50 m height White Powder Coated Aluminum Sliding Window with 6 mm thk. One Way Reflective Bronze Tempered Glass with complete accessories", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Aluminum Sliding Window (0.50x0.50m) with Tempered Glass", quantity: 1, unit: "set", unitCost: 3500, totalCost: 3500, quantityFormula: "qty * 1" },
        { id: id(), description: "Sealant & Accessories", quantity: 1, unit: "lot", unitCost: 150, totalCost: 150, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Aluminum Installer", manDays: 0.3, wageRate: 600, totalCost: 180, manDaysFormula: "qty * 0.3" },
        { id: id(), description: "Laborer", manDays: 0.15, wageRate: 450, totalCost: 67.5, manDaysFormula: "qty * 0.15" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Fabrication & Installation of Lockers", description: "Fabrication and Installation of Lockers (3/4\" thk. Marine Plywood with wood edging, complete accessories, and paint finish)", unit: "unit", quantity: 1,
      materials: [
        { id: id(), description: "3/4\" Marine Plywood (4'x8')", quantity: 1.5, unit: "pc", unitCost: 1800, totalCost: 2700, quantityFormula: "qty * 1.5" },
        { id: id(), description: "Wood Edging & Trim", quantity: 1, unit: "lot", unitCost: 500, totalCost: 500, quantityFormula: "qty * 1" },
        { id: id(), description: "Hinges, Locks, Handles", quantity: 1, unit: "set", unitCost: 650, totalCost: 650, quantityFormula: "qty * 1" },
        { id: id(), description: "Paint & Finish", quantity: 1, unit: "lot", unitCost: 350, totalCost: 350, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Carpenter", manDays: 1.5, wageRate: 550, totalCost: 825, manDaysFormula: "qty * 1.5" },
        { id: id(), description: "Painter", manDays: 0.5, wageRate: 550, totalCost: 275, manDaysFormula: "qty * 0.5" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "18W LED Panel Light", description: "18W LED Square Surfaced Mounted Panel Light (Daylight)", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "18W LED Square Panel Light (Daylight)", quantity: 1, unit: "pc", unitCost: 650, totalCost: 650, quantityFormula: "qty * 1" },
        { id: id(), description: "Junction Box & Connector", quantity: 1, unit: "set", unitCost: 85, totalCost: 85, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Electrician", manDays: 0.15, wageRate: 600, totalCost: 90, manDaysFormula: "qty * 0.15" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "12W LED Panel Light", description: "12W LED Square Surfaced Mounted Panel Light (Daylight)", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "12W LED Square Panel Light (Daylight)", quantity: 1, unit: "pc", unitCost: 480, totalCost: 480, quantityFormula: "qty * 1" },
        { id: id(), description: "Junction Box & Connector", quantity: 1, unit: "set", unitCost: 85, totalCost: 85, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Electrician", manDays: 0.15, wageRate: 600, totalCost: 90, manDaysFormula: "qty * 0.15" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Duplex Convenience Outlet", description: "Duplex Universal Convenience Outlet with Ground", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Duplex Universal Outlet w/ Ground", quantity: 1, unit: "pc", unitCost: 280, totalCost: 280, quantityFormula: "qty * 1" },
        { id: id(), description: "Utility Box", quantity: 1, unit: "pc", unitCost: 35, totalCost: 35, quantityFormula: "qty * 1" },
        { id: id(), description: "Cover Plate", quantity: 1, unit: "pc", unitCost: 45, totalCost: 45, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Electrician", manDays: 0.12, wageRate: 600, totalCost: 72, manDaysFormula: "qty * 0.12" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "One-Gang Switch", description: "One-Gang Wide Series Switch", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "One-Gang Wide Series Switch", quantity: 1, unit: "pc", unitCost: 180, totalCost: 180, quantityFormula: "qty * 1" },
        { id: id(), description: "Utility Box", quantity: 1, unit: "pc", unitCost: 35, totalCost: 35, quantityFormula: "qty * 1" },
        { id: id(), description: "Cover Plate", quantity: 1, unit: "pc", unitCost: 45, totalCost: 45, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Electrician", manDays: 0.1, wageRate: 600, totalCost: 60, manDaysFormula: "qty * 0.1" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "4\" PVC Sanitary Pipe", description: "4\" Ø S1000 PVC Pipe", unit: "l.m.", quantity: 1,
      materials: [
        { id: id(), description: "4\" Ø S1000 PVC Pipe (3m)", quantity: 0.34, unit: "pc", unitCost: 850, totalCost: 289, quantityFormula: "qty * 0.34" },
        { id: id(), description: "PVC Solvent Cement", quantity: 0.02, unit: "can", unitCost: 350, totalCost: 7, quantityFormula: "qty * 0.02" },
      ],
      labor: [
        { id: id(), description: "Plumber", manDays: 0.05, wageRate: 600, totalCost: 30, manDaysFormula: "qty * 0.05" },
        { id: id(), description: "Laborer", manDays: 0.03, wageRate: 450, totalCost: 13.5, manDaysFormula: "qty * 0.03" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "2\" PVC Sanitary Pipe", description: "2\" Ø S1000 PVC Pipe", unit: "l.m.", quantity: 1,
      materials: [
        { id: id(), description: "2\" Ø S1000 PVC Pipe (3m)", quantity: 0.34, unit: "pc", unitCost: 420, totalCost: 142.8, quantityFormula: "qty * 0.34" },
        { id: id(), description: "PVC Solvent Cement", quantity: 0.02, unit: "can", unitCost: 350, totalCost: 7, quantityFormula: "qty * 0.02" },
      ],
      labor: [
        { id: id(), description: "Plumber", manDays: 0.04, wageRate: 600, totalCost: 24, manDaysFormula: "qty * 0.04" },
        { id: id(), description: "Laborer", manDays: 0.02, wageRate: 450, totalCost: 9, manDaysFormula: "qty * 0.02" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Water Closet (Dual Flush)", description: "Water Closet Dual Flush, push button type w/ heavy duty stainless Bidet Faucet and complete accessories", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Water Closet (Dual Flush 4/6L)", quantity: 1, unit: "set", unitCost: 8500, totalCost: 8500, quantityFormula: "qty * 1" },
        { id: id(), description: "Heavy Duty Stainless Bidet Faucet", quantity: 1, unit: "pc", unitCost: 1200, totalCost: 1200, quantityFormula: "qty * 1" },
        { id: id(), description: "Heavy Duty Soft Closing Seat & Cover", quantity: 1, unit: "set", unitCost: 1500, totalCost: 1500, quantityFormula: "qty * 1" },
        { id: id(), description: "Supply & Accessories", quantity: 1, unit: "lot", unitCost: 450, totalCost: 450, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Plumber", manDays: 0.5, wageRate: 600, totalCost: 300, manDaysFormula: "qty * 0.5" },
        { id: id(), description: "Laborer", manDays: 0.25, wageRate: 450, totalCost: 112.5, manDaysFormula: "qty * 0.25" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Wall Hung Lavatory", description: "Wall Hung Lavatory with manual shutoff single handle type faucet S304 stainless finish and complete accessories", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Wall Hung Lavatory", quantity: 1, unit: "set", unitCost: 3500, totalCost: 3500, quantityFormula: "qty * 1" },
        { id: id(), description: "Single Handle Faucet (S304 Stainless)", quantity: 1, unit: "pc", unitCost: 1800, totalCost: 1800, quantityFormula: "qty * 1" },
        { id: id(), description: "Bottle Trap, Valve & Accessories", quantity: 1, unit: "lot", unitCost: 650, totalCost: 650, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Plumber", manDays: 0.4, wageRate: 600, totalCost: 240, manDaysFormula: "qty * 0.4" },
        { id: id(), description: "Laborer", manDays: 0.2, wageRate: 450, totalCost: 90, manDaysFormula: "qty * 0.2" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Kitchen Sink with Cabinet", description: "1.50m x 0.60m Stainless Kitchen Sink with gooseneck faucet and complete accessories (including granite tiles, aluminum cabinet, structural & masonry works)", unit: "set", quantity: 1,
      materials: [
        { id: id(), description: "Stainless Kitchen Sink (61x48x20cm)", quantity: 1, unit: "set", unitCost: 5500, totalCost: 5500, quantityFormula: "qty * 1" },
        { id: id(), description: "Gooseneck Faucet", quantity: 1, unit: "pc", unitCost: 1500, totalCost: 1500, quantityFormula: "qty * 1" },
        { id: id(), description: "Granite Finish Porcelain Tiles", quantity: 2, unit: "sq.m.", unitCost: 500, totalCost: 1000, quantityFormula: "qty * 2" },
        { id: id(), description: "Aluminum Undercounter Cabinet Door", quantity: 1, unit: "set", unitCost: 3500, totalCost: 3500, quantityFormula: "qty * 1" },
        { id: id(), description: "Valve, Trap & Accessories", quantity: 1, unit: "lot", unitCost: 800, totalCost: 800, quantityFormula: "qty * 1" },
      ],
      labor: [
        { id: id(), description: "Plumber", manDays: 0.5, wageRate: 600, totalCost: 300, manDaysFormula: "qty * 0.5" },
        { id: id(), description: "Mason", manDays: 1, wageRate: 550, totalCost: 550, manDaysFormula: "qty * 1" },
        { id: id(), description: "Laborer", manDays: 0.5, wageRate: 450, totalCost: 225, manDaysFormula: "qty * 0.5" },
      ],
      equipment: [],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Septic Tank", description: "Septic Tank (Excavation, Concrete Works, CHB Wall, Waterproofing, Plastering, Manholes, Scaffolding, PVC Pipes)", unit: "lot", quantity: 1,
      materials: [
        { id: id(), description: "Portland Cement", quantity: 30, unit: "bag", unitCost: 280, totalCost: 8400, quantityFormula: "qty * 30" },
        { id: id(), description: "Sand", quantity: 2, unit: "cu.m.", unitCost: 1200, totalCost: 2400, quantityFormula: "qty * 2" },
        { id: id(), description: "Gravel", quantity: 2, unit: "cu.m.", unitCost: 1400, totalCost: 2800, quantityFormula: "qty * 2" },
        { id: id(), description: "4\" CHB", quantity: 150, unit: "pc", unitCost: 14, totalCost: 2100, quantityFormula: "qty * 150" },
        { id: id(), description: "10mm ∅ RSB", quantity: 80, unit: "kg", unitCost: 55, totalCost: 4400, quantityFormula: "qty * 80" },
        { id: id(), description: "Cementitious Waterproofing", quantity: 3, unit: "gal", unitCost: 1500, totalCost: 4500, quantityFormula: "qty * 3" },
        { id: id(), description: "Manhole Cover (S/S)", quantity: 2, unit: "pc", unitCost: 2500, totalCost: 5000, quantityFormula: "qty * 2" },
        { id: id(), description: "PVC Pipes & Fittings", quantity: 1, unit: "lot", unitCost: 3500, totalCost: 3500 },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 3, wageRate: 650, totalCost: 1950, manDaysFormula: "qty * 3" },
        { id: id(), description: "Mason", manDays: 8, wageRate: 550, totalCost: 4400, manDaysFormula: "qty * 8" },
        { id: id(), description: "Laborer", manDays: 12, wageRate: 450, totalCost: 5400, manDaysFormula: "qty * 12" },
      ],
      equipment: [
        { id: id(), description: "Concrete Mixer", period: 2, rate: 1500, totalCost: 3000, periodFormula: "qty * 2" },
      ],
      indirectCostPercent: 16, vatPercent: 12, createdAt: new Date().toISOString(),
    },
  ];
}

export function createSampleGeneralTemplates(dupaTemplates: DUPATemplate[]): GeneralCategoryTemplate[] {
  const find = (name: string) => dupaTemplates.find(t => t.name === name)?.id;

  return [
    {
      id: id(), name: "General Requirements", description: "Project general requirements",
      items: [
        { description: "Mobilization & Demobilization", unit: "lot", dupaTemplateId: find("Mobilization & Demobilization") },
        { description: "Construction Occupational Safety & Health", unit: "lot", dupaTemplateId: find("Construction Occupational Safety & Health") },
        { description: "Temporary Facilities, Billboard and Barricade", unit: "lot", dupaTemplateId: find("Temporary Facilities, Billboard and Barricade") },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Demolition, Hauling, Disposal and Repair Works", description: "Demolition, hauling, disposal and repair works",
      items: [
        { description: "Demolition/Removal of Existing Solar Battery, slab, railings, drywall and all affected area", unit: "lot", dupaTemplateId: find("Demolition/Removal of Existing Structures") },
        { description: "Hauling and Disposal of Debris and Scrap Materials from Affected Areas", unit: "cu.m.", dupaTemplateId: find("Hauling and Disposal of Debris") },
        { description: "Repair/Restoration of All Affected/Damaged Areas", unit: "lot", dupaTemplateId: find("Repair/Restoration of Affected Areas") },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Structural Works", description: "Structural works including footing, slab, columns and beams",
      items: [
        { description: "Column and Wall Footing", unit: "" },
        { description: "Excavation", unit: "cu.m.", dupaTemplateId: find("Excavation") },
        { description: "Concrete 3000 psi", unit: "cu.m.", dupaTemplateId: find("Concrete 3000 psi") },
        { description: "Reinforcement", unit: "" },
        { description: "Reinforcing Steel Bar (Grade 33) including #16 GI tie wire", unit: "kg", dupaTemplateId: find("Reinforcing Steel Bar (Grade 33)") },
        { description: "Gravel Bedding", unit: "cu.m.", dupaTemplateId: find("Gravel Bedding") },
        { description: "Soil Backfilling with Compaction", unit: "cu.m.", dupaTemplateId: find("Soil Backfilling with Compaction") },
        { description: "Slab on Grade", unit: "" },
        { description: "Concrete 3000 psi", unit: "cu.m.", dupaTemplateId: find("Slab on Grade - Concrete 3000 psi") },
        { description: "Reinforcing Steel Bar (Grade 33) including #16 GI tie wire", unit: "kg", dupaTemplateId: find("Reinforcing Steel Bar (Grade 33)") },
        { description: "Column, Lintel Beam, and Roof Beam", unit: "" },
        { description: "Concrete 3000 psi", unit: "cu.m.", dupaTemplateId: find("Concrete 3000 psi") },
        { description: "Reinforcing Steel Bar (Grade 33) including #16 GI tie wire", unit: "kg", dupaTemplateId: find("Reinforcing Steel Bar (Grade 33)") },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Architectural Works", description: "Masonry, roofing, ceiling, painting, floor, doors, windows, furnishings",
      items: [
        { description: "Masonry Works", unit: "" },
        { description: "4\" CHB Wall System (including tie wire, mortar and 10mm ∅ steel reinforcement)", unit: "sq.m.", dupaTemplateId: find("4\" CHB Wall System") },
        { description: "Cement Plastering of Interior and Exterior", unit: "sq.m.", dupaTemplateId: find("Cement Plastering") },
        { description: "Roofing Materials", unit: "" },
        { description: "0.50mm thk Prepainted Longspan Rib Type Roofing", unit: "sq.m.", dupaTemplateId: find("Prepainted Longspan Roofing") },
        { description: "0.50mm thk. Prepainted G.I Sheet Flashing", unit: "l.m.", dupaTemplateId: find("GI Sheet Flashing") },
        { description: "Roof Framing System", unit: "sq.m.", dupaTemplateId: find("Roof Framing System") },
        { description: "Ceiling Works", unit: "" },
        { description: "4.50 mm thk. Fiber Cement Board Ceiling on Framing System", unit: "sq.m.", dupaTemplateId: find("Fiber Cement Board Ceiling") },
        { description: "0.5mm thk. Pre-Painted Spandrel on Framing System", unit: "sq.m.", dupaTemplateId: find("Pre-Painted Spandrel Ceiling") },
        { description: "Painting", unit: "" },
        { description: "Semi-Gloss Latex Paint Finish on Interior and Exterior Wall", unit: "sq.m.", dupaTemplateId: find("Semi-Gloss Latex Paint (Wall)") },
        { description: "Flat Latex Paint Finish on Ceiling", unit: "sq.m.", dupaTemplateId: find("Flat Latex Paint (Ceiling)") },
        { description: "Floor Finish", unit: "" },
        { description: "0.60 m x 0.60 m Porcelain Floor Tiles (Glazed)", unit: "sq.m.", dupaTemplateId: find("Porcelain Floor Tiles (Glazed)") },
        { description: "0.60 m x 0.60 m Porcelain Floor Tiles (Non-Skid)", unit: "sq.m.", dupaTemplateId: find("Porcelain Floor Tiles (Non-Skid)") },
        { description: "0.30 m x 0.60 m Porcelain Wall Tiles", unit: "sq.m.", dupaTemplateId: find("Porcelain Wall Tiles") },
        { description: "Door and Window", unit: "" },
        { description: "D1- 0.80m x 2.10m Tanguile Single Swing Panel Door", unit: "set", dupaTemplateId: find("D1 - Single Swing Panel Door") },
        { description: "D2- 0.60m x 2.10m Tanguile Single Swing Panel Door with Louver", unit: "set", dupaTemplateId: find("D2 - Single Swing Panel Door with Louver") },
        { description: "W1- 1.50m x 0.50m Aluminum Awning Window", unit: "set", dupaTemplateId: find("W1 - Aluminum Awning Window (1.50x0.50)") },
        { description: "W2- 1.00m x 0.50m Aluminum Awning Window", unit: "set", dupaTemplateId: find("W2 - Aluminum Awning Window (1.00x0.50)") },
        { description: "W3- 0.50m x 1.00m Aluminum Awning Window", unit: "set", dupaTemplateId: find("W3 - Aluminum Awning Window (0.50x1.00)") },
        { description: "W4- 0.50m x 0.50m Aluminum Sliding Window", unit: "set", dupaTemplateId: find("W4 - Aluminum Sliding Window (0.50x0.50)") },
        { description: "Furnishings", unit: "" },
        { description: "Fabrication and Installation of Lockers", unit: "unit", dupaTemplateId: find("Fabrication & Installation of Lockers") },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Electrical Works", description: "Lighting and power outlet system",
      items: [
        { description: "Lighting and Power Outlet System", unit: "" },
        { description: "18W LED Square Surfaced Mounted Panel Light (Daylight)", unit: "set", dupaTemplateId: find("18W LED Panel Light") },
        { description: "12W LED Square Surfaced Mounted Panel Light (Daylight)", unit: "set", dupaTemplateId: find("12W LED Panel Light") },
        { description: "3W Ceiling Mounted Emergency Light", unit: "set" },
        { description: "16'' Orbit Fan 4-Speed Controller", unit: "set" },
        { description: "One-Gang Wide Series Switch", unit: "set", dupaTemplateId: find("One-Gang Switch") },
        { description: "Duplex Universal Convenience Outlet with Ground", unit: "set", dupaTemplateId: find("Duplex Convenience Outlet") },
        { description: "1/2'' PVC Conduit", unit: "l.m." },
        { description: "1/2'' Ø PVC Flexible Conduit (50m/roll)", unit: "roll" },
        { description: "1/2''x8' PVC Mouldings", unit: "pc" },
        { description: "1-1/2''x8' PVC Mouldings", unit: "pc" },
        { description: "3.5 mm² Cu. THHN/THWN (STR)", unit: "m" },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: id(), name: "Plumbing Works", description: "Sanitary waste pipes, cold water supply, fixtures, septic tank",
      items: [
        { description: "Sanitary Waste Pipes, Traps and Fittings", unit: "" },
        { description: "4\" Ø S1000 PVC Pipe", unit: "l.m.", dupaTemplateId: find("4\" PVC Sanitary Pipe") },
        { description: "2\" Ø S1000 PVC Pipe", unit: "l.m.", dupaTemplateId: find("2\" PVC Sanitary Pipe") },
        { description: "4\" Ø Cleanout with Brass Cover", unit: "set" },
        { description: "4\" Ø Cleanout with PVC Cover", unit: "set" },
        { description: "2\" Ø Cleanout with PVC Cover", unit: "set" },
        { description: "2\" Floor Drain P-trap Assembly", unit: "set" },
        { description: "Assorted PVC Pipe Fittings", unit: "lot" },
        { description: "Cold Water Supply System", unit: "" },
        { description: "20 mm Ø PPR Pipe PN20", unit: "l.m." },
        { description: "Assorted Fittings (elbow, tee, adaptor, cap, coupling, etc.)", unit: "lot" },
        { description: "Plumbing Fixtures and Plumbing Accessories", unit: "" },
        { description: "Water Closet Dual Flush with complete accessories", unit: "set", dupaTemplateId: find("Water Closet (Dual Flush)") },
        { description: "Wall Hung Lavatory with faucet and complete accessories", unit: "set", dupaTemplateId: find("Wall Hung Lavatory") },
        { description: "Heavy Duty Stainless S304 Tissue Holder", unit: "pc" },
        { description: "100 mm x 100 mm Stainless Floor Drain", unit: "pc" },
        { description: "Kitchen Sink with gooseneck faucet and complete accessories", unit: "set", dupaTemplateId: find("Kitchen Sink with Cabinet") },
        { description: "Septic Tank", unit: "" },
        { description: "Septic Tank (complete works)", unit: "lot", dupaTemplateId: find("Septic Tank") },
      ],
      createdAt: new Date().toISOString(),
    },
  ];
}
