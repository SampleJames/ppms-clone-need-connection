import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer, FileDown, Eye, Palette, RotateCcw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Project, ABCItem } from "@/types";
import { getProjects, getProject, saveProject } from "@/lib/storage";
import { formatCurrency } from "@/lib/calculations";
import { sortByItemNo } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  renderPdfHeader,
  renderPdfSignatories,
  resolveDocSettings,
  saveGlobalPrintProfile,
  DOC_PAGE,
  ensureRoomForSignatories,
  getSignatoriesReserveMm,
} from "@/lib/printSettings";
import { sanitizeAutoTableCell } from "@/lib/pdfText";
import { renderSCurvePdf } from "@/lib/scurvePdf";
import PrintSettingsEditor from "@/components/PrintSettingsEditor";
import SCurve, { getSnapshots, type SCurveSnapshot } from "@/components/SCurve";
import { PrintSettings, DEFAULT_PRINT_SETTINGS, PrintDocType, PrintProfiles } from "@/types";

// Firebase & Collab Imports
import { useAuth } from "@/contexts/AuthContext";
import { subscribeMyProjects, subscribeAllProjects, subscribeProject, CollabProjectDoc, docToProject, isAdminEmail } from "@/lib/collabStorage";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

interface PdfColorSettings {
  abcHeaderBg: string;
  abcHeaderText: string;
  abcCategoryBg: string;
  abcCategoryText: string;
  abcSubtotalBg: string;
  abcSubtotalText: string;
  abcGrandTotalBg: string;
  abcGrandTotalText: string;
  dupaHeaderBg: string;
  dupaHeaderText: string;
  dupaSectionLabelColor: string;
  dupaFooterBg: string;
  dupaFooterText: string;
  dupaSummaryAltBg: string;
}

const DEFAULT_COLORS: PdfColorSettings = {
  abcHeaderBg: "#FFFFFF",
  abcHeaderText: "#000000",
  abcCategoryBg: "#92D050",
  abcCategoryText: "#000000",
  abcSubtotalBg: "#FFFF00",
  abcSubtotalText: "#000000",
  abcGrandTotalBg: "#FFA500",
  abcGrandTotalText: "#000000",
  dupaHeaderBg: "#29528a",
  dupaHeaderText: "#ffffff",
  dupaSectionLabelColor: "#1a3a5c",
  dupaFooterBg: "#f0f0f0",
  dupaFooterText: "#000000",
  dupaSummaryAltBg: "#f5f5f5",
};

const ABC_COLUMNS = [
  { key: "itemNo", label: "Item No.", default: true },
  { key: "description", label: "Description", default: true },
  { key: "quantity", label: "Qty", default: true },
  { key: "unit", label: "Unit", default: true },
  { key: "materialsCost", label: "Materials", default: true },
  { key: "laborEquipmentCost", label: "Labor & Equip", default: true },
  { key: "estimatedDirectCost", label: "Est. Direct Cost", default: true },
  { key: "ocmPercent", label: "OCM %", default: true },
  { key: "profitPercent", label: "Profit %", default: true },
  { key: "totalMarkupPercent", label: "Markup %", default: true },
  { key: "markupValue", label: "Markup Value", default: true },
  { key: "vatCost", label: "VAT", default: true },
  { key: "totalIndirectCost", label: "Total Indirect", default: true },
  { key: "totalCost", label: "Total Cost", default: true },
  { key: "unitCost", label: "Unit Cost", default: true },
];

const ABC_COLUMNS_SIMPLE = [
  { key: "itemNo", label: "Item No.", default: true },
  { key: "description", label: "Description", default: true },
  { key: "quantity", label: "Qty", default: true },
  { key: "unit", label: "Unit", default: true },
  { key: "materialsCost", label: "Materials", default: true },
  { key: "laborEquipmentCost", label: "Labor & Equip", default: true },
  { key: "estimatedDirectCost", label: "Est. Direct Cost", default: true },
  { key: "ocmPercent", label: "OCM %", default: true },
  { key: "profitPercent", label: "Profit %", default: true },
  { key: "totalMarkupPercent", label: "Markup %", default: true },
  { key: "markupValue", label: "Markup Value", default: true },
  { key: "vatPercent", label: "VAT %", default: true },
  { key: "vatCost", label: "VAT", default: true },
  { key: "totalIndirectCost", label: "Total Indirect", default: true },
  { key: "totalCost", label: "Total Cost", default: true },
  { key: "unitCost", label: "Unit Cost", default: true },
];

const DEFAULT_ABC_FORMULAS: Record<string, string> = {
  estimatedDirectCost: "(3)+(4)",
  totalMarkupPercent: "(6)+(7)",
  markupValue: "(5) x (8)",
  vatCost: "5% x ((5)+(9))",
  totalIndirectCost: "(9)+(10)",
  totalCost: "(5+11) x (1)",
  unitCost: "(12) / (1)",
};

const ABC_FORMULA_LABELS: Record<string, string> = {
  estimatedDirectCost: "Est. Direct Cost",
  totalMarkupPercent: "Markup %",
  markupValue: "Markup Value",
  vatCost: "VAT",
  totalIndirectCost: "Total Indirect",
  totalCost: "Total Cost",
  unitCost: "Unit Cost",
};

function getOrderedItems(items: ABCItem[]): ABCItem[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const ordered: ABCItem[] = [];
  const addWithChildren = (parentId: string | null) => {
    sorted.filter((i) => i.parentId === parentId).forEach((i) => {
      ordered.push(i);
      if (i.isCategory || i.children.length > 0) addWithChildren(i.id);
    });
  };
  addWithChildren(null);
  items.forEach((i) => { if (!ordered.find((o) => o.id === i.id)) ordered.push(i); });
  return ordered;
}

