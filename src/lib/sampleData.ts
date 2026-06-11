import { Project, ABCItem, DUPAItem, PriceListYear, PriceListCategory, PriceListItem } from "@/types";
import { recalcDupa, recalcABCItem, syncDupaToABC } from "./calculations";

function id() { return crypto.randomUUID(); }

export function createSampleProject(): Project {
  const settings = { ocmPercent: 8, profitPercent: 8, vatPercent: 12, dupaIndirectCostPercent: 16, dupaVatPercent: 12 };
  const ocmPercent = settings.ocmPercent;
  const profitPercent = settings.profitPercent;
  const vatPercent = settings.vatPercent;

  const cat1Id = id(), cat2Id = id(), cat3Id = id();
  const item11Id = id(), item12Id = id();
  const item21Id = id(), item22Id = id();
  const item31Id = id(), item32Id = id(), item33Id = id();

  const abcItems: ABCItem[] = [
    { id: cat1Id, itemNo: "1", description: "General Requirements", quantity: 0, unit: "", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: true, parentId: null, children: [item11Id, item12Id], hasDupa: false, order: 0 },
    { id: item11Id, itemNo: "1.1", description: "Mobilization / Demobilization", quantity: 1, unit: "lot", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat1Id, children: [], hasDupa: true, order: 1 },
    { id: item12Id, itemNo: "1.2", description: "Permits and Clearances", quantity: 1, unit: "lot", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat1Id, children: [], hasDupa: true, order: 2 },
    { id: cat2Id, itemNo: "2", description: "Earthworks", quantity: 0, unit: "", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: true, parentId: null, children: [item21Id, item22Id], hasDupa: false, order: 3 },
    { id: item21Id, itemNo: "2.1", description: "Excavation", quantity: 120, unit: "cu.m.", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat2Id, children: [], hasDupa: true, order: 4 },
    { id: item22Id, itemNo: "2.2", description: "Backfilling", quantity: 80, unit: "cu.m.", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat2Id, children: [], hasDupa: true, order: 5 },
    { id: cat3Id, itemNo: "3", description: "Structural Works", quantity: 0, unit: "", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: true, parentId: null, children: [item31Id, item32Id, item33Id], hasDupa: false, order: 6 },
    { id: item31Id, itemNo: "3.1", description: "Column and Wall Footing", quantity: 15, unit: "cu.m.", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat3Id, children: [], hasDupa: true, order: 7 },
    { id: item32Id, itemNo: "3.2", description: "Columns", quantity: 8, unit: "cu.m.", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat3Id, children: [], hasDupa: true, order: 8 },
    { id: item33Id, itemNo: "3.3", description: "Beams", quantity: 12, unit: "cu.m.", materialsCost: 0, laborEquipmentCost: 0, estimatedDirectCost: 0, ocmPercent, profitPercent, totalMarkupPercent: 0, markupValue: 0, vatPercent, vatCost: 0, totalIndirectCost: 0, totalCost: 0, unitCost: 0, isCategory: false, parentId: cat3Id, children: [], hasDupa: true, order: 9 },
  ];

  const dupaItems: DUPAItem[] = [
    recalcDupa({
      id: id(), abcItemId: item11Id, itemNo: "1.1", description: "Mobilization / Demobilization", quantity: 1, unit: "lot",
      materials: [
        { id: id(), description: "Safety Equipment (PPE)", quantity: 10, unit: "set", unitCost: 1500, totalCost: 0 },
        { id: id(), description: "Temporary Facilities", quantity: 1, unit: "lot", unitCost: 25000, totalCost: 0 },
        { id: id(), description: "Warning Signs & Barricades", quantity: 1, unit: "lot", unitCost: 8000, totalCost: 0 },
        { id: id(), description: "Tool Box & Hand Tools", quantity: 2, unit: "set", unitCost: 5500, totalCost: 0 },
        { id: id(), description: "First Aid Kit", quantity: 2, unit: "set", unitCost: 2500, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 5, wageRate: 800, totalCost: 0 },
        { id: id(), description: "Skilled Worker", manDays: 8, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Laborer", manDays: 10, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Flagman", manDays: 5, wageRate: 450, totalCost: 0 },
        { id: id(), description: "Watchman", manDays: 15, wageRate: 450, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Truck (6-wheeler)", period: 2, rate: 5000, totalCost: 0 },
        { id: id(), description: "Service Vehicle (Pickup)", period: 3, rate: 3500, totalCost: 0 },
        { id: id(), description: "Generator Set", period: 5, rate: 2000, totalCost: 0 },
        { id: id(), description: "Water Pump", period: 3, rate: 1200, totalCost: 0 },
        { id: id(), description: "Welding Machine", period: 2, rate: 1800, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
    recalcDupa({
      id: id(), abcItemId: item12Id, itemNo: "1.2", description: "Permits and Clearances", quantity: 1, unit: "lot",
      materials: [
        { id: id(), description: "Building Permit Fees", quantity: 1, unit: "lot", unitCost: 35000, totalCost: 0 },
        { id: id(), description: "Barangay Clearance", quantity: 1, unit: "lot", unitCost: 2000, totalCost: 0 },
        { id: id(), description: "Fire Safety Inspection Fee", quantity: 1, unit: "lot", unitCost: 5000, totalCost: 0 },
        { id: id(), description: "Electrical Permit", quantity: 1, unit: "lot", unitCost: 3500, totalCost: 0 },
        { id: id(), description: "Plumbing/Sanitary Permit", quantity: 1, unit: "lot", unitCost: 3000, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Liaison Officer", manDays: 10, wageRate: 600, totalCost: 0 },
        { id: id(), description: "Project Engineer", manDays: 3, wageRate: 1200, totalCost: 0 },
        { id: id(), description: "Draftsman/CAD Operator", manDays: 5, wageRate: 800, totalCost: 0 },
        { id: id(), description: "Administrative Staff", manDays: 5, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Messenger", manDays: 8, wageRate: 400, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Printing/Plotting Services", period: 1, rate: 5000, totalCost: 0 },
        { id: id(), description: "Computer/Laptop Rental", period: 5, rate: 500, totalCost: 0 },
        { id: id(), description: "Surveying Instruments", period: 2, rate: 3000, totalCost: 0 },
        { id: id(), description: "Digital Camera", period: 3, rate: 300, totalCost: 0 },
        { id: id(), description: "Transportation Allowance", period: 10, rate: 500, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
    recalcDupa({
      id: id(), abcItemId: item21Id, itemNo: "2.1", description: "Excavation", quantity: 120, unit: "cu.m.",
      materials: [
        { id: id(), description: "Dewatering Materials", quantity: 1, unit: "lot", unitCost: 5000, totalCost: 0 },
        { id: id(), description: "Shoring Lumber", quantity: 30, unit: "bd.ft.", unitCost: 45, totalCost: 0 },
        { id: id(), description: "Polyethylene Sheet", quantity: 5, unit: "roll", unitCost: 850, totalCost: 0 },
        { id: id(), description: "Steel Sheet Piles", quantity: 10, unit: "pcs", unitCost: 2500, totalCost: 0 },
        { id: id(), description: "Gravel Bedding", quantity: 8, unit: "cu.m.", unitCost: 1200, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 10, wageRate: 800, totalCost: 0 },
        { id: id(), description: "Skilled Worker", manDays: 15, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Laborer", manDays: 30, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Backhoe Operator", manDays: 5, wageRate: 900, totalCost: 0 },
        { id: id(), description: "Dump Truck Driver", manDays: 5, wageRate: 700, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Backhoe (0.8 cu.m.)", period: 5, rate: 8000, totalCost: 0 },
        { id: id(), description: "Dump Truck (10-wheeler)", period: 5, rate: 6000, totalCost: 0 },
        { id: id(), description: "Water Pump (3\" dia.)", period: 5, rate: 1200, totalCost: 0 },
        { id: id(), description: "Compressor", period: 3, rate: 2500, totalCost: 0 },
        { id: id(), description: "Transit/Level", period: 5, rate: 800, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
    recalcDupa({
      id: id(), abcItemId: item22Id, itemNo: "2.2", description: "Backfilling", quantity: 80, unit: "cu.m.",
      materials: [
        { id: id(), description: "Gravel (Class A)", quantity: 85, unit: "cu.m.", unitCost: 1200, totalCost: 0 },
        { id: id(), description: "Sand (Washed)", quantity: 20, unit: "cu.m.", unitCost: 1000, totalCost: 0 },
        { id: id(), description: "Boulders (Rip-rap)", quantity: 10, unit: "cu.m.", unitCost: 800, totalCost: 0 },
        { id: id(), description: "Geotextile Fabric", quantity: 50, unit: "sq.m.", unitCost: 120, totalCost: 0 },
        { id: id(), description: "Water for Compaction", quantity: 5, unit: "cu.m.", unitCost: 200, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Foreman", manDays: 6, wageRate: 800, totalCost: 0 },
        { id: id(), description: "Skilled Worker", manDays: 10, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Laborer", manDays: 16, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Grader Operator", manDays: 3, wageRate: 900, totalCost: 0 },
        { id: id(), description: "Roller Operator", manDays: 4, wageRate: 900, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Plate Compactor", period: 4, rate: 3000, totalCost: 0 },
        { id: id(), description: "Dump Truck (6-wheeler)", period: 4, rate: 5000, totalCost: 0 },
        { id: id(), description: "Road Roller (Vibratory)", period: 3, rate: 5500, totalCost: 0 },
        { id: id(), description: "Water Truck", period: 3, rate: 4000, totalCost: 0 },
        { id: id(), description: "Payloader", period: 2, rate: 6000, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
    recalcDupa({
      id: id(), abcItemId: item31Id, itemNo: "3.1", description: "Column and Wall Footing", quantity: 15, unit: "cu.m.",
      materials: [
        { id: id(), description: "Portland Cement (Type I)", quantity: 135, unit: "bag", unitCost: 280, totalCost: 0 },
        { id: id(), description: "Washed Sand", quantity: 11, unit: "cu.m.", unitCost: 1400, totalCost: 0 },
        { id: id(), description: "Gravel (3/4\")", quantity: 16, unit: "cu.m.", unitCost: 1500, totalCost: 0 },
        { id: id(), description: "RSB 16mm x 6m", quantity: 120, unit: "pcs", unitCost: 385, totalCost: 0 },
        { id: id(), description: "RSB 10mm x 6m (Ties)", quantity: 80, unit: "pcs", unitCost: 155, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Mason", manDays: 20, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Carpenter", manDays: 15, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Steel Man", manDays: 18, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Laborer", manDays: 40, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Foreman", manDays: 10, wageRate: 800, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Concrete Mixer (1 bagger)", period: 8, rate: 2500, totalCost: 0 },
        { id: id(), description: "Concrete Vibrator", period: 5, rate: 1500, totalCost: 0 },
        { id: id(), description: "Bar Cutter", period: 4, rate: 1000, totalCost: 0 },
        { id: id(), description: "Bar Bender", period: 4, rate: 1000, totalCost: 0 },
        { id: id(), description: "Welding Machine", period: 3, rate: 1800, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
    recalcDupa({
      id: id(), abcItemId: item32Id, itemNo: "3.2", description: "Columns", quantity: 8, unit: "cu.m.",
      materials: [
        { id: id(), description: "Portland Cement (Type I)", quantity: 72, unit: "bag", unitCost: 280, totalCost: 0 },
        { id: id(), description: "Washed Sand", quantity: 6, unit: "cu.m.", unitCost: 1400, totalCost: 0 },
        { id: id(), description: "Gravel (3/4\")", quantity: 9, unit: "cu.m.", unitCost: 1500, totalCost: 0 },
        { id: id(), description: "RSB 16mm x 6m", quantity: 64, unit: "pcs", unitCost: 385, totalCost: 0 },
        { id: id(), description: "Plywood 4'x8' (Formworks)", quantity: 16, unit: "pcs", unitCost: 650, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Mason", manDays: 12, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Carpenter", manDays: 10, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Steel Man", manDays: 10, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Laborer", manDays: 24, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Foreman", manDays: 6, wageRate: 800, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Concrete Mixer (1 bagger)", period: 4, rate: 2500, totalCost: 0 },
        { id: id(), description: "Concrete Vibrator", period: 3, rate: 1500, totalCost: 0 },
        { id: id(), description: "Bar Cutter", period: 3, rate: 1000, totalCost: 0 },
        { id: id(), description: "Scaffolding Set", period: 6, rate: 800, totalCost: 0 },
        { id: id(), description: "Circular Saw", period: 3, rate: 600, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
    recalcDupa({
      id: id(), abcItemId: item33Id, itemNo: "3.3", description: "Beams", quantity: 12, unit: "cu.m.",
      materials: [
        { id: id(), description: "Portland Cement (Type I)", quantity: 108, unit: "bag", unitCost: 280, totalCost: 0 },
        { id: id(), description: "Washed Sand", quantity: 9, unit: "cu.m.", unitCost: 1400, totalCost: 0 },
        { id: id(), description: "Gravel (3/4\")", quantity: 13, unit: "cu.m.", unitCost: 1500, totalCost: 0 },
        { id: id(), description: "RSB 20mm x 6m", quantity: 96, unit: "pcs", unitCost: 600, totalCost: 0 },
        { id: id(), description: "Plywood 4'x8' (Formworks)", quantity: 30, unit: "pcs", unitCost: 650, totalCost: 0 },
      ],
      labor: [
        { id: id(), description: "Mason", manDays: 18, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Carpenter", manDays: 16, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Steel Man", manDays: 14, wageRate: 700, totalCost: 0 },
        { id: id(), description: "Laborer", manDays: 36, wageRate: 500, totalCost: 0 },
        { id: id(), description: "Foreman", manDays: 8, wageRate: 800, totalCost: 0 },
      ],
      equipment: [
        { id: id(), description: "Concrete Mixer (1 bagger)", period: 6, rate: 2500, totalCost: 0 },
        { id: id(), description: "Concrete Vibrator", period: 4, rate: 1500, totalCost: 0 },
        { id: id(), description: "Bar Cutter", period: 4, rate: 1000, totalCost: 0 },
        { id: id(), description: "Scaffolding Set", period: 8, rate: 800, totalCost: 0 },
        { id: id(), description: "Crane (5-ton)", period: 2, rate: 12000, totalCost: 0 },
      ],
      totalMaterials: 0, totalLabor: 0, totalEquipment: 0, totalDirectCost: 0,
      indirectCostPercent: ocmPercent + profitPercent, indirectCost: 0, totalDirectAndIndirect: 0,
      vatPercent, vat: 0, totalPrice: 0, unitPrice: 0,
    }),
  ];

  const syncedAbc = syncDupaToABC(abcItems, dupaItems);

  const project: Project = {
    id: crypto.randomUUID(),
    name: "Sample: Two-Storey Residential Building",
    description: "Demo project with structural works, earthworks, and general requirements",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    abcItems: syncedAbc,
    dupaItems,
    settings,
    versions: [],
  };

  return project;
}

export function createDefaultPriceList(): PriceListYear {
  const catCement = id(), catSteel = id(), catLumber = id(), catAggregates = id();
  const catElectrical = id(), catPlumbing = id(), catPainting = id(), catTiles = id();
  const catRoofing = id(), catLabor = id(), catEquipment = id();

  const categories: PriceListCategory[] = [
    { id: catCement, name: "Cement & Concrete", order: 0 },
    { id: catSteel, name: "Steel & Reinforcement", order: 1 },
    { id: catLumber, name: "Lumber & Formworks", order: 2 },
    { id: catAggregates, name: "Aggregates & Fill Materials", order: 3 },
    { id: catElectrical, name: "Electrical", order: 4 },
    { id: catPlumbing, name: "Plumbing & Sanitary", order: 5 },
    { id: catPainting, name: "Painting & Finishing", order: 6 },
    { id: catTiles, name: "Tiles & Flooring", order: 7 },
    { id: catRoofing, name: "Roofing & Waterproofing", order: 8 },
    { id: catLabor, name: "Labor Rates", order: 9 },
    { id: catEquipment, name: "Equipment Rental", order: 10 },
  ];

  const items: PriceListItem[] = [
    
    { id: id(), description: "Portland Cement Type I", extraDesc1: "40kg/bag", extraDesc2: "", unit: "bag", marketPrice: 280, markupPrice: 310, categoryId: catCement },
    { id: id(), description: "Portland Cement Type IP", extraDesc1: "40kg/bag, Pozzolan", extraDesc2: "", unit: "bag", marketPrice: 265, markupPrice: 295, categoryId: catCement },
    { id: id(), description: "Ready-Mix Concrete", extraDesc1: "3000 PSI", extraDesc2: "Delivered", unit: "cu.m.", marketPrice: 5800, markupPrice: 6380, categoryId: catCement },
    { id: id(), description: "Ready-Mix Concrete", extraDesc1: "4000 PSI", extraDesc2: "Delivered", unit: "cu.m.", marketPrice: 6200, markupPrice: 6820, categoryId: catCement },
    { id: id(), description: "Concrete Hollow Block", extraDesc1: "4\" CHB", extraDesc2: "", unit: "pcs", marketPrice: 14, markupPrice: 16, categoryId: catCement },
    { id: id(), description: "Concrete Hollow Block", extraDesc1: "6\" CHB", extraDesc2: "", unit: "pcs", marketPrice: 18, markupPrice: 21, categoryId: catCement },
    
    { id: id(), description: "RSB 10mm x 6m", extraDesc1: "Grade 40", extraDesc2: "", unit: "pcs", marketPrice: 155, markupPrice: 175, categoryId: catSteel },
    { id: id(), description: "RSB 12mm x 6m", extraDesc1: "Grade 40", extraDesc2: "", unit: "pcs", marketPrice: 225, markupPrice: 250, categoryId: catSteel },
    { id: id(), description: "RSB 16mm x 6m", extraDesc1: "Grade 40", extraDesc2: "", unit: "pcs", marketPrice: 385, markupPrice: 425, categoryId: catSteel },
    { id: id(), description: "RSB 20mm x 6m", extraDesc1: "Grade 60", extraDesc2: "", unit: "pcs", marketPrice: 600, markupPrice: 660, categoryId: catSteel },
    { id: id(), description: "RSB 25mm x 6m", extraDesc1: "Grade 60", extraDesc2: "", unit: "pcs", marketPrice: 950, markupPrice: 1050, categoryId: catSteel },
    { id: id(), description: "#16 Tie Wire", extraDesc1: "GI", extraDesc2: "", unit: "kg", marketPrice: 85, markupPrice: 95, categoryId: catSteel },
    { id: id(), description: "Welding Rod E6013", extraDesc1: "3.2mm", extraDesc2: "", unit: "kg", marketPrice: 120, markupPrice: 135, categoryId: catSteel },
    
    { id: id(), description: "Coco Lumber", extraDesc1: "2\"x2\"x8'", extraDesc2: "", unit: "pcs", marketPrice: 55, markupPrice: 65, categoryId: catLumber },
    { id: id(), description: "Coco Lumber", extraDesc1: "2\"x3\"x8'", extraDesc2: "", unit: "pcs", marketPrice: 75, markupPrice: 85, categoryId: catLumber },
    { id: id(), description: "Good Lumber", extraDesc1: "2\"x2\"x10'", extraDesc2: "Kiln-dried", unit: "bd.ft.", marketPrice: 45, markupPrice: 52, categoryId: catLumber },
    { id: id(), description: "Ordinary Plywood", extraDesc1: "4'x8'x1/4\"", extraDesc2: "", unit: "pcs", marketPrice: 450, markupPrice: 500, categoryId: catLumber },
    { id: id(), description: "Marine Plywood", extraDesc1: "4'x8'x3/4\"", extraDesc2: "", unit: "pcs", marketPrice: 1100, markupPrice: 1220, categoryId: catLumber },
    { id: id(), description: "Phenolic Board", extraDesc1: "4'x8'x12mm", extraDesc2: "Brown", unit: "pcs", marketPrice: 650, markupPrice: 720, categoryId: catLumber },
    { id: id(), description: "CWN (Assorted)", extraDesc1: "1\"-4\"", extraDesc2: "", unit: "kg", marketPrice: 75, markupPrice: 85, categoryId: catLumber },
    
    { id: id(), description: "Washed Sand", extraDesc1: "Fine", extraDesc2: "", unit: "cu.m.", marketPrice: 1000, markupPrice: 1150, categoryId: catAggregates },
    { id: id(), description: "Washed Gravel", extraDesc1: "3/4\"", extraDesc2: "", unit: "cu.m.", marketPrice: 1500, markupPrice: 1700, categoryId: catAggregates },
    { id: id(), description: "Washed Gravel", extraDesc1: "1\"", extraDesc2: "", unit: "cu.m.", marketPrice: 1400, markupPrice: 1580, categoryId: catAggregates },
    { id: id(), description: "Item 201 (Base Course)", extraDesc1: "", extraDesc2: "", unit: "cu.m.", marketPrice: 1200, markupPrice: 1350, categoryId: catAggregates },
    { id: id(), description: "Item 200 (Sub-base)", extraDesc1: "", extraDesc2: "", unit: "cu.m.", marketPrice: 900, markupPrice: 1020, categoryId: catAggregates },
    { id: id(), description: "Adobe/Boulders", extraDesc1: "Rip-rap", extraDesc2: "", unit: "cu.m.", marketPrice: 800, markupPrice: 900, categoryId: catAggregates },
    // Electrical
    { id: id(), description: "THHN Wire #12", extraDesc1: "Stranded, 75m", extraDesc2: "", unit: "roll", marketPrice: 3200, markupPrice: 3520, categoryId: catElectrical },
    { id: id(), description: "THHN Wire #14", extraDesc1: "Stranded, 75m", extraDesc2: "", unit: "roll", marketPrice: 2200, markupPrice: 2420, categoryId: catElectrical },
    { id: id(), description: "PVC Conduit 1/2\"", extraDesc1: "Orange, 3m", extraDesc2: "", unit: "pcs", marketPrice: 45, markupPrice: 52, categoryId: catElectrical },
    { id: id(), description: "PVC Conduit 3/4\"", extraDesc1: "Orange, 3m", extraDesc2: "", unit: "pcs", marketPrice: 65, markupPrice: 75, categoryId: catElectrical },
    { id: id(), description: "Outlet Box (PVC)", extraDesc1: "Junction Box", extraDesc2: "", unit: "pcs", marketPrice: 25, markupPrice: 30, categoryId: catElectrical },
    { id: id(), description: "Panel Board", extraDesc1: "4 branches", extraDesc2: "", unit: "set", marketPrice: 2800, markupPrice: 3100, categoryId: catElectrical },
    { id: id(), description: "LED Bulb 12W", extraDesc1: "Daylight", extraDesc2: "", unit: "pcs", marketPrice: 150, markupPrice: 175, categoryId: catElectrical },
    
    { id: id(), description: "PVC Pipe S-1000", extraDesc1: "4\" dia x 3m", extraDesc2: "", unit: "pcs", marketPrice: 380, markupPrice: 420, categoryId: catPlumbing },
    { id: id(), description: "PVC Pipe S-1000", extraDesc1: "3\" dia x 3m", extraDesc2: "", unit: "pcs", marketPrice: 260, markupPrice: 290, categoryId: catPlumbing },
    { id: id(), description: "PVC Pipe S-1000", extraDesc1: "2\" dia x 3m", extraDesc2: "", unit: "pcs", marketPrice: 145, markupPrice: 165, categoryId: catPlumbing },
    { id: id(), description: "PPR Pipe (Hot)", extraDesc1: "1/2\" x 4m", extraDesc2: "", unit: "pcs", marketPrice: 180, markupPrice: 200, categoryId: catPlumbing },
    { id: id(), description: "Water Closet (Toilet)", extraDesc1: "Standard, Dual flush", extraDesc2: "", unit: "set", marketPrice: 4500, markupPrice: 5000, categoryId: catPlumbing },
    { id: id(), description: "Lavatory (Pedestal)", extraDesc1: "White", extraDesc2: "", unit: "set", marketPrice: 3200, markupPrice: 3550, categoryId: catPlumbing },
    { id: id(), description: "Kitchen Sink (SS)", extraDesc1: "Single bowl", extraDesc2: "", unit: "set", marketPrice: 2800, markupPrice: 3100, categoryId: catPlumbing },
    
    { id: id(), description: "Latex Paint (Flat)", extraDesc1: "4 Liters", extraDesc2: "", unit: "can", marketPrice: 850, markupPrice: 940, categoryId: catPainting },
    { id: id(), description: "Latex Paint (Semi-Gloss)", extraDesc1: "4 Liters", extraDesc2: "", unit: "can", marketPrice: 1050, markupPrice: 1160, categoryId: catPainting },
    { id: id(), description: "Enamel Paint (QDE)", extraDesc1: "4 Liters", extraDesc2: "", unit: "can", marketPrice: 1200, markupPrice: 1320, categoryId: catPainting },
    { id: id(), description: "Concrete Neutralizer", extraDesc1: "4 Liters", extraDesc2: "", unit: "can", marketPrice: 350, markupPrice: 390, categoryId: catPainting },
    { id: id(), description: "Primer/Undercoat", extraDesc1: "4 Liters", extraDesc2: "", unit: "can", marketPrice: 650, markupPrice: 720, categoryId: catPainting },
    { id: id(), description: "Putty/Skimcoat", extraDesc1: "25kg/bag", extraDesc2: "", unit: "bag", marketPrice: 550, markupPrice: 610, categoryId: catPainting },
    
    { id: id(), description: "Ceramic Floor Tile", extraDesc1: "30x30cm", extraDesc2: "Standard", unit: "sq.m.", marketPrice: 250, markupPrice: 280, categoryId: catTiles },
    { id: id(), description: "Ceramic Wall Tile", extraDesc1: "20x30cm", extraDesc2: "Glossy", unit: "sq.m.", marketPrice: 280, markupPrice: 310, categoryId: catTiles },
    { id: id(), description: "Porcelain Tile", extraDesc1: "60x60cm", extraDesc2: "Polished", unit: "sq.m.", marketPrice: 650, markupPrice: 720, categoryId: catTiles },
    { id: id(), description: "Granite Tile", extraDesc1: "60x60cm", extraDesc2: "Natural", unit: "sq.m.", marketPrice: 1200, markupPrice: 1350, categoryId: catTiles },
    { id: id(), description: "Tile Adhesive", extraDesc1: "25kg/bag", extraDesc2: "", unit: "bag", marketPrice: 350, markupPrice: 390, categoryId: catTiles },
    { id: id(), description: "Tile Grout", extraDesc1: "2kg/bag", extraDesc2: "White", unit: "bag", marketPrice: 85, markupPrice: 95, categoryId: catTiles },
    
    { id: id(), description: "Pre-painted Rib-type", extraDesc1: "GA 26, 0.40mm", extraDesc2: "per ln.m.", unit: "ln.m.", marketPrice: 250, markupPrice: 280, categoryId: catRoofing },
    { id: id(), description: "Pre-painted Long-span", extraDesc1: "GA 26, 0.40mm", extraDesc2: "per ln.m.", unit: "ln.m.", marketPrice: 270, markupPrice: 300, categoryId: catRoofing },
    { id: id(), description: "Ridge Roll (Pre-painted)", extraDesc1: "GA 26", extraDesc2: "", unit: "ln.m.", marketPrice: 180, markupPrice: 200, categoryId: catRoofing },
    { id: id(), description: "Gutter (Pre-painted)", extraDesc1: "GA 26", extraDesc2: "", unit: "ln.m.", marketPrice: 200, markupPrice: 225, categoryId: catRoofing },
    { id: id(), description: "Tekscrew", extraDesc1: "2-1/2\"", extraDesc2: "w/ washer", unit: "pcs", marketPrice: 6, markupPrice: 8, categoryId: catRoofing },
    { id: id(), description: "Waterproofing Membrane", extraDesc1: "Elastomeric", extraDesc2: "4 Liters", unit: "can", marketPrice: 1500, markupPrice: 1680, categoryId: catRoofing },
    
    { id: id(), description: "Foreman", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 800, markupPrice: 880, categoryId: catLabor },
    { id: id(), description: "Mason", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 700, markupPrice: 770, categoryId: catLabor },
    { id: id(), description: "Carpenter", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 700, markupPrice: 770, categoryId: catLabor },
    { id: id(), description: "Steel Man", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 700, markupPrice: 770, categoryId: catLabor },
    { id: id(), description: "Electrician", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 750, markupPrice: 825, categoryId: catLabor },
    { id: id(), description: "Plumber", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 750, markupPrice: 825, categoryId: catLabor },
    { id: id(), description: "Painter", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 650, markupPrice: 715, categoryId: catLabor },
    { id: id(), description: "Laborer (Unskilled)", extraDesc1: "Daily Rate", extraDesc2: "", unit: "man-day", marketPrice: 500, markupPrice: 550, categoryId: catLabor },
    
    { id: id(), description: "Concrete Mixer (1 bagger)", extraDesc1: "Daily Rental", extraDesc2: "", unit: "day", marketPrice: 2500, markupPrice: 2800, categoryId: catEquipment },
    { id: id(), description: "Concrete Vibrator", extraDesc1: "Daily Rental", extraDesc2: "", unit: "day", marketPrice: 1500, markupPrice: 1700, categoryId: catEquipment },
    { id: id(), description: "Backhoe (0.8 cu.m.)", extraDesc1: "Daily Rental", extraDesc2: "w/ operator", unit: "day", marketPrice: 8000, markupPrice: 8800, categoryId: catEquipment },
    { id: id(), description: "Dump Truck (6-wheeler)", extraDesc1: "Daily Rental", extraDesc2: "", unit: "day", marketPrice: 5000, markupPrice: 5500, categoryId: catEquipment },
    { id: id(), description: "Dump Truck (10-wheeler)", extraDesc1: "Daily Rental", extraDesc2: "", unit: "day", marketPrice: 6000, markupPrice: 6600, categoryId: catEquipment },
    { id: id(), description: "Plate Compactor", extraDesc1: "Daily Rental", extraDesc2: "", unit: "day", marketPrice: 3000, markupPrice: 3300, categoryId: catEquipment },
    { id: id(), description: "Bar Cutter/Bender", extraDesc1: "Daily Rental", extraDesc2: "", unit: "day", marketPrice: 1000, markupPrice: 1100, categoryId: catEquipment },
    { id: id(), description: "Scaffolding Set", extraDesc1: "Daily Rental", extraDesc2: "per frame", unit: "day", marketPrice: 800, markupPrice: 900, categoryId: catEquipment },
  ];

  return {
    id: crypto.randomUUID(),
    year: "2025",
    categories,
    items,
  };
}
