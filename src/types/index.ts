export interface MaterialItem {
  id: string;
  description: string;
  specification?: string; 
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  quantityFormula?: string; 
  unitCostFormula?: string; 
}

export interface LaborItem {
  id: string;
  description: string;
  specification?: string;
  manDays: number;
  wageRate: number;
  totalCost: number;
  manDaysFormula?: string; 
  wageRateFormula?: string;
}

export interface EquipmentItem {
  id: string;
  description: string;
  specification?: string;
  period: number;
  rate: number;
  totalCost: number;
  periodFormula?: string; 
  rateFormula?: string;
}

export interface DUPATemplate {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  materials: MaterialItem[];
  labor: LaborItem[];
  equipment: EquipmentItem[];
  indirectCostPercent: number;
  vatPercent: number;
  createdAt: string;
  updatedAt?: string;
}

export interface GeneralCategoryTemplateItem {
  description: string;
  unit: string;
  quantity?: number;
  dupaTemplateId?: string; 
}

export interface GeneralCategoryTemplate {
  id: string;
  name: string;
  description: string;
  items: GeneralCategoryTemplateItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface DUPAItem {
  id: string;
  abcItemId: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  equipment: EquipmentItem[];
  totalMaterials: number;
  totalLabor: number;
  totalEquipment: number;
  totalDirectCost: number;
  ocmPercent?: number;
  profitPercent?: number;
  indirectCostPercent: number;
  indirectCost: number;
  totalDirectAndIndirect: number;
  vatPercent: number;
  vat: number;
  totalPrice: number;
  unitPrice: number; 
}

export interface ABCItem {
  id: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  materialsCost: number;
  laborEquipmentCost: number;
  estimatedDirectCost: number;
  ocmPercent: number;
  profitPercent: number;
  totalMarkupPercent: number;
  markupValue: number;
  vatPercent: number;
  vatCost: number;
  totalIndirectCost: number;
  totalCost: number;
  unitCost: number;
  isCategory: boolean;
  parentId: string | null;
  children: string[];
  hasDupa: boolean;
  order: number;
  lockedFields?: string[];
}

export interface PriceListItem {
  id: string;
  sourceItemId?: string;
  description: string;
  extraDesc1: string;
  extraDesc2: string;
  unit: string;
  marketPrice: number;
  markupPrice: number;
  categoryId: string;
}

export interface PriceListCategory {
  id: string;
  sourceCategoryId?: string;
  name: string;
  order: number;
}

export interface PriceListYear {
  id: string;
  year: string;
  categories: PriceListCategory[];
  items: PriceListItem[];
}

export interface PriceListData {
  years: PriceListYear[];
}

export interface ProjectSettings {
  ocmPercent: number;
  profitPercent: number;
  vatPercent: number;
  dupaIndirectCostPercent: number;
  dupaVatPercent: number;
}

export interface ProjectVersion {
  id: string;
  name: string;
  createdAt: string;
  abcItems: ABCItem[];
  dupaItems: DUPAItem[];
  settings: ProjectSettings;
}

export interface SignatoryPerson {
  name: string;
  position: string;
}

export interface Signatory {
  label: string;   
    name: string;
    position: string;
    people?: SignatoryPerson[];
    row?: number;
}

export type HAlign = "left" | "center" | "right";

export interface ElementLayout {
    xMm: number;
    yMm: number;
    align: HAlign;
}

export interface OrgLineStyle {
  bold?: boolean;
  italic?: boolean;
}

export interface ExtraLogo {
  dataUrl: string;
  widthMm: number;
  layout: ElementLayout;
}

export interface SecondaryHeader {
  enabled: boolean;
  orgLines: string[];
  orgLineStyles?: OrgLineStyle[];
  addressLine: string;
  layout: ElementLayout;
  primaryFontSize: number;
  secondaryFontSize: number;
  addressFontSize: number;
  lineGapMm: number;
  color: string;
}

export interface PrintSettings {
    logoDataUrl: string;
    logoWidthMm: number;
    logo2DataUrl?: string;
  logo2WidthMm?: number;
  logo2Layout?: ElementLayout;
    logo3DataUrl?: string;
  logo3WidthMm?: number;
  logo3Layout?: ElementLayout;
    extraLogos?: ExtraLogo[];
    orgLines: string[];
    orgLineStyles?: OrgLineStyle[];
    secondaryHeader?: SecondaryHeader;
    additionalHeaders?: SecondaryHeader[];
    addressLine: string;
    showProjectInfo: boolean;
    defaultLocation: string;
  defaultContractor: string;
    signatories: Signatory[];
    logoLayout: ElementLayout;
    orgLayout: ElementLayout;
    projectInfoLayout: ElementLayout;
    signatoriesYFromBottomMm: number;
    signatoriesAlign: "justify" | "left" | "center" | "right";

  
    orgPrimaryFontSize: number;
    orgSecondaryFontSize: number;
    addressFontSize: number;
    orgLineGapMm: number;

    titleFontSize: number;
    titleGapMm: number;

    projectInfoFontSize: number;

    signatoryBlockWidthMm: number;
    signatoryGapMm: number;
    signatoryRowGapMm: number;
    signatoryLineOffsetMm: number;
    signatoryLabelFontSize: number;
    signatoryNameFontSize: number;
    signatoryPositionFontSize: number;

    showHeaderDivider: boolean;

  
    pageMarginLeftMm?: number;
  pageMarginRightMm?: number;
    orgTextColor?: string;
    titleColor?: string;
    titleBold?: boolean;
  titleItalic?: boolean;
  titleUppercase?: boolean;
    titleOverride?: string;
    projectInfoColor?: string;
    projectInfoShowName?: boolean;
  projectInfoShowLocation?: boolean;
  projectInfoShowContractor?: boolean;
  projectInfoShowDate?: boolean;
    projectInfoNameOverride?: string;
  projectInfoLocationOverride?: string;
  projectInfoContractorOverride?: string;
  projectInfoDateOverride?: string;
    projectInfoIndependentFields?: boolean;
  projectInfoNameLayout?: ElementLayout;
  projectInfoLocationLayout?: ElementLayout;
  projectInfoContractorLayout?: ElementLayout;
  projectInfoDateLayout?: ElementLayout;
    headerDividerColor?: string;
  headerDividerThicknessMm?: number;
    contentTopGapMm?: number;
    signatoryLineColor?: string;
  signatoryLineThicknessMm?: number;
  signatoryLabelUppercase?: boolean;
  signatoryLabelColor?: string;
  signatoryNameColor?: string;
  signatoryPositionColor?: string;
    signatoriesLayout?: "default" | "detailed";
}

export type PrintDocType = "abc" | "dupa" | "boq" | "scurve";

export interface PrintProfiles {
  abc: PrintSettings;
  dupa: PrintSettings;
  boq: PrintSettings;
  scurve: PrintSettings;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  logoDataUrl: "",
  logoWidthMm: 29,
  orgLines: [
    "Office of Facilities Development and Management",
    "Planning and Design Unit",
    "Romulo Boulevard, San Vicente, Tarlac City",
    "Tel. No. (045) 606-8160",
  ],
  addressLine: "",
  showProjectInfo: true,
  defaultLocation: "",
  defaultContractor: "",
  signatories: [
    { label: "Prepared by:", name: "", position: "", row: 0 },
    { label: "Checked by:", name: "", position: "", row: 1 },
    { label: "Certified by:", name: "", position: "", row: 2 },
    { label: "Recommending Approval:", name: "", position: "", row: 3 },
    { label: "Approved:", name: "", position: "", row: 4 },
  ],
  signatoriesLayout: "default",
  logoLayout: { xMm: 14, yMm: 10, align: "left" },
  orgLayout: { xMm: 0, yMm: 12, align: "center" },
  projectInfoLayout: { xMm: 14, yMm: 36, align: "left" },
  signatoriesYFromBottomMm: 44,
  signatoriesAlign: "left",

  orgPrimaryFontSize: 9,
  orgSecondaryFontSize: 8,
  addressFontSize: 7,
  orgLineGapMm: 4,

  titleFontSize: 13,
  titleGapMm: 19,

  projectInfoFontSize: 9,

  signatoryBlockWidthMm: 60,
  signatoryGapMm: 4,
  signatoryRowGapMm: 18,
  signatoryLineOffsetMm: 12,
  signatoryLabelFontSize: 9,
  signatoryNameFontSize: 10,
  signatoryPositionFontSize: 8,

  showHeaderDivider: true,