export default function PrintPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("project") || "";

  // 1. Setup Auth and Firebase/Local Projects States
  const { user } = useAuth();
  const [localProjects] = useState<Project[]>(() => getProjects());
  const [collabDocs, setCollabDocs] = useState<CollabProjectDoc[]>([]);
  const [activeCollabProject, setActiveCollabProject] = useState<Project | null>(null);
  
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId);
  const [activeTab, setActiveTab] = useState<"abc" | "dupa" | "boq" | "scurve" | "header">("abc");

  // Fetch Collab Project List
  useEffect(() => {
    if (!user) return;
    return subscribeMyProjects(user.uid, setCollabDocs);
  }, [user]);

  // Determine if it's local or cloud, and fetch cloud if needed
  const localProjectMatch = localProjects.find((p) => p.id === selectedProjectId);
  const isCollab = selectedProjectId && !localProjectMatch;

  useEffect(() => {
    if (isCollab && selectedProjectId) {
      return subscribeProject(selectedProjectId, (doc) => {
        if (doc) setActiveCollabProject(docToProject(doc));
        else setActiveCollabProject(null);
      });
    } else {
      setActiveCollabProject(null);
    }
  }, [selectedProjectId, isCollab]);

  // The definitive selected project for generating PDFs
  const selectedProject = isCollab ? activeCollabProject : localProjectMatch;

  const [abcVisibleColumns, setAbcVisibleColumns] = useState<Set<string>>(
    () => new Set(ABC_COLUMNS.filter((c) => c.default).map((c) => c.key))
  );
  const [abcExcludedRows, setAbcExcludedRows] = useState<Set<string>>(new Set());
  const [abcFormulas, setAbcFormulas] = useState<Record<string, string>>({ ...DEFAULT_ABC_FORMULAS });
  const [abcSimpleVersion, setAbcSimpleVersion] = useState(false);
  const abcColumnsActive = abcSimpleVersion ? ABC_COLUMNS_SIMPLE : ABC_COLUMNS;

  const showBorders = true;
  const [colors, setColors] = useState<PdfColorSettings>({ ...DEFAULT_COLORS });
  const updateColor = (key: keyof PdfColorSettings, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const [dupaSelectedPages, setDupaSelectedPages] = useState<Set<string>>(new Set());
  const [dupaExcludedMaterials, setDupaExcludedMaterials] = useState<Record<string, Set<string>>>({});
  const [dupaExcludedLabor, setDupaExcludedLabor] = useState<Record<string, Set<string>>>({});
  const [dupaExcludedEquipment, setDupaExcludedEquipment] = useState<Record<string, Set<string>>>({});
  const [dupaHideMaterials, setDupaHideMaterials] = useState(false);
  const [dupaHideLabor, setDupaHideLabor] = useState(false);
  const [dupaHideEquipment, setDupaHideEquipment] = useState(false);
  const [dupaHideSummary, setDupaHideSummary] = useState(false);

  const [scurveSnapshots, setScurveSnapshots] = useState<SCurveSnapshot[]>([]);
  const [scurveSelectedId, setScurveSelectedId] = useState<string>("");
  const scurvePreviewRef = useRef<HTMLDivElement>(null);

  const [printProfiles, setPrintProfiles] = useState<PrintProfiles>(() => ({
    abc: { ...DEFAULT_PRINT_SETTINGS },
    dupa: { ...DEFAULT_PRINT_SETTINGS },
    boq: { ...DEFAULT_PRINT_SETTINGS },
    scurve: { ...DEFAULT_PRINT_SETTINGS },
  }));
  const [printScope, setPrintScope] = useState<"global" | "project">("project");
  const [editingDoc, setEditingDoc] = useState<PrintDocType>("abc");

  const reloadProfiles = (scope: "global" | "project") => {
    const proj = scope === "global" ? null : selectedProject;
    setPrintProfiles({
      abc: resolveDocSettings(proj, "abc"),
      dupa: resolveDocSettings(proj, "dupa"),
      boq: resolveDocSettings(proj, "boq"),
      scurve: resolveDocSettings(proj, "scurve"),
    });
  };

  useEffect(() => {
    if (selectedProject) {
      setAbcExcludedRows(new Set());
      const allDupaIds = new Set(selectedProject.dupaItems.map((d) => d.id));
      setDupaSelectedPages(allDupaIds);
      setDupaExcludedMaterials({});
      setDupaExcludedLabor({});
      setDupaExcludedEquipment({});
      const snaps = getSnapshots(selectedProject.id);
      setScurveSnapshots(snaps);
      setScurveSelectedId(snaps[0]?.id ?? "__current__");
    }
    reloadProfiles(printScope);
  }, [selectedProjectId, selectedProject?.id]);

  useEffect(() => {
    reloadProfiles(printScope);
  }, [printScope]);

  useEffect(() => {
    const hasDupaOverride = !!selectedProject?.printProfileOverrides?.dupa;
    if (!hasDupaOverride) {
      setDocSettings("dupa", simpleSettings);
      setAppliedTemplateId((prev) => ({ ...prev, dupa: "__builtin_simple" }));
    }
  }, [selectedProjectId]);

  const setDocSettings = (doc: PrintDocType, ps: PrintSettings) => {
    setPrintProfiles((prev) => ({ ...prev, [doc]: ps }));
    if (selectedProject && !isCollab) {
      const overrides = { ...(selectedProject.printProfileOverrides || {}), [doc]: ps };
      saveProject({ ...selectedProject, printProfileOverrides: overrides });
    } else {
      saveGlobalPrintProfile(doc, ps);
    }
  };

  type PrintTemplate = { id: string; name: string; settings: PrintSettings };
  const TEMPLATES_KEY = "costmgr_print_templates_v1";
  type AllTemplates = Record<PrintDocType, PrintTemplate[]>;

  const loadAllTemplates = (): AllTemplates => {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        abc: parsed.abc || [],
        dupa: parsed.dupa || [],
        boq: parsed.boq || [],
        scurve: parsed.scurve || [],
      };
    } catch {
      return { abc: [], dupa: [], boq: [], scurve: [] };
    }
  };

  const [customTemplates, setCustomTemplates] = useState<AllTemplates>(() => loadAllTemplates());
  
  // Real-time Cloud Templates Sync via Firebase
  const [cloudTemplates, setCloudTemplates] = useState<AllTemplates>({ abc: [], dupa: [], boq: [], scurve: [] });
  const [saveTplLocation, setSaveTplLocation] = useState<"cloud" | "local">("cloud");

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "printTemplates"), (snap) => {
      const parsed: AllTemplates = { abc: [], dupa: [], boq: [], scurve: [] };
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const tType = data.type as PrintDocType;
        if (parsed[tType]) {
          parsed[tType].push({
            id: docSnap.id,
            name: data.name,
            settings: data.settings
          });
        }
      });
      setCloudTemplates(parsed);
    });
    return unsub;
  }, [user]);

  const [appliedTemplateId, setAppliedTemplateId] = useState<Record<PrintDocType, string>>({
    abc: "", dupa: "__builtin_simple", boq: "", scurve: "",
  });
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [saveTplName, setSaveTplName] = useState("");

  const persistTemplates = (next: AllTemplates) => {
    setCustomTemplates(next);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  };

  const simpleSettings: PrintSettings = useMemo(() => ({
    ...DEFAULT_PRINT_SETTINGS,
    orgLines: [],
    orgLineStyles: [],
    signatories: [],
  }), []);

  const builtInTemplates: PrintTemplate[] = useMemo(() => {
    const baseSig = (fromBottom: number): PrintSettings => ({
      ...DEFAULT_PRINT_SETTINGS,
      signatoriesLayout: "detailed",
      signatoriesYFromBottomMm: fromBottom,
      signatories: (DEFAULT_PRINT_SETTINGS.signatories || []).map((s) => ({ ...s, row: 0 })),
    });
    return [
      { id: "__builtin_default", name: "Default", settings: { ...DEFAULT_PRINT_SETTINGS } },
      { id: "__builtin_simple", name: "Simple", settings: simpleSettings },
      { id: "__builtin_sig_row1", name: "Signatories Detailed (row 1)", settings: baseSig(120) },
      { id: "__builtin_sig_row2", name: "Signatories Detailed (row 2)", settings: baseSig(60) },
    ];
  }, [simpleSettings]);

  const templatesForCurrentDoc = useMemo(
    () => [
      ...builtInTemplates, 
      ...cloudTemplates[editingDoc], 
      ...customTemplates[editingDoc]
    ],
    [builtInTemplates, cloudTemplates, customTemplates, editingDoc]
  );

  const applyPrintTemplate = (id: string) => {
    const tpl = templatesForCurrentDoc.find((t) => t.id === id);
    if (!tpl) return;
    setDocSettings(editingDoc, { ...tpl.settings });
    setAppliedTemplateId((prev) => ({ ...prev, [editingDoc]: id }));
    toast({ title: `Template applied: ${tpl.name}` });
  };

  const openSaveTemplateDialog = () => {
    setSaveTplName("");
    setSaveTplLocation("cloud"); // Default to Cloud sharing!
    setSaveTplOpen(true);
  };

  const confirmSaveTemplate = async () => {
    const name = saveTplName.trim();
    if (!name) return;
    const tplId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    try {
      if (saveTplLocation === "cloud") {
        await setDoc(doc(db, "printTemplates", tplId), {
          name,
          type: editingDoc,
          settings: printProfiles[editingDoc],
          createdBy: user?.uid || "unknown",
          createdAt: new Date().toISOString()
        });
        setAppliedTemplateId((prev) => ({ ...prev, [editingDoc]: tplId }));
        setSaveTplOpen(false);
        toast({ title: `Shared template "${name}" saved to Cloud` });
      } else {
        const tpl: PrintTemplate = { id: tplId, name, settings: { ...printProfiles[editingDoc] } };
        const next: AllTemplates = {
          ...customTemplates,
          [editingDoc]: [...customTemplates[editingDoc], tpl],
        };
        persistTemplates(next);
        setAppliedTemplateId((prev) => ({ ...prev, [editingDoc]: tpl.id }));
        setSaveTplOpen(false);
        toast({ title: `Local template "${name}" saved` });
      }
    } catch (err) {
      toast({ title: "Failed to save template", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string, isCloud: boolean) => {
    if (id.startsWith("__builtin_")) return;
    
    try {
      if (isCloud) {
        await deleteDoc(doc(db, "printTemplates", id));
        if (appliedTemplateId[editingDoc] === id) {
          setAppliedTemplateId((prev) => ({ ...prev, [editingDoc]: "" }));
        }
        toast({ title: "Shared template deleted" });
      } else {
        const next: AllTemplates = {
          ...customTemplates,
          [editingDoc]: customTemplates[editingDoc].filter((t) => t.id !== id),
        };
        persistTemplates(next);
        if (appliedTemplateId[editingDoc] === id) {
          setAppliedTemplateId((prev) => ({ ...prev, [editingDoc]: "" }));
        }
        toast({ title: "Local template deleted" });
      }
    } catch (err) {
      toast({ title: "Failed to delete template", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSavePrintSettings = () => {
    const ps = printProfiles[editingDoc];
    if (printScope === "global" || isCollab) {
      saveGlobalPrintProfile(editingDoc, ps);
      toast({ title: `Global ${DOC_PAGE[editingDoc].label} print settings saved` });
    } else if (selectedProject) {
      const overrides = { ...(selectedProject.printProfileOverrides || {}), [editingDoc]: ps };
      const updated: Project = { ...selectedProject, printProfileOverrides: overrides };
      saveProject(updated);
      toast({ title: `${DOC_PAGE[editingDoc].label} print settings saved for "${selectedProject.name}"` });
    }
  };

  const handleClearProjectOverride = () => {
    if (!selectedProject || isCollab) return;
    const overrides = { ...(selectedProject.printProfileOverrides || {}) };
    delete overrides[editingDoc];
    const updated: Project = { ...selectedProject, printProfileOverrides: overrides };
    saveProject(updated);
    setDocSettings(editingDoc, resolveDocSettings(null, editingDoc));
    toast({ title: `Cleared ${DOC_PAGE[editingDoc].label} override — using global` });
  };

  const orderedAbcItems = useMemo(
    () => (selectedProject ? getOrderedItems(selectedProject.abcItems) : []),
    [selectedProject]
  );

  const toggleAbcColumn = (key: string) => {
    setAbcVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAbcRow = (id: string) => {
    setAbcExcludedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDupaPage = (id: string) => {
    setDupaSelectedPages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDupaSubRow = (
    dupaId: string,
    rowId: string,
    section: "materials" | "labor" | "equipment"
  ) => {
    const setter =
      section === "materials" ? setDupaExcludedMaterials :
      section === "labor" ? setDupaExcludedLabor : setDupaExcludedEquipment;
    setter((prev) => {
      const dupaSet = new Set(prev[dupaId] || []);
      dupaSet.has(rowId) ? dupaSet.delete(rowId) : dupaSet.add(rowId);
      return { ...prev, [dupaId]: dupaSet };
    });
  };

  const selectAllAbcRows = () => setAbcExcludedRows(new Set());
  const deselectAllAbcRows = () => setAbcExcludedRows(new Set(orderedAbcItems.map((i) => i.id)));
  const selectAllAbcCols = () => setAbcVisibleColumns(new Set(abcColumnsActive.map((c) => c.key)));
  const deselectAllAbcCols = () => setAbcVisibleColumns(new Set(["itemNo", "description"]));
  const selectAllDupaPages = () => {
    if (selectedProject) setDupaSelectedPages(new Set(selectedProject.dupaItems.map((d) => d.id)));
  };
  const deselectAllDupaPages = () => setDupaSelectedPages(new Set());

  const getCategoryTotal = (catId: string, items: ABCItem[]): number => {
    return items
      .filter((i) => i.parentId === catId && !i.isCategory)
      .reduce((sum, i) => sum + i.totalCost, 0) +
      items
        .filter((i) => i.parentId === catId && i.isCategory)
        .reduce((sum, i) => sum + getCategoryTotal(i.id, items), 0);
  };

  const borderStyles = showBorders
    ? { lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1 }
    : {};

  const openPreview = (doc: jsPDF, label: string) => {
    try {
      const url = doc.output("bloburl");
      window.open(url, "_blank");
    } catch (err) {
      console.error(err);
      toast({ title: `Failed to preview ${label}`, variant: "destructive" });
    }
  };

  const generateABCPdf = (mode: "save" | "preview" = "save") => {
    if (!selectedProject) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    const cols = abcColumnsActive.filter((c) => abcVisibleColumns.has(c.key));
    const rows = orderedAbcItems.filter((i) => !abcExcludedRows.has(i.id));

    doc.setFontSize(14);
    const headerY = renderPdfHeader(doc, { title: "APPROVED BUDGET FOR THE CONTRACT", project: selectedProject, settings: printProfiles.abc });

    const NUMBER_MAP: Record<string, string> = {
      quantity: "1", unit: "2", materialsCost: "3", laborEquipmentCost: "4",
      estimatedDirectCost: "5", ocmPercent: "6", profitPercent: "7",
      totalMarkupPercent: "8", markupValue: "9", vatCost: "10",
      totalIndirectCost: "11", totalCost: "12", unitCost: "13",
    };
    const FORMULA_MAP: Record<string, string> = { ...DEFAULT_ABC_FORMULAS, ...abcFormulas };

    const row1: any[] = [];
    const row2: any[] = [];
    const fItalic = { fontStyle: "italic" as const, fontSize: 6 };
    const blankHeadCell = { content: "", styles: { fillColor: hexToRgb(colors.abcHeaderBg) } };
    const row3: any[] = [];
    const row4: any[] = [];

    let ci = 0;
    while (ci < cols.length) {
      const c = cols[ci];
      const next = cols[ci + 1];
      const isMarkupPctGroup = c.key === "ocmPercent" && next?.key === "profitPercent";
      const isMarkupValGroup = c.key === "totalMarkupPercent" && next?.key === "markupValue";
      if (isMarkupPctGroup) {
        row1.push({ content: "MARK-UPS IN PERCENT", colSpan: 2 });
        row2.push("OCM", "PROFIT");
        ci += 2;
      } else if (isMarkupValGroup) {
        row1.push({ content: "TOTAL MARK-UP", colSpan: 2 });
        row2.push("%", "Value");
        ci += 2;
      } else {
        row1.push({ content: c.label, rowSpan: 2 });
        ci += 1;
      }
    }
    for (const c of cols) {
      row3.push(NUMBER_MAP[c.key] ?? (c.key === "itemNo" || c.key === "description" ? blankHeadCell : ""));
      const f = FORMULA_MAP[c.key];
      row4.push(f ? { content: f, styles: fItalic }
        : (c.key === "itemNo" || c.key === "description" ? blankHeadCell : ""));
    }

    const head: any[][] = abcSimpleVersion
      ? [cols.map((c) => c.label)]
      : [row1, row2, row3, row4];
    const body: any[][] = [];

    for (const item of rows) {
      if (item.isCategory) {
        const row = cols.map((c) => {
          if (c.key === "itemNo") return { content: item.itemNo, styles: { fontStyle: "bold" } };
          if (c.key === "description") return { content: item.description, styles: { fontStyle: "bold" } };
          return "";
        });
        body.push(row);
      } else {
        const row = cols.map((c) => {
          const val = (item as any)[c.key];
          if (c.key === "itemNo" || c.key === "description" || c.key === "unit") return val;
          if (c.key === "quantity") return val;
          if (c.key.includes("Percent") || c.key === "ocmPercent" || c.key === "profitPercent" || c.key === "vatPercent" || c.key === "totalMarkupPercent") return `${val}%`;
          return formatCurrency(val);
        });
        body.push(row);
      }
    }

    const bodyWithSubtotals: any[][] = [];
    let i = 0;
    while (i < rows.length) {
      const item = rows[i];
      if (item.isCategory) {
        bodyWithSubtotals.push(cols.map((c) => {
          if (c.key === "itemNo") return { content: item.itemNo, styles: { fontStyle: "bold", fillColor: hexToRgb(colors.abcCategoryBg), textColor: hexToRgb(colors.abcCategoryText) } };
          if (c.key === "description") return { content: item.description, styles: { fontStyle: "bold", fillColor: hexToRgb(colors.abcCategoryBg), textColor: hexToRgb(colors.abcCategoryText) } };
          return { content: "", styles: { fillColor: hexToRgb(colors.abcCategoryBg) } };
        }));

        let j = i + 1;
        while (j < rows.length && rows[j].parentId === item.id && !rows[j].isCategory) {
          const child = rows[j];
          bodyWithSubtotals.push(cols.map((c) => {
            const val = (child as any)[c.key];
            if (c.key === "itemNo" || c.key === "description" || c.key === "unit") return val;
            if (c.key === "quantity") return val;
            if (c.key.includes("Percent") || c.key === "ocmPercent" || c.key === "profitPercent" || c.key === "vatPercent" || c.key === "totalMarkupPercent") return `${val}%`;
            return formatCurrency(val);
          }));
          j++;
        }
        
        const catTotal = getCategoryTotal(item.id, selectedProject.abcItems);
        const totalCostIdx = cols.findIndex(c => c.key === "totalCost");
        const tiIdx = cols.findIndex(c => c.key === "totalIndirectCost");
        const labelStart = tiIdx >= 0 ? tiIdx : Math.max(0, totalCostIdx - 1);
        const labelSpan = Math.max(1, totalCostIdx - labelStart);
        const subtotalRow: any[] = [];
        if (labelStart > 0) subtotalRow.push({ content: "", colSpan: labelStart });
        subtotalRow.push({ content: `SUBTOTAL`, colSpan: labelSpan, styles: { fontStyle: "bold", halign: "right" as const, fillColor: hexToRgb(colors.abcSubtotalBg), textColor: hexToRgb(colors.abcSubtotalText) } });
        subtotalRow.push({ content: formatCurrency(catTotal), styles: { fontStyle: "bold", halign: "right" as const, fillColor: hexToRgb(colors.abcSubtotalBg), textColor: hexToRgb(colors.abcSubtotalText) } });
        const trailing = cols.length - totalCostIdx - 1;
        if (trailing > 0) subtotalRow.push({ content: "", colSpan: trailing });
        bodyWithSubtotals.push(subtotalRow);
        i = j;
      } else {
        bodyWithSubtotals.push(cols.map((c) => {
          const val = (item as any)[c.key];
          if (c.key === "itemNo" || c.key === "description" || c.key === "unit") return val;
          if (c.key === "quantity") return val;
          if (c.key.includes("Percent") || c.key === "ocmPercent" || c.key === "profitPercent" || c.key === "vatPercent" || c.key === "totalMarkupPercent") return `${val}%`;
          return formatCurrency(val);
        }));
        i++;
      }
    }

    const grandTotal = selectedProject.abcItems
      .filter((it) => it.isCategory && !it.parentId)
      .reduce((s, it) => s + getCategoryTotal(it.id, selectedProject.abcItems), 0) +
      selectedProject.abcItems
        .filter((it) => !it.isCategory && !it.parentId)
        .reduce((s, it) => s + it.totalCost, 0);

    const descIdx = cols.findIndex(c => c.key === "description");
    const gtTotalCostIdx = cols.findIndex(c => c.key === "totalCost");
    const firstSpan = descIdx >= 0 ? descIdx + 1 : 1;
    const middleSpan = Math.max(1, gtTotalCostIdx - firstSpan + 1);
    const grandTotalRow: any[] = [
      { content: "GRAND TOTAL", colSpan: firstSpan, styles: { fontStyle: "bold", halign: "right" as const } },
      { content: formatCurrency(grandTotal), colSpan: middleSpan, styles: { fontStyle: "bold", halign: "right" as const, fillColor: hexToRgb(colors.abcGrandTotalBg), textColor: hexToRgb(colors.abcGrandTotalText) } },
    ];
    const gtTrailing = cols.length - (firstSpan + middleSpan);
    if (gtTrailing > 0) grandTotalRow.push({ content: "", colSpan: gtTrailing });
    bodyWithSubtotals.push(grandTotalRow);

    autoTable(doc, {
      startY: headerY,
      margin: { top: 14, bottom: 14, left: 14, right: 14 },
      didParseCell: sanitizeAutoTableCell,
      theme: "grid",
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.1,
      head,
      body: bodyWithSubtotals,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
        valign: "top",
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        ...borderStyles,
      },
      headStyles: {
        fillColor: hexToRgb(colors.abcHeaderBg),
        textColor: hexToRgb(colors.abcHeaderText),
        fontSize: 7,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: "center",
        valign: "middle",
      },
      bodyStyles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: {
        1: { cellWidth: 90, overflow: "linebreak", valign: "top" },
      },
    });

    ensureRoomForSignatories(doc, { title: "APPROVED BUDGET FOR THE CONTRACT", project: selectedProject, settings: printProfiles.abc });
    renderPdfSignatories(doc, selectedProject, printProfiles.abc);
    if (mode === "preview") return openPreview(doc, "ABC");
    doc.save(`${selectedProject.name} - ABC (Custom).pdf`);
    toast({ title: "ABC PDF exported successfully" });
  };

  const generateBOQPdf = (mode: "save" | "preview" = "save") => {
    if (!selectedProject) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
    const rows = orderedAbcItems.filter((i) => !abcExcludedRows.has(i.id));

    const headerY = renderPdfHeader(doc, { title: "BILL OF QUANTITIES", project: selectedProject, settings: printProfiles.boq });

    const boqCols = ABC_COLUMNS;
    const head = [boqCols.map((c) => c.label)];
    const body: any[][] = [];

    for (const item of rows) {
      if (item.isCategory) {
        body.push(boqCols.map((c) => {
          if (c.key === "itemNo") return { content: item.itemNo, styles: { fontStyle: "bold" } };
          if (c.key === "description") return { content: item.description, styles: { fontStyle: "bold" } };
          return "";
        }));
      } else {
        body.push(boqCols.map((c) => {
          if (c.key === "itemNo") return item.itemNo;
          if (c.key === "description") return item.description;
          return "";
        }));
      }
    }

    autoTable(doc, {
      startY: headerY,
      margin: { top: 14, bottom: 14, left: 14, right: 14 },
      didParseCell: sanitizeAutoTableCell,
      head,
      body,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak", valign: "top", ...borderStyles },
      headStyles: { fillColor: [41, 82, 138], fontSize: 7, valign: "middle", halign: "center" },
      columnStyles: { 1: { cellWidth: 90, overflow: "linebreak", valign: "top" } },
    });

    ensureRoomForSignatories(doc, { title: "BILL OF QUANTITIES", project: selectedProject, settings: printProfiles.boq });
    renderPdfSignatories(doc, selectedProject, printProfiles.boq);
    if (mode === "preview") return openPreview(doc, "BOQ");
    doc.save(`${selectedProject.name} - BOQ.pdf`);
    toast({ title: "BOQ PDF exported successfully" });
  };

  const generateSCurvePdf = async (mode: "save" | "preview" = "save") => {
    if (!selectedProject) return;
    const settings = printProfiles.scurve;
    const title = "S-CURVE / PROJECT SCHEDULE";

    const snap = scurveSnapshots.find((s) => s.id === scurveSelectedId);
    const renderOpts = snap
      ? {
          totalDuration: snap.totalDuration,
          intervalDays: snap.intervalDays,
          monthDays: snap.monthDays,
          scheduleData: snap.scheduleData,
        }
      : { totalDuration: 90, intervalDays: 5, monthDays: 30, scheduleData: {} };

    const doc = renderSCurvePdf(selectedProject, settings, renderOpts, title);

    const suffix = snap ? ` - ${snap.name}` : "";
    if (mode === "preview") return openPreview(doc, "S-Curve");
    doc.save(`${selectedProject.name} - S-Curve${suffix}.pdf`);
    toast({ title: "S-Curve PDF exported successfully" });
  };

  const generateDUPAPdf = (mode: "save" | "preview" = "save") => {
    if (!selectedProject) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const selectedDupas = sortByItemNo(selectedProject.dupaItems.filter((d) => dupaSelectedPages.has(d.id)));

    if (selectedDupas.length === 0) {
      toast({ title: "No DUPA pages selected", variant: "destructive" });
      return;
    }

    const COL = { itemNo: 12, desc: 64, qty: 20, unit: 14, rate: 32, total: 40 };
    const MARGIN_L = 14;
    const MARGIN_R = 14;
    
    const sigReserve = getSignatoriesReserveMm(printProfiles.dupa);
    const dupaTableMargin = { top: 14, bottom: sigReserve, left: MARGIN_L, right: MARGIN_R };

    const GREY_LIGHT: [number, number, number] = [217, 217, 217];
    const GREY_MED: [number, number, number] = [165, 165, 165];
    const BLACK: [number, number, number] = [0, 0, 0];
    const WHITE: [number, number, number] = [255, 255, 255];

    const baseStyles = {
      fontSize: 7.5,
      overflow: "linebreak" as const,
      valign: "middle" as const,
      cellPadding: { top: 1, right: 1.5, bottom: 1, left: 1.5 },
      lineColor: BLACK,
      lineWidth: 0.2,
      textColor: BLACK,
      ...borderStyles,
    };
    const plainHeadStyles = {
      fillColor: WHITE,
      textColor: BLACK,
      fontStyle: "normal" as const,
      halign: "center" as const,
      valign: "middle" as const,
      lineColor: BLACK,
      lineWidth: 0.2,
    };
    const sixColColumnStyles = {
      0: { cellWidth: COL.itemNo, halign: "center" as const, valign: "middle" as const },
      1: { cellWidth: COL.desc, overflow: "linebreak" as const, valign: "middle" as const },
      2: { cellWidth: COL.qty, halign: "center" as const, valign: "middle" as const, overflow: "visible" as const },
      3: { cellWidth: COL.unit, halign: "center" as const, valign: "middle" as const, overflow: "visible" as const },
      4: { cellWidth: COL.rate, halign: "right" as const, valign: "middle" as const, overflow: "visible" as const },
      5: { cellWidth: COL.total, halign: "right" as const, valign: "middle" as const, overflow: "visible" as const },
    };

    selectedDupas.forEach((dupa, idx) => {
      if (idx > 0) doc.addPage();

      const headerEnd = renderPdfHeader(doc, { title: "DETAILED UNIT PRICE ANALYSIS", project: selectedProject, settings: printProfiles.dupa });

      const abcItem = selectedProject.abcItems.find((i) => i.id === dupa.abcItemId);
      const parentCategory = abcItem?.parentId
        ? selectedProject.abcItems.find((i) => i.id === abcItem.parentId && i.isCategory)
        : undefined;

      const titleHead: any[][] = [
        [
          { content: "" },
          { content: "" },
          { content: "Qty.", styles: { halign: "center" } },
          { content: "Unit", styles: { halign: "center" } },
          { content: "Unit Price", styles: { halign: "center" } },
          { content: "Total Price", styles: { halign: "center" } },
        ],
      ];
      const titleBody: any[][] = [];
      if (parentCategory) {
        titleBody.push([
          { content: parentCategory.itemNo || "", styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
          { content: parentCategory.description || "", colSpan: 5, styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
        ]);
      }
      titleBody.push([
        { content: dupa.itemNo || "", styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
        { content: dupa.description || "", styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
        { content: dupa.quantity, styles: { fillColor: GREY_LIGHT, halign: "center" } },
        { content: dupa.unit, styles: { fillColor: GREY_LIGHT, halign: "center" } },
        { content: formatCurrency(dupa.unitPrice), styles: { fillColor: GREY_LIGHT, halign: "right" } },
        { content: formatCurrency(dupa.totalPrice), styles: { fillColor: GREY_LIGHT, halign: "right" } },
      ]);

      autoTable(doc, {
        startY: headerEnd,
        margin: dupaTableMargin,
        didParseCell: sanitizeAutoTableCell,
        theme: "grid",
        head: titleHead,
        body: titleBody,
        styles: { ...baseStyles, fontSize: 9 },
        headStyles: plainHeadStyles,
        columnStyles: sixColColumnStyles,
      });

      let y = (doc as any).lastAutoTable.finalY;

      const renderSection = (
        letter: string,
        sectionLabel: string,
        colHeaders: [string, string, string, string],
        rows: { desc: string; qty: number | string; unit: string; rate: number; total: number }[],
        subtotalLabel: string,
        subtotal: number,
      ) => {
        if (rows.length === 0) return;
        const body: any[][] = [];
        body.push([
          { content: letter, styles: { fontStyle: "bold" } },
          { content: sectionLabel, colSpan: 5, styles: { fontStyle: "bold" } },
        ]);
        body.push([
          { content: "Item No.", styles: { halign: "center" } },
          { content: "Description", styles: { halign: "center" } },
          { content: colHeaders[0], styles: { halign: "center" } },
          { content: colHeaders[1], styles: { halign: "center" } },
          { content: colHeaders[2], styles: { halign: "center" } },
          { content: colHeaders[3], styles: { halign: "center" } },
        ]);
        rows.forEach((r, i) => {
          body.push([
            { content: i + 1 },
            { content: r.desc },
            { content: r.qty },
            { content: r.unit },
            { content: formatCurrency(r.rate) },
            { content: formatCurrency(r.total) },
          ]);
        });
        body.push([
          { content: "" },
          { content: subtotalLabel, colSpan: 4, styles: { halign: "left" } },
          { content: formatCurrency(subtotal), styles: { halign: "right" } },
        ]);

        autoTable(doc, {
          startY: y,
          margin: dupaTableMargin,
          didParseCell: sanitizeAutoTableCell,
          theme: "grid",
          body,
          styles: baseStyles,
          columnStyles: sixColColumnStyles,
        });
        y = (doc as any).lastAutoTable.finalY;
      };

      if (!dupaHideMaterials) {
        const excludedM = dupaExcludedMaterials[dupa.id] || new Set();
        const materials = dupa.materials.filter((m) => !excludedM.has(m.id));
        renderSection(
          "A.", "Materials",
          ["Qty.", "Unit", "Unit Cost", "Total Cost"],
          materials.map((m) => ({ desc: m.description, qty: m.quantity, unit: m.unit, rate: m.unitCost, total: m.totalCost })),
          "(a) Total Cost of Materials",
          materials.reduce((s, m) => s + m.totalCost, 0),
        );
      }
      if (!dupaHideLabor) {
        const excludedL = dupaExcludedLabor[dupa.id] || new Set();
        const labor = dupa.labor.filter((l) => !excludedL.has(l.id));
        renderSection(
          "B.", "Labor",
          ["Man-Hours", "", "Wage Rate", "Total Cost"],
          labor.map((l) => ({ desc: l.description, qty: l.manDays, unit: "", rate: l.wageRate, total: l.totalCost })),
          "(b) Total Cost of Labor",
          labor.reduce((s, l) => s + l.totalCost, 0),
        );
      }
      if (!dupaHideEquipment) {
        const excludedE = dupaExcludedEquipment[dupa.id] || new Set();
        const equipment = dupa.equipment.filter((e) => !excludedE.has(e.id));
        renderSection(
          "C.", "Equipment Utilization",
          ["Utilization Period", "", "Utilization Rate", "Total Cost"],
          equipment.map((e) => ({ desc: e.description, qty: e.period, unit: "", rate: e.rate, total: e.totalCost })),
          "(c) Total Cost for Equipment Utilization",
          equipment.reduce((s, e) => s + e.totalCost, 0),
        );
      }

      if (!dupaHideSummary) {
        const summaryRows: { label: string; value: number; greyValue?: boolean }[] = [
          { label: "(d) Total Direct Costs = (a) + (b) + (c)", value: dupa.totalDirectCost, greyValue: true },
          { label: `(e) Indirect Costs: OCM and Profit (${dupa.indirectCostPercent}%)`, value: dupa.indirectCost, greyValue: true },
          { label: "(f) Total Direct and Indirect Costs = (d) + (e)", value: dupa.totalDirectAndIndirect },
          { label: `(g) Value Added Tax (${dupa.vatPercent}%)`, value: dupa.vat },
          { label: "(h) Total Price", value: dupa.totalPrice },
        ];
        const summaryBody: any[][] = summaryRows.map((r) => [
          { content: r.label, styles: { halign: "left" } },
          { content: formatCurrency(r.value), styles: { halign: "right", fillColor: r.greyValue ? GREY_MED : WHITE } },
        ]);
        autoTable(doc, {
          startY: y,
          margin: dupaTableMargin,
          didParseCell: sanitizeAutoTableCell,
          theme: "grid",
          body: summaryBody,
          styles: baseStyles,
          columnStyles: {
            0: { cellWidth: COL.itemNo + COL.desc + COL.qty + COL.unit + COL.rate, overflow: "linebreak" as const },
            1: { cellWidth: COL.total, halign: "right" as const, overflow: "visible" as const },
          },
        });
      }
    });
    
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      renderPdfSignatories(doc, selectedProject, printProfiles.dupa);
    }
    if (mode === "preview") return openPreview(doc, "DUPA");
    doc.save(`${selectedProject.name} - DUPA (Custom).pdf`);
    toast({ title: "DUPA PDF exported successfully" });
  };

  const runDoc = (doc: PrintDocType, mode: "save" | "preview") => {
    if (doc === "abc") generateABCPdf(mode);
    else if (doc === "dupa") generateDUPAPdf(mode);
    else if (doc === "boq") generateBOQPdf(mode);
    else if (doc === "scurve") generateSCurvePdf(mode);
  };

  const handleExport = () => {
    if (activeTab === "abc") generateABCPdf("save");
    else if (activeTab === "dupa") generateDUPAPdf("save");
    else if (activeTab === "boq") generateBOQPdf("save");
    else if (activeTab === "scurve") generateSCurvePdf("save");
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Print & Export</h1>
          <p className="text-sm text-muted-foreground">Customize what to include in your PDF export</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="max-w-md flex-1">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {localProjects.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">Local Projects</SelectLabel>
                    {localProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                
                {collabDocs.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground mt-2">Cloud / Shared Projects</SelectLabel>
                    {collabDocs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        ☁️ {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="abc">ABC</TabsTrigger>
              <TabsTrigger value="dupa">DUPA</TabsTrigger>
              <TabsTrigger value="boq">BOQ</TabsTrigger>
              <TabsTrigger value="scurve">S-Curve</TabsTrigger>
              <TabsTrigger value="header">Header &amp; Footer</TabsTrigger>
            </TabsList>
            {activeTab !== "header" && (
              <Button onClick={handleExport} disabled={!selectedProject} size="sm" className="gap-2">
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            )}
          </div>

          <TabsContent value="abc">
            <div className="mb-2 text-xs text-muted-foreground">
              Edit the ABC header, footer & signatory layout in the{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => { setEditingDoc("abc"); setActiveTab("header"); }}
              >
                Header &amp; Footer
              </button>{" "}
              tab — it has its own preview tuned for landscape legal paper.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Layout Version</CardTitle>
                    <CardDescription className="text-xs">Choose how the ABC table header looks.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="abcVersion"
                        checked={!abcSimpleVersion}
                        onChange={() => {
                          setAbcSimpleVersion(false);
                          setAbcVisibleColumns(new Set(ABC_COLUMNS.filter((c) => c.default).map((c) => c.key)));
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">Detailed (default)</span>
                        <span className="block text-xs text-muted-foreground">Grouped markup headers, numbered reference row, and formulas.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="abcVersion"
                        checked={abcSimpleVersion}
                        onChange={() => {
                          setAbcSimpleVersion(true);
                          setAbcVisibleColumns(new Set(ABC_COLUMNS_SIMPLE.filter((c) => c.default).map((c) => c.key)));
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">Simple</span>
                        <span className="block text-xs text-muted-foreground">Flat single-row header, includes VAT % column, no formulas.</span>
                      </span>
                    </label>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Columns</CardTitle>
                    <CardDescription className="text-xs">Toggle columns to include</CardDescription>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllAbcCols}>All</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={deselectAllAbcCols}>Minimal</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {abcColumnsActive.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2">
                        <Checkbox
                          checked={abcVisibleColumns.has(col.key)}
                          onCheckedChange={() => toggleAbcColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> PDF Colors</CardTitle>
                    <CardDescription className="text-xs">Customize colors for the exported PDF</CardDescription>
                    <Button variant="outline" size="sm" className="text-xs h-7 mt-1 w-fit" onClick={() => setColors({ ...DEFAULT_COLORS })}>Reset to Default</Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {([
                      ["abcHeaderBg", "Header Background"],
                      ["abcHeaderText", "Header Text"],
                      ["abcCategoryBg", "Category Row Background"],
                      ["abcCategoryText", "Category Row Text"],
                      ["abcSubtotalBg", "Subtotal Background"],
                      ["abcSubtotalText", "Subtotal Text"],
                      ["abcGrandTotalBg", "Grand Total Background"],
                      ["abcGrandTotalText", "Grand Total Text"],
                    ] as [keyof PdfColorSettings, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="h-7 w-7 rounded border border-input cursor-pointer shrink-0"
                        />
                        <span className="text-xs">{label}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {!abcSimpleVersion && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Header Formulas</CardTitle>
                    <CardDescription className="text-xs">Shown under each computed column. Leave blank to hide.</CardDescription>
                    <Button variant="outline" size="sm" className="text-xs h-7 mt-1 w-fit" onClick={() => setAbcFormulas({ ...DEFAULT_ABC_FORMULAS })}>Reset to Default</Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.keys(DEFAULT_ABC_FORMULAS).map((key) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs text-muted-foreground">{ABC_FORMULA_LABELS[key] ?? key}</label>
                        <Input
                          value={abcFormulas[key] ?? ""}
                          onChange={(e) => setAbcFormulas((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="h-7 text-xs font-mono"
                          placeholder={DEFAULT_ABC_FORMULAS[key]}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
                )}
              </div>

              <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Rows</CardTitle>
                      <CardDescription className="text-xs">Uncheck rows to exclude from PDF</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllAbcRows}>Select All</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={deselectAllAbcRows}>Deselect All</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] overflow-auto overscroll-contain rounded-md border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="w-8 p-1"></th>
                          {abcColumnsActive.filter((c) => abcVisibleColumns.has(c.key)).map((col) => (
                            <th key={col.key} className="p-1 text-left font-medium text-muted-foreground">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderedAbcItems.map((item) => {
                          const excluded = abcExcludedRows.has(item.id);
                          return (
                            <tr
                              key={item.id}
                              className={`border-b transition-colors ${excluded ? "opacity-30" : ""} ${item.isCategory ? "bg-muted/50 font-semibold" : ""}`}
                            >
                              <td className="p-1">
                                <Checkbox
                                  checked={!excluded}
                                  onCheckedChange={() => toggleAbcRow(item.id)}
                                />
                              </td>
                              {abcColumnsActive.filter((c) => abcVisibleColumns.has(c.key)).map((col) => {
                                const val = (item as any)[col.key];
                                const isPercent = col.key.includes("Percent") || col.key === "ocmPercent" || col.key === "profitPercent" || col.key === "vatPercent";
                                const isNum = typeof val === "number" && !isPercent;
                                return (
                                  <td key={col.key} className={`p-1 ${isNum ? "text-right" : ""}`}>
                                    {item.isCategory && col.key !== "itemNo" && col.key !== "description"
                                      ? ""
                                      : isPercent
                                        ? `${val}%`
                                        : isNum
                                          ? formatCurrency(val)
                                          : val}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Preview (below rows) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Sample Preview</CardTitle>
                  <CardDescription className="text-xs">Live preview of PDF colors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden text-[10px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr style={{ background: colors.abcHeaderBg, color: colors.abcHeaderText }}>
                          <th className="px-2 py-1 text-left font-semibold border border-border/50">Item</th>
                          <th className="px-2 py-1 text-left font-semibold border border-border/50">Description</th>
                          <th className="px-2 py-1 text-right font-semibold border border-border/50">Qty</th>
                          <th className="px-2 py-1 text-left font-semibold border border-border/50">Unit</th>
                          <th className="px-2 py-1 text-right font-semibold border border-border/50">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: colors.abcCategoryBg, color: colors.abcCategoryText }}>
                          <td className="px-2 py-1 font-semibold border border-border/50" colSpan={5}>I. Earthworks</td>
                        </tr>
                        <tr className="bg-background text-foreground">
                          <td className="px-2 py-1 border border-border/50">1.1</td>
                          <td className="px-2 py-1 border border-border/50">Excavation</td>
                          <td className="px-2 py-1 text-right border border-border/50">10</td>
                          <td className="px-2 py-1 border border-border/50">cu.m</td>
                          <td className="px-2 py-1 text-right border border-border/50">1,000.00</td>
                        </tr>
                        <tr className="bg-background text-foreground">
                          <td className="px-2 py-1 border border-border/50">1.2</td>
                          <td className="px-2 py-1 border border-border/50">Backfilling</td>
                          <td className="px-2 py-1 text-right border border-border/50">5</td>
                          <td className="px-2 py-1 border border-border/50">cu.m</td>
                          <td className="px-2 py-1 text-right border border-border/50">500.00</td>
                        </tr>
                        <tr style={{ background: colors.abcSubtotalBg, color: colors.abcSubtotalText }}>
                          <td className="px-2 py-1 font-semibold border border-border/50" colSpan={4}>Subtotal</td>
                          <td className="px-2 py-1 text-right font-semibold border border-border/50">1,500.00</td>
                        </tr>
                        <tr style={{ background: colors.abcCategoryBg, color: colors.abcCategoryText }}>
                          <td className="px-2 py-1 font-semibold border border-border/50" colSpan={5}>II. Concrete Works</td>
                        </tr>
                        <tr className="bg-background text-foreground">
                          <td className="px-2 py-1 border border-border/50">2.1</td>
                          <td className="px-2 py-1 border border-border/50">Footing</td>
                          <td className="px-2 py-1 text-right border border-border/50">3</td>
                          <td className="px-2 py-1 border border-border/50">cu.m</td>
                          <td className="px-2 py-1 text-right border border-border/50">2,000.00</td>
                        </tr>
                        <tr className="bg-background text-foreground">
                          <td className="px-2 py-1 border border-border/50">2.2</td>
                          <td className="px-2 py-1 border border-border/50">Slab on grade</td>
                          <td className="px-2 py-1 text-right border border-border/50">8</td>
                          <td className="px-2 py-1 border border-border/50">sq.m</td>
                          <td className="px-2 py-1 text-right border border-border/50">3,500.00</td>
                        </tr>
                        <tr style={{ background: colors.abcSubtotalBg, color: colors.abcSubtotalText }}>
                          <td className="px-2 py-1 font-semibold border border-border/50" colSpan={4}>Subtotal</td>
                          <td className="px-2 py-1 text-right font-semibold border border-border/50">5,500.00</td>
                        </tr>
                        <tr style={{ background: colors.abcGrandTotalBg, color: colors.abcGrandTotalText }}>
                          <td className="px-2 py-1 font-bold border border-border/50" colSpan={4}>GRAND TOTAL</td>
                          <td className="px-2 py-1 text-right font-bold border border-border/50">7,000.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dupa">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">DUPA Pages</CardTitle>
                    <CardDescription className="text-xs">Select which DUPA sheets to include</CardDescription>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllDupaPages}>All</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={deselectAllDupaPages}>None</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortByItemNo(selectedProject.dupaItems).map((dupa) => (
                      <label key={dupa.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2">
                        <Checkbox
                          checked={dupaSelectedPages.has(dupa.id)}
                          onCheckedChange={() => toggleDupaPage(dupa.id)}
                        />
                        <span className="truncate">
                          <span className="font-medium">{dupa.itemNo}</span> — {dupa.description}
                        </span>
                      </label>
                    ))}
                    {selectedProject.dupaItems.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No DUPA sheets in this project.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sections</CardTitle>
                    <CardDescription className="text-xs">Toggle entire sections on/off</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={!dupaHideMaterials} onCheckedChange={() => setDupaHideMaterials(!dupaHideMaterials)} />
                      A. Materials
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={!dupaHideLabor} onCheckedChange={() => setDupaHideLabor(!dupaHideLabor)} />
                      B. Labor
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={!dupaHideEquipment} onCheckedChange={() => setDupaHideEquipment(!dupaHideEquipment)} />
                      C. Equipment
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={!dupaHideSummary} onCheckedChange={() => setDupaHideSummary(!dupaHideSummary)} />
                      Summary
                    </label>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> PDF Colors</CardTitle>
                    <CardDescription className="text-xs">Customize colors for DUPA PDF</CardDescription>
                    <Button variant="outline" size="sm" className="text-xs h-7 mt-1 w-fit" onClick={() => setColors(prev => ({ ...prev, dupaHeaderBg: DEFAULT_COLORS.dupaHeaderBg, dupaHeaderText: DEFAULT_COLORS.dupaHeaderText, dupaSectionLabelColor: DEFAULT_COLORS.dupaSectionLabelColor, dupaFooterBg: DEFAULT_COLORS.dupaFooterBg, dupaFooterText: DEFAULT_COLORS.dupaFooterText, dupaSummaryAltBg: DEFAULT_COLORS.dupaSummaryAltBg }))}>Reset</Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {([
                      ["dupaHeaderBg", "Table Header Background"],
                      ["dupaHeaderText", "Table Header Text"],
                      ["dupaSectionLabelColor", "Section Label Color"],
                      ["dupaFooterBg", "Subtotal Background"],
                      ["dupaFooterText", "Subtotal Text"],
                      ["dupaSummaryAltBg", "Summary Alt Row"],
                    ] as [keyof PdfColorSettings, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="h-7 w-7 rounded border border-input cursor-pointer shrink-0"
                        />
                        <span className="text-xs">{label}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Row-level Customization</CardTitle>
                  <CardDescription className="text-xs">Uncheck individual rows to exclude from each DUPA page</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-6">
                      {sortByItemNo(selectedProject.dupaItems)
                        .filter((d) => dupaSelectedPages.has(d.id))
                        .map((dupa) => (
                          <div key={dupa.id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary" className="text-xs">{dupa.itemNo}</Badge>
                              <span className="text-sm font-medium">{dupa.description}</span>
                            </div>

                            {!dupaHideMaterials && dupa.materials.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">A. Materials</p>
                                {dupa.materials.map((m) => {
                                  const excluded = (dupaExcludedMaterials[dupa.id] || new Set()).has(m.id);
                                  return (
                                    <label
                                      key={m.id}
                                      className={`flex items-center gap-2 text-xs cursor-pointer py-0.5 ${excluded ? "opacity-30" : ""}`}
                                    >
                                      <Checkbox
                                        checked={!excluded}
                                        onCheckedChange={() => toggleDupaSubRow(dupa.id, m.id, "materials")}
                                      />
                                      <span className="flex-1">{m.description}</span>
                                      <span className="text-muted-foreground">{m.quantity} {m.unit}</span>
                                      <span>₱{formatCurrency(m.totalCost)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {!dupaHideLabor && dupa.labor.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">B. Labor</p>
                                {dupa.labor.map((l) => {
                                  const excluded = (dupaExcludedLabor[dupa.id] || new Set()).has(l.id);
                                  return (
                                    <label
                                      key={l.id}
                                      className={`flex items-center gap-2 text-xs cursor-pointer py-0.5 ${excluded ? "opacity-30" : ""}`}
                                    >
                                      <Checkbox
                                        checked={!excluded}
                                        onCheckedChange={() => toggleDupaSubRow(dupa.id, l.id, "labor")}
                                      />
                                      <span className="flex-1">{l.description}</span>
                                      <span className="text-muted-foreground">{l.manDays} days</span>
                                      <span>₱{formatCurrency(l.totalCost)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {!dupaHideEquipment && dupa.equipment.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">C. Equipment</p>
                                {dupa.equipment.map((e) => {
                                  const excluded = (dupaExcludedEquipment[dupa.id] || new Set()).has(e.id);
                                  return (
                                    <label
                                      key={e.id}
                                      className={`flex items-center gap-2 text-xs cursor-pointer py-0.5 ${excluded ? "opacity-30" : ""}`}
                                    >
                                      <Checkbox
                                        checked={!excluded}
                                        onCheckedChange={() => toggleDupaSubRow(dupa.id, e.id, "equipment")}
                                      />
                                      <span className="flex-1">{e.description}</span>
                                      <span className="text-muted-foreground">{e.period} period</span>
                                      <span>₱{formatCurrency(e.totalCost)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      {selectedProject.dupaItems.filter((d) => dupaSelectedPages.has(d.id)).length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-8">
                          No DUPA pages selected. Select pages from the left panel.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Sample Preview</CardTitle>
                  <CardDescription className="text-xs">Live preview of DUPA colors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden text-[10px] space-y-2 p-2">
                    <div>
                      <div className="font-semibold mb-1" style={{ color: colors.dupaSectionLabelColor }}>A. Materials</div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: colors.dupaHeaderBg, color: colors.dupaHeaderText }}>
                            <th className="px-2 py-1 text-left font-semibold border border-border/50">Description</th>
                            <th className="px-2 py-1 text-left font-semibold border border-border/50">Unit</th>
                            <th className="px-2 py-1 text-right font-semibold border border-border/50">Qty</th>
                            <th className="px-2 py-1 text-right font-semibold border border-border/50">Price</th>
                            <th className="px-2 py-1 text-right font-semibold border border-border/50">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-background text-foreground">
                            <td className="px-2 py-1 border border-border/50">Cement</td>
                            <td className="px-2 py-1 border border-border/50">bag</td>
                            <td className="px-2 py-1 text-right border border-border/50">10</td>
                            <td className="px-2 py-1 text-right border border-border/50">250.00</td>
                            <td className="px-2 py-1 text-right border border-border/50">2,500.00</td>
                          </tr>
                          <tr className="bg-background text-foreground">
                            <td className="px-2 py-1 border border-border/50">Sand</td>
                            <td className="px-2 py-1 border border-border/50">cu.m</td>
                            <td className="px-2 py-1 text-right border border-border/50">2</td>
                            <td className="px-2 py-1 text-right border border-border/50">800.00</td>
                            <td className="px-2 py-1 text-right border border-border/50">1,600.00</td>
                          </tr>
                          <tr style={{ background: colors.dupaFooterBg, color: colors.dupaFooterText }}>
                            <td className="px-2 py-1 font-semibold border border-border/50" colSpan={4}>Sub-total</td>
                            <td className="px-2 py-1 text-right font-semibold border border-border/50">4,100.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <div className="font-semibold mb-1" style={{ color: colors.dupaSectionLabelColor }}>B. Labor</div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: colors.dupaHeaderBg, color: colors.dupaHeaderText }}>
                            <th className="px-2 py-1 text-left font-semibold border border-border/50">Description</th>
                            <th className="px-2 py-1 text-right font-semibold border border-border/50">Days</th>
                            <th className="px-2 py-1 text-right font-semibold border border-border/50">Rate</th>
                            <th className="px-2 py-1 text-right font-semibold border border-border/50">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-background text-foreground">
                            <td className="px-2 py-1 border border-border/50">Mason</td>
                            <td className="px-2 py-1 text-right border border-border/50">2</td>
                            <td className="px-2 py-1 text-right border border-border/50">600.00</td>
                            <td className="px-2 py-1 text-right border border-border/50">1,200.00</td>
                          </tr>
                          <tr style={{ background: colors.dupaFooterBg, color: colors.dupaFooterText }}>
                            <td className="px-2 py-1 font-semibold border border-border/50" colSpan={3}>Sub-total</td>
                            <td className="px-2 py-1 text-right font-semibold border border-border/50">1,200.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr className="bg-background text-foreground">
                          <td className="px-2 py-1 border border-border/50">Total Direct Cost</td>
                          <td className="px-2 py-1 text-right border border-border/50">5,300.00</td>
                        </tr>
                        <tr style={{ background: colors.dupaSummaryAltBg }}>
                          <td className="px-2 py-1 border border-border/50">Indirect Cost (15%)</td>
                          <td className="px-2 py-1 text-right border border-border/50">795.00</td>
                        </tr>
                        <tr className="bg-background text-foreground">
                          <td className="px-2 py-1 border border-border/50">VAT (5%)</td>
                          <td className="px-2 py-1 text-right border border-border/50">304.75</td>
                        </tr>
                        <tr style={{ background: colors.dupaSummaryAltBg }}>
                          <td className="px-2 py-1 font-bold border border-border/50">Total Price</td>
                          <td className="px-2 py-1 text-right font-bold border border-border/50">6,399.75</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="boq">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bill of Quantities</CardTitle>
                <CardDescription className="text-xs">
                  Exports all ABC items with only Item No. and Description filled in. All numeric columns (Qty, Unit, Materials, etc.) will have headers but blank data — ready for manual filling.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllAbcRows}>Select All Rows</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={deselectAllAbcRows}>Deselect All</Button>
                </div>
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="w-8 p-1"></th>
                        <th className="p-1 text-left font-medium text-muted-foreground">Item No.</th>
                        <th className="p-1 text-left font-medium text-muted-foreground">Description</th>
                        <th className="p-1 text-left font-medium text-muted-foreground">Qty</th>
                        <th className="p-1 text-left font-medium text-muted-foreground">Unit</th>
                        <th className="p-1 text-left font-medium text-muted-foreground">Total Cost</th>
                        <th className="p-1 text-left font-medium text-muted-foreground">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedAbcItems.map((item) => {
                        const excluded = abcExcludedRows.has(item.id);
                        return (
                          <tr key={item.id} className={`border-b ${excluded ? "opacity-30" : ""} ${item.isCategory ? "bg-muted/50 font-semibold" : ""}`}>
                            <td className="p-1">
                              <Checkbox checked={!excluded} onCheckedChange={() => toggleAbcRow(item.id)} />
                            </td>
                            <td className="p-1">{item.itemNo}</td>
                            <td className="p-1">{item.description}</td>
                            <td className="p-1 text-muted-foreground/50">{item.isCategory ? "" : "(blank)"}</td>
                            <td className="p-1 text-muted-foreground/50">{item.isCategory ? "" : "(blank)"}</td>
                            <td className="p-1 text-muted-foreground/50">{item.isCategory ? "" : "(blank)"}</td>
                            <td className="p-1 text-muted-foreground/50">{item.isCategory ? "" : "(blank)"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* S-Curve Tab */}
          <TabsContent value="scurve">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">S-Curve / Project Schedule</CardTitle>
                <CardDescription className="text-xs">
                  Pick a saved S-Curve version below — the preview shows exactly how it will print, and Export PDF captures this view.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Version:</Label>
                  <Select value={scurveSelectedId} onValueChange={setScurveSelectedId}>
                    <SelectTrigger className="h-8 text-xs w-[280px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__current__">Current (unsaved working schedule)</SelectItem>
                      {scurveSnapshots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {new Date(s.createdAt).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scurveSnapshots.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      No saved versions yet. Save one from the project's S-Curve view.
                    </span>
                  )}
                </div>
                <div ref={scurvePreviewRef} className="rounded-md border bg-background p-2 overflow-auto max-h-[600px]">
                  <SCurve
                    key={scurveSelectedId}
                    project={selectedProject}
                    hideControls
                    initialSnapshot={scurveSnapshots.find((s) => s.id === scurveSelectedId) ?? null}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="header">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Print Header &amp; Footer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={editingDoc} onValueChange={(v) => setEditingDoc(v as PrintDocType)}>
                  <TabsList className="grid w-full grid-cols-4">
                    {(["abc", "dupa", "boq", "scurve"] as PrintDocType[]).map((d) => {
                      const hasOverride = !!selectedProject?.printProfileOverrides?.[d];
                      return (
                        <TabsTrigger key={d} value={d} className="relative">
                          {DOC_PAGE[d].label}
                          {hasOverride && printScope === "project" && (
                            <span className="absolute right-1.5 top-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Project override saved" />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                  <Select
                    value={appliedTemplateId[editingDoc]}
                    onValueChange={(v) => applyPrintTemplate(v)}
                  >
                    <SelectTrigger className="h-8 w-[240px] text-xs">
                      <SelectValue placeholder={`Templates (${DOC_PAGE[editingDoc].label})…`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-muted-foreground text-[10px]">Built-in</SelectLabel>
                        {builtInTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>

                      {cloudTemplates[editingDoc].length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-muted-foreground text-[10px] mt-2 border-t pt-1">☁️ Cloud (Shared)</SelectLabel>
                          {cloudTemplates[editingDoc].map((t) => (
                            <div key={t.id} className="flex items-center pr-1">
                              <SelectItem value={t.id} className="flex-1">
                                {t.name}
                              </SelectItem>
                              <button
                                type="button"
                                className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Delete shared template"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm(`Delete shared template "${t.name}"? This will delete it for EVERYONE.`)) handleDeleteTemplate(t.id, true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </SelectGroup>
                      )}

                      {customTemplates[editingDoc].length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-muted-foreground text-[10px] mt-2 border-t pt-1">💻 Local (Just You)</SelectLabel>
                          {customTemplates[editingDoc].map((t) => (
                            <div key={t.id} className="flex items-center pr-1">
                              <SelectItem value={t.id} className="flex-1">
                                {t.name}
                              </SelectItem>
                              <button
                                type="button"
                                className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Delete local template"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm(`Delete local template "${t.name}"?`)) handleDeleteTemplate(t.id, false);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" onClick={openSaveTemplateDialog}>
                    Save as template
                  </Button>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => runDoc(editingDoc, "preview")}
                    >
                      <Eye />
                      Preview {DOC_PAGE[editingDoc].label} PDF
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" size="sm" variant="outline">
                          <RotateCcw />
                          Reset to defaults
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will replace the current {DOC_PAGE[editingDoc].label} settings with the built-in defaults.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              setDocSettings(editingDoc, { ...DEFAULT_PRINT_SETTINGS });
                              setAppliedTemplateId((prev) => ({ ...prev, [editingDoc]: "__builtin_default" }));
                            }}
                          >
                            Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <PrintSettingsEditor
                  key={editingDoc}
                  value={printProfiles[editingDoc]}
                  onChange={(next) => setDocSettings(editingDoc, next)}
                  embedded
                  project={selectedProject}
                  orientation={DOC_PAGE[editingDoc].orientation}
                  format={DOC_PAGE[editingDoc].format}
                  previewTitle={
                    editingDoc === "abc"
                      ? "APPROVED BUDGET FOR THE CONTRACT"
                      : editingDoc === "dupa"
                      ? "DETAILED UNIT PRICE ANALYSIS"
                      : editingDoc === "boq"
                      ? "BILL OF QUANTITIES"
                      : "S-CURVE / PROJECT SCHEDULE"
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
      )}

      {!selectedProject && (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <Printer className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Select a project above to start customizing your print output.</p>
          </CardContent>
        </Card>
      )}

      {/* Save Template Dialog */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Save the current {DOC_PAGE[editingDoc].label} settings as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                autoFocus
                placeholder="Template name (e.g., Project Engineer Layout)"
                value={saveTplName}
                onChange={(e) => setSaveTplName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && saveTplName.trim()) confirmSaveTemplate(); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Save Location</Label>
              <Select value={saveTplLocation} onValueChange={(v: any) => setSaveTplLocation(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud">☁️ Cloud (Share with everyone)</SelectItem>
                  <SelectItem value="local">💻 Local (Only on this device)</SelectItem>
                </SelectContent>
              </Select>
              {saveTplLocation === "cloud" && (
                <p className="text-[11px] text-muted-foreground">
                  This will instantly sync to all users via Firebase. Great for company logos!
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTplOpen(false)}>Cancel</Button>
            <Button onClick={confirmSaveTemplate} disabled={!saveTplName.trim()}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}