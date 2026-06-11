import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Copy, BarChart3, Search, Filter, Download, Upload } from "lucide-react";
import { exportPriceListYearToExcel, importPriceListFromExcel } from "@/lib/pricelistExcel";
import { toast } from "@/hooks/use-toast";
import { createDefaultPriceList } from "@/lib/sampleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Project, PriceListYear, PriceListCategory, PriceListItem } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { UnitCombobox } from "@/components/ui/unit-combobox";

interface PriceListProps {
  project: Project;
  compact?: boolean;
  onSave?: (p: Project) => void;
}

const STORAGE_KEY = "costmgr_pricelist";

const PRICELIST_INIT_KEY = "costmgr_pricelist_init_v1";

export function loadPriceList(): PriceListYear[] {
  
  if (!localStorage.getItem(PRICELIST_INIT_KEY)) {
    localStorage.setItem(PRICELIST_INIT_KEY, "true");
    const existing = localStorage.getItem(STORAGE_KEY);
    const years: PriceListYear[] = existing ? JSON.parse(existing) : [];
    if (years.length === 0) {
      const defaultYear = createDefaultPriceList();
      years.push(defaultYear);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(years));
    }
  }
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function savePriceList(years: PriceListYear[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(years));
  
  import("@/lib/specBackfill").then((m) => m.invalidateSpecLookup()).catch(() => {});
}

export default function PriceList({ project, compact, onSave }: PriceListProps) {
  const [years, setYears] = useState<PriceListYear[]>(() => loadPriceList());
  const [activeYearId, setActiveYearId] = useState<string>("");
  const [newYearName, setNewYearName] = useState("");
  const [addYearOpen, setAddYearOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "item" | "category" | "year"; id: string } | null>(null);
  const [copyYearOpen, setCopyYearOpen] = useState(false);
  const [copyYearName, setCopyYearName] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareYear1, setCompareYear1] = useState("");
  const [compareYear2, setCompareYear2] = useState("");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // New state for filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("none");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemCategoryId, setAddItemCategoryId] = useState("");
  const [addItemNewCatName, setAddItemNewCatName] = useState("");
  const [addItemDesc, setAddItemDesc] = useState("");
  const [addItemExtraDesc1, setAddItemExtraDesc1] = useState("");
  const [addItemExtraDesc2, setAddItemExtraDesc2] = useState("");
  const [addItemUnit, setAddItemUnit] = useState("");
  const [addItemMarketPrice, setAddItemMarketPrice] = useState("");
  const [addItemMarkupPrice, setAddItemMarkupPrice] = useState("");

  // Compare dialog search/filter
  const [compareSearch, setCompareSearch] = useState("");
  const [compareFilterCat, setCompareFilterCat] = useState<string>("all");
  const [compareSortBy, setCompareSortBy] = useState<"description" | "diff" | "pct">("description");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!activeYear) return;
    exportPriceListYearToExcel(activeYear);
    toast({ title: `Exported ${activeYear.year}` });
  };

  const handleImportClick = () => {
    if (!activeYear) {
      toast({ title: "Add a year first", description: "Create a year before importing.", variant: "destructive" });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeYear) return;
    try {
      const { categories: newCats, items: newItems, importedCount } = await importPriceListFromExcel(file);
      
      setYears(years.map((y) => {
        if (y.id !== activeYearId) return y;
        const catNameMap = new Map<string, string>();
        y.categories.forEach((c) => catNameMap.set(c.name.toLowerCase(), c.id));
        const addedCats: PriceListCategory[] = [];
        let nextOrder = y.categories.length;
        newCats.forEach((nc) => {
          const key = nc.name.toLowerCase();
          if (!catNameMap.has(key)) {
            const created: PriceListCategory = { ...nc, order: nextOrder++ };
            catNameMap.set(key, created.id);
            addedCats.push(created);
          }
        });
        const remappedItems = newItems.map((it) => {
          const orig = newCats.find((c) => c.id === it.categoryId);
          const mappedId = orig ? catNameMap.get(orig.name.toLowerCase())! : it.categoryId;
          return { ...it, categoryId: mappedId };
        });
        return { ...y, categories: [...y.categories, ...addedCats], items: [...y.items, ...remappedItems] };
      }));
      toast({ title: `Imported ${importedCount} items into ${activeYear.year}` });
    } catch (err) {
      toast({ title: "Import failed", description: "Could not read the file.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    savePriceList(years);
  }, [years]);

  useEffect(() => {
    if (years.length > 0 && !years.find((y) => y.id === activeYearId)) {
      const preferred = project.activePriceListYearId && years.find((y) => y.id === project.activePriceListYearId)
        ? project.activePriceListYearId
        : years[0].id;
      setActiveYearId(preferred);
    }
  }, [years, activeYearId, project.activePriceListYearId]);

  const activeYear = years.find((y) => y.id === activeYearId);

  const handleAddYear = () => {
    if (!newYearName.trim()) return;
    const year: PriceListYear = {
      id: crypto.randomUUID(),
      year: newYearName.trim(),
      categories: [],
      items: [],
    };
    setYears([...years, year]);
    setActiveYearId(year.id);
    setNewYearName("");
    setAddYearOpen(false);
  };

  const handleCopyYear = () => {
    if (!activeYear) return;
    const name = copyYearName.trim();
    if (!name) return;
    // Guard: prevent duplicate year names — they confuse the year selector and
    // the comparison dialog.
    if (years.some((y) => y.year.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Year name already exists", description: "Pick a different name.", variant: "destructive" });
      return;
    }

    
    const clone: PriceListYear = JSON.parse(JSON.stringify(activeYear));

    
    const catIdMap = new Map<string, string>();
    const newCategories: PriceListCategory[] = clone.categories
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c, idx) => {
        const newId = crypto.randomUUID();
        catIdMap.set(c.id, newId);
        return { ...c, id: newId, sourceCategoryId: c.sourceCategoryId ?? c.id, order: idx };
      });

    
    let uncategorizedId: string | null = null;
    const ensureUncategorized = (): string => {
      if (uncategorizedId) return uncategorizedId;
      uncategorizedId = crypto.randomUUID();
      newCategories.push({ id: uncategorizedId, name: "Uncategorized", order: newCategories.length });
      return uncategorizedId;
    };

    const newItems: PriceListItem[] = clone.items.map((item) => {
      const mapped = catIdMap.get(item.categoryId);
      return {
        ...item,
        id: crypto.randomUUID(),
        sourceItemId: item.sourceItemId ?? item.id,
        categoryId: mapped ?? ensureUncategorized(),
      };
    });

    const copied: PriceListYear = {
      id: crypto.randomUUID(),
      year: name,
      categories: newCategories,
      items: newItems,
    };

    setYears([...years, copied]);
    setActiveYearId(copied.id);
    setCopyYearName("");
    setCopyYearOpen(false);
    toast({ title: `Copied to ${name}`, description: `${newItems.length} items, ${newCategories.length} categories.` });
  };

  const handleAddCategory = () => {
    if (!activeYear || !newCatName.trim()) return;
    const cat: PriceListCategory = {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      order: activeYear.categories.length,
    };
    setYears(years.map((y) => y.id === activeYearId ? { ...y, categories: [...y.categories, cat] } : y));
    // Auto-select the newly created category in the filter so the user sees it immediately
    setFilterCategory(cat.id);
    setNewCatName("");
    setAddCategoryOpen(false);
  };

  const handleAddItem = (categoryId: string) => {
    if (!activeYear) return;
    // Open the Add Item dialog pre-selected with this category, so users get
    // the same flow as the top-level "+ Add Item" button.
    setAddItemOpen(true);
    setAddItemCategoryId(categoryId);
    setAddItemNewCatName("");
    setAddItemDesc("");
    setAddItemExtraDesc1("");
    setAddItemExtraDesc2("");
    setAddItemUnit("");
    setAddItemMarketPrice("");
    setAddItemMarkupPrice("");
  };

  const handleAddItemWithCategory = () => {
    if (!activeYear) return;
    let catId = addItemCategoryId;
    // Create new category if needed
    if (catId === "__new__") {
      if (!addItemNewCatName.trim()) return;
      const newCat: PriceListCategory = {
        id: crypto.randomUUID(),
        name: addItemNewCatName.trim(),
        order: activeYear.categories.length,
      };
      setYears(years.map((y) => y.id === activeYearId ? { ...y, categories: [...y.categories, newCat] } : y));
      catId = newCat.id;
    }
    if (!catId) return;
    const item: PriceListItem = {
      id: crypto.randomUUID(),
      description: addItemDesc,
      extraDesc1: addItemExtraDesc1,
      extraDesc2: addItemExtraDesc2,
      unit: addItemUnit,
      marketPrice: parseFloat(addItemMarketPrice) || 0,
      markupPrice: parseFloat(addItemMarkupPrice) || 0,
      categoryId: catId,
    };
    setYears(years.map((y) => y.id === activeYearId ? { ...y, items: [...y.items, item] } : y));
    
    
    if (filterCategory !== "all") setFilterCategory(catId);
    setAddItemOpen(false);
    setAddItemCategoryId("");
    setAddItemNewCatName("");
    setAddItemDesc("");
    setAddItemExtraDesc1("");
    setAddItemExtraDesc2("");
    setAddItemUnit("");
    setAddItemMarketPrice("");
    setAddItemMarkupPrice("");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || !activeYear) return;
    if (deleteTarget.type === "item") {
      setYears(years.map((y) => y.id === activeYearId ? { ...y, items: y.items.filter((i) => i.id !== deleteTarget.id) } : y));
    } else if (deleteTarget.type === "category") {
      setYears(years.map((y) => y.id === activeYearId ? {
        ...y,
        categories: y.categories.filter((c) => c.id !== deleteTarget.id),
        items: y.items.filter((i) => i.categoryId !== deleteTarget.id),
      } : y));
    } else if (deleteTarget.type === "year") {
      const newYears = years.filter((y) => y.id !== deleteTarget.id);
      setYears(newYears);
      if (activeYearId === deleteTarget.id && newYears.length > 0) {
        setActiveYearId(newYears[0].id);
      }
    }
    setDeleteTarget(null);
  };

  const updateItem = (itemId: string, field: keyof PriceListItem, value: string | number) => {
    setYears(years.map((y) => y.id === activeYearId ? {
      ...y,
      items: y.items.map((i) => {
        if (i.id !== itemId) return i;
        const numFields = ["marketPrice", "markupPrice"];
        return { ...i, [field]: numFields.includes(field) ? (parseFloat(value as string) || 0) : value };
      }),
    } : y));
  };

  const startEdit = (id: string, field: string, value: string | number) => {
    setEditingCell({ id, field });
    setEditValue(String(value));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    updateItem(editingCell.id, editingCell.field as keyof PriceListItem, editValue);
    setEditingCell(null);
  };

  const renderEditableCell = (item: PriceListItem, field: keyof PriceListItem, isNumeric = false) => {
    const value = item[field];
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;

    if (isEditing) {
      if (field === "unit") {
        return (
          <UnitCombobox
            size="sm"
            value={String(editValue ?? "")}
            onChange={(v) => {
              updateItem(item.id, "unit", v);
              setEditingCell(null);
            }}
          />
        );
      }
      return (
        <Input
          autoFocus
          className="h-7 text-sm w-full min-w-[60px]"
          type={isNumeric ? "number" : "text"}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
        />
      );
    }

    return (
      <span
        className={`cursor-pointer hover:bg-accent/20 px-1 py-0.5 rounded block border border-dashed border-primary/30 bg-background ${isNumeric ? "text-right" : ""}`}
        onClick={() => startEdit(item.id, field, value as string | number)}
      >
        {isNumeric ? `${formatCurrency(value as number)}` : (value as string) || <span className="text-muted-foreground italic">—</span>}
      </span>
    );
  };

  // dito banda yung peso sign ₱ sa taas return
  const getFilteredCategories = (year: PriceListYear) => {
    if (filterCategory === "" || filterCategory === "none") return [];
    if (filterCategory === "all") return year.categories;
    return year.categories.filter((c) => c.id === filterCategory);
  };

  const getFilteredItems = (yearItems: PriceListItem[], categoryId: string) => {
    let items = yearItems.filter((i) => i.categoryId === categoryId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.description.toLowerCase().includes(q) ||
        i.extraDesc1.toLowerCase().includes(q) ||
        i.extraDesc2.toLowerCase().includes(q) ||
        i.unit.toLowerCase().includes(q)
      );
    }
    return items;
  };

  
  const getCompareData = () => {
    const y1 = years.find((y) => y.id === compareYear1);
    const y2 = years.find((y) => y.id === compareYear2);
    if (!y1 || !y2) return [];

    let baseItems = y1.items;

    
    if (compareFilterCat !== "all") {
      baseItems = baseItems.filter((i) => i.categoryId === compareFilterCat);
    }

    
    
    
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const y2CatName = new Map(y2.categories.map((c) => [c.id, norm(c.name)]));
    const y2BySourceId = new Map<string, typeof y2.items[number]>();
    const y2ByCompositeOccurrence = new Map<string, typeof y2.items[number]>();
    const y2OccurrenceCounts = new Map<string, number>();
    for (const it of y2.items) {
      const sourceId = it.sourceItemId ?? it.id;
      if (!y2BySourceId.has(sourceId)) y2BySourceId.set(sourceId, it);
      const compositeKey = `${y2CatName.get(it.categoryId) ?? ""}|${norm(it.description)}|${norm(it.extraDesc1)}|${norm(it.extraDesc2)}|${norm(it.unit)}`;
      const occurrence = y2OccurrenceCounts.get(compositeKey) ?? 0;
      y2OccurrenceCounts.set(compositeKey, occurrence + 1);
      y2ByCompositeOccurrence.set(`${compositeKey}|#${occurrence}`, it);
    }

    const y1OccurrenceCounts = new Map<string, number>();
    let rows = baseItems.map((item1) => {
      const cat = y1.categories.find((c) => c.id === item1.categoryId);
      const sourceId = item1.sourceItemId ?? item1.id;
      const compositeKey = `${norm(cat?.name ?? "")}|${norm(item1.description)}|${norm(item1.extraDesc1)}|${norm(item1.extraDesc2)}|${norm(item1.unit)}`;
      const occurrence = y1OccurrenceCounts.get(compositeKey) ?? 0;
      y1OccurrenceCounts.set(compositeKey, occurrence + 1);
      const match = y2BySourceId.get(sourceId) ?? y2ByCompositeOccurrence.get(`${compositeKey}|#${occurrence}`);
      const price2 = match?.marketPrice ?? 0;
      const diff = price2 - item1.marketPrice;
      const pct = item1.marketPrice > 0 ? (diff / item1.marketPrice) * 100 : 0;
      return {
        description: item1.description,
        unit: item1.unit,
        categoryName: cat?.name || "",
        price1: item1.marketPrice,
        price2,
        diff,
        pct,
      };
    });

    // Search filter
    if (compareSearch.trim()) {
      const q = compareSearch.toLowerCase();
      rows = rows.filter((r) => r.description.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q));
    }

    // Sort
    if (compareSortBy === "diff") {
      rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    } else if (compareSortBy === "pct") {
      rows.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    } else {
      rows.sort((a, b) => a.description.localeCompare(b.description));
    }

    return rows;
  };

  return (
    <div className={compact ? "max-w-2xl mx-auto" : ""}>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">Price List</span>
            <div className="flex gap-2">
              {years.length >= 2 && (
                <Button variant="outline" size="sm" onClick={() => { setCompareOpen(true); setCompareYear1(years[0]?.id || ""); setCompareYear2(years[1]?.id || ""); setCompareSearch(""); setCompareFilterCat("all"); }}>
                  <BarChart3 className="h-4 w-4 mr-1" /> Compare Years
                </Button>
              )}
              {activeYear && (
                <>
                  <Button variant="outline" size="sm" onClick={handleImportClick}>
                    <Upload className="h-4 w-4 mr-1" /> Import
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setCopyYearOpen(true); setCopyYearName(`${activeYear.year} (Copy)`); }}>
                    <Copy className="h-4 w-4 mr-1" /> Copy Year
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => setAddYearOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Year
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {years.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No price lists yet</p>
              <p className="text-sm mt-1">Create a year to start adding your price list items.</p>
              <Button className="mt-4" onClick={() => setAddYearOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Year
              </Button>
            </div>
          ) : (
            <Tabs value={activeYearId} onValueChange={setActiveYearId}>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Label className="text-xs text-muted-foreground shrink-0">Year</Label>
                  <Select value={activeYearId} onValueChange={setActiveYearId}>
                    <SelectTrigger className="h-9 w-full max-w-xs">
                      <SelectValue placeholder="Select a year">
                        {activeYear && (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{activeYear.year}</span>
                            {project.activePriceListYearId === activeYear.id && (
                              <span className="text-[10px] font-semibold text-primary shrink-0">★</span>
                            )}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {years.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          <span className="flex items-center gap-1.5 max-w-[260px]">
                            <span className="truncate">{y.year}</span>
                            {project.activePriceListYearId === y.id && (
                              <span className="text-[10px] font-semibold text-primary shrink-0">★</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeYear && (
                  <div className="flex items-center gap-1">
                    {onSave && (
                      project.activePriceListYearId === activeYear.id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => { onSave({ ...project, activePriceListYearId: undefined }); toast({ title: "Project pricelist cleared" }); }}
                        >
                          ★ Project Pricelist (clear)
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs"
                          onClick={() => { onSave({ ...project, activePriceListYearId: activeYear.id }); toast({ title: `Using ${activeYear.year} as Project Pricelist` }); }}
                        >
                          Use as Project Pricelist
                        </Button>
                      )
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => setDeleteTarget({ type: "year", id: activeYear.id })}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete Year
                    </Button>
                  </div>
                )}
              </div>

              {years.map((year) => (
                <TabsContent key={year.id} value={year.id}>
                  <div className="space-y-4">
                    {}
                    <div className="flex gap-2 flex-wrap items-center">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search items..."
                          className="pl-8 h-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] h-9">
                          <Filter className="h-3 w-3 mr-1" />
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                          {year.categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setAddCategoryOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Category
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setAddItemOpen(true);
                        setAddItemCategoryId(year.categories.length > 0 ? year.categories[0].id : "__new__");
                        setAddItemNewCatName("");
                        setAddItemDesc("");
                        setAddItemExtraDesc1("");
                        setAddItemExtraDesc2("");
                        setAddItemUnit("");
                        setAddItemMarketPrice("");
                        setAddItemMarkupPrice("");
                      }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </Button>
                    </div>

                    {getFilteredCategories(year).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <p className="font-medium">
                          {filterCategory === "" || filterCategory === "none" ? "Select a category to view items" : year.categories.length === 0 ? "No categories yet" : "No matching categories"}
                        </p>
                        <p className="text-sm">
                          {filterCategory === "" || filterCategory === "none" ? "Use the filter above to choose which items to display." : "Add a category (e.g., Electrical, Plumbing) to organize items."}
                        </p>
                      </div>
                    ) : (
                      getFilteredCategories(year).map((cat) => {
                        const catItems = getFilteredItems(year.items, cat.id);
                        const totalCatItems = year.items.filter((i) => i.categoryId === cat.id).length;
                        
                        if (searchQuery.trim() && catItems.length === 0) return null;
                        return (
                          <div key={cat.id} className="border rounded-lg overflow-hidden">
                            <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
                              <span className="font-semibold text-sm">{cat.name} <span className="font-normal opacity-70">({totalCatItems} items)</span></span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => handleAddItem(cat.id)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setDeleteTarget({ type: "category", id: cat.id })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="table-grid w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className="min-w-[200px]">Description</th>
                                    <th className="min-w-[120px]">Specification 1</th>
                                    <th className="min-w-[120px]">Specification 2</th>
                                    <th className="w-20">Unit</th>
                                    <th className="w-32">Market Price</th>
                                    <th className="w-32">w/ Mark-up</th>
                                    {/* <th className="w-32">Total</th> */}
                                    <th className="w-12"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {catItems.map((item) => (
                                    <tr key={item.id}>
                                      <td>{renderEditableCell(item, "description")}</td>
                                      <td>{renderEditableCell(item, "extraDesc1")}</td>
                                      <td>{renderEditableCell(item, "extraDesc2")}</td>
                                      <td>{renderEditableCell(item, "unit")}</td>
                                      <td>{renderEditableCell(item, "marketPrice", true)}</td>
                                      <td>{renderEditableCell(item, "markupPrice", true)}</td>

                                      
                                      {/* <td className="text-right px-1 py-0.5">
                                        <span className="block bg-muted/50 px-1 py-0.5 rounded text-sm">₱{formatCurrency(item.marketPrice * item.markupPrice)}</span>
                                      </td> */}
                                      <td>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: "item", id: item.id })}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                  {catItems.length === 0 && (
                                    <tr>
                                      <td colSpan={8} className="text-center py-4 text-muted-foreground text-xs">
                                        {searchQuery.trim() ? "No matching items." : "No items. Click + to add."}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {}
      <Dialog open={addYearOpen} onOpenChange={setAddYearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Year</DialogTitle>
            <DialogDescription>Create a new price list year.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Year name (e.g., 2024, 2025)" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddYear()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddYearOpen(false)}>Cancel</Button>
            <Button onClick={handleAddYear} disabled={!newYearName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={copyYearOpen} onOpenChange={setCopyYearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Year</DialogTitle>
            <DialogDescription>Duplicate the current year's price list data.</DialogDescription>
          </DialogHeader>
          <Input placeholder="New year name (e.g., 2025)" value={copyYearName} onChange={(e) => setCopyYearName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCopyYear()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyYearOpen(false)}>Cancel</Button>
            <Button onClick={handleCopyYear} disabled={!copyYearName.trim()}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a category to group price list items.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Category name (e.g., Electrical, Plumbing)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={!newCatName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Choose a category and fill in the item details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeYear && (
              <div>
                <Label className="text-sm mb-1.5 block">Category</Label>
                <Select value={addItemCategoryId} onValueChange={setAddItemCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {activeYear.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__new__">+ New Category</SelectItem>
                  </SelectContent>
                </Select>
                {addItemCategoryId === "__new__" && (
                  <Input className="mt-2" placeholder="New category name" value={addItemNewCatName} onChange={(e) => setAddItemNewCatName(e.target.value)} />
                )}
              </div>
            )}
            <div>
              <Label className="text-sm mb-1.5 block">Description</Label>
              <Input value={addItemDesc} onChange={(e) => setAddItemDesc(e.target.value)} placeholder="Item description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Specification 1</Label>
                <Input value={addItemExtraDesc1} onChange={(e) => setAddItemExtraDesc1(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Specification 2</Label>
                <Input value={addItemExtraDesc2} onChange={(e) => setAddItemExtraDesc2(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Unit</Label>
              <UnitCombobox value={addItemUnit} onChange={setAddItemUnit} placeholder="Select unit (or type to add new)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Market Price</Label>
                <Input type="text" inputMode="decimal" value={addItemMarketPrice} onChange={(e) => setAddItemMarketPrice(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Price w/ Markup</Label>
                <Input type="text" inputMode="decimal" value={addItemMarkupPrice} onChange={(e) => setAddItemMarkupPrice(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItemWithCategory} disabled={!addItemCategoryId || (addItemCategoryId === "__new__" && !addItemNewCatName.trim())}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category"
                ? "This will delete the category and all its items."
                : deleteTarget?.type === "year"
                ? "This will delete the entire year's price list."
                : "This will remove this item."}
              {" "}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compare Price Lists</DialogTitle>
            <DialogDescription>Compare prices between two years to see increases.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 mb-2">
            <div className="flex-1">
              <Label className="text-sm mb-1 block">Year 1 (Base)</Label>
              <Select value={compareYear1} onValueChange={setCompareYear1}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-sm mb-1 block">Year 2 (Compare)</Label>
              <Select value={compareYear2} onValueChange={setCompareYear2}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-8 text-sm" value={compareSearch} onChange={(e) => setCompareSearch(e.target.value)} />
            </div>
            {compareYear1 && (
              <Select value={compareFilterCat} onValueChange={setCompareFilterCat}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(years.find((y) => y.id === compareYear1)?.categories || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={compareSortBy} onValueChange={(v) => setCompareSortBy(v as any)}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Sort: Name</SelectItem>
                <SelectItem value="diff">Sort: Difference</SelectItem>
                <SelectItem value="pct">Sort: % Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {compareYear1 && compareYear2 && compareYear1 !== compareYear2 && (
            <div className="max-h-96 overflow-auto border rounded-lg">
              <table className="table-grid w-full text-sm">
                <thead>
                  <tr>
                    <th className="min-w-[180px]">Description</th>
                    <th className="w-24">Category</th>
                    <th className="w-16">Unit</th>
                    <th className="w-28">{years.find((y) => y.id === compareYear1)?.year}</th>
                    <th className="w-28">{years.find((y) => y.id === compareYear2)?.year}</th>
                    <th className="w-28">Difference</th>
                    <th className="w-20">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {getCompareData().map((row, i) => (
                    <tr key={i}>
                      <td>{row.description || "—"}</td>
                      <td className="text-xs text-muted-foreground">{row.categoryName}</td>
                      <td>{row.unit}</td>
                      <td className="text-right">₱{formatCurrency(row.price1)}</td>
                      <td className="text-right">₱{formatCurrency(row.price2)}</td>
                      <td className={`text-right font-medium ${row.diff > 0 ? "text-destructive" : row.diff < 0 ? "text-green-600" : ""}`}>
                        {row.diff > 0 ? "+" : ""}₱{formatCurrency(row.diff)}
                      </td>
                      <td className={`text-right ${row.pct > 0 ? "text-destructive" : row.pct < 0 ? "text-green-600" : ""}`}>
                        {row.pct > 0 ? "+" : ""}{row.pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {getCompareData().length === 0 && (
                    <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No matching items to compare.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