  pageMarginLeftMm: 14,
  pageMarginRightMm: 14,
  orgTextColor: "#000000",
  titleColor: "#000000",
  titleBold: true,
  titleItalic: false,
  titleUppercase: false,
  titleOverride: "",
  projectInfoColor: "#000000",
  projectInfoShowName: false,
  projectInfoShowLocation: false,
  projectInfoShowContractor: false,
  projectInfoShowDate: false,
  headerDividerColor: "#b4b4b4",
  headerDividerThicknessMm: 0.2,
  contentTopGapMm: 1,
  signatoryLineColor: "#787878",
  signatoryLineThicknessMm: 0.3,
  signatoryLabelUppercase: false,
  signatoryLabelColor: "#505050",
  signatoryNameColor: "#000000",
  signatoryPositionColor: "#505050",

  logo2DataUrl: "",
  logo2WidthMm: 29,
  logo2Layout: { xMm: 14, yMm: 10, align: "right" },

  logo3DataUrl: "",
  logo3WidthMm: 29,
  logo3Layout: { xMm: 0, yMm: 10, align: "center" },
  extraLogos: [],
  orgLineStyles: [
    { bold: true },
    { bold: true },
    {},
    {},
  ],
  secondaryHeader: {
    enabled: false,
    orgLines: [""],
    orgLineStyles: [],
    addressLine: "",
    layout: { xMm: 0, yMm: 26, align: "center" },
    primaryFontSize: 9,
    secondaryFontSize: 8,
    addressFontSize: 8,
    lineGapMm: 4,
    color: "#000000",
  },
  additionalHeaders: [
    {
      enabled: true,
      orgLines: [
        "Project: (Add Project Name)",
        "Address: (Add Address)",
        "Duration: (Add Duration)",
      ],
      orgLineStyles: [{ bold: true }, { bold: true }, { bold: true }],
      addressLine: "",
      layout: { xMm: 0, yMm: 33, align: "center" },
      primaryFontSize: 8,
      secondaryFontSize: 8,
      addressFontSize: 7,
      lineGapMm: 4,
      color: "#000000",
    },
  ],
  projectInfoNameOverride: "",
  projectInfoLocationOverride: "",
  projectInfoContractorOverride: "",
  projectInfoDateOverride: "",
  projectInfoIndependentFields: false,
  projectInfoNameLayout: { xMm: 0, yMm: 74, align: "left" },
  projectInfoLocationLayout: { xMm: 14, yMm: 41, align: "left" },
  projectInfoContractorLayout: { xMm: 14, yMm: 36, align: "right" },
  projectInfoDateLayout: { xMm: 0, yMm: 74, align: "right" },
};

export const DEFAULT_PRINT_PROFILES: PrintProfiles = {
  abc: { ...DEFAULT_PRINT_SETTINGS },
  dupa: { ...DEFAULT_PRINT_SETTINGS },
  boq: { ...DEFAULT_PRINT_SETTINGS },
  scurve: { ...DEFAULT_PRINT_SETTINGS },
};

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  abcItems: ABCItem[];
  dupaItems: DUPAItem[];
  settings: ProjectSettings;
  versions: ProjectVersion[];
    printOverride?: Partial<PrintSettings>;
    printProfileOverrides?: Partial<Record<PrintDocType, Partial<PrintSettings>>>;
  location?: string;
  contractor?: string;
    activePriceListYearId?: string;
}

export interface AppSettings {
  defaultOcmPercent: number;
  defaultProfitPercent: number;
  defaultVatPercent: number;
  layoutMode: 'topnav' | 'sidebar';
  units?: string[];
  favoriteUnits?: string[];
  printSettings?: PrintSettings;
    printProfiles?: Partial<PrintProfiles>;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultOcmPercent: 8,
  defaultProfitPercent: 8,
  defaultVatPercent: 12,
  layoutMode: 'topnav',
  units: [
    'pcs', 'lot', 'set', 'ea', 'bag', 'roll', 'sheet',
    'm', 'lm', 'sq.m.', 'cu.m.', 'm²', 'm³',
    'kg', 'ton', 'L', 'gal',
    'day', 'hr', 'man-day',
  ],
  favoriteUnits: ['pcs', 'lot', 'm²', 'cu.m.', 'kg'],
  printSettings: DEFAULT_PRINT_SETTINGS,
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  ocmPercent: 8,
  profitPercent: 8,
  vatPercent: 12,
  dupaIndirectCostPercent: 16,
  dupaVatPercent: 12,
};
