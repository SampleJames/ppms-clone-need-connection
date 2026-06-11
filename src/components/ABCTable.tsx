import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { Plus, Trash2, RefreshCw, ChevronRight, ChevronDown, Copy, Lock, Unlock, ChevronsUpDown, Package, ZoomIn, ZoomOut, Maximize, Save, GripVertical, MoveHorizontal, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";
import { Project, ABCItem, DUPAItem, GeneralCategoryTemplate, GeneralCategoryTemplateItem } from "@/types";
import { getProjects, saveProject } from "@/lib/storage";
import { recalcABCItem, recalcDupa, formatCurrency } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { getTemplates, templateToDupa, getGeneralTemplates, saveGeneralTemplate, saveTemplate, dupaToTemplate } from "@/lib/templates";

import { toast } from "@/hooks/use-toast";
import { UnitCombobox } from "@/components/ui/unit-combobox";

interface Props {
  project: Project;
  onSave: (p: Project) => void;
  onSync: () => void;
}

function newABCItem(overrides: Partial<ABCItem> = {}): ABCItem {
  return {
    id: crypto.randomUUID(),
    itemNo: "",
    description: "",
    quantity: 1,
    unit: "",
    materialsCost: 0,
    laborEquipmentCost: 0,
    estimatedDirectCost: 0,
    ocmPercent: 0,
    profitPercent: 0,
    totalMarkupPercent: 0,
    markupValue: 0,
    vatPercent: 0,
    vatCost: 0,
    totalIndirectCost: 0,
    totalCost: 0,
    unitCost: 0,
    isCategory: false,
    parentId: null,
    children: [],
    hasDupa: false,
    order: 0,
    lockedFields: [],
    ...overrides,
  };
}

export default function ABCTable({ project, onSave, onSync }: Props) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [bulkOcm, setBulkOcm] = useState("");
  const [bulkProfit, setBulkProfit] = useState("");
  const [bulkVat, setBulkVat] = useState("");
  const [proMode, setProMode] = useState(false);
  const [copyItem, setCopyItem] = useState<ABCItem | null>(null);
  const [copyScope, setCopyScope] = useState<"this" | "other" | "new">("this");
  const [copyTarget, setCopyTarget] = useState<string>("same");
  const [copyProjectId, setCopyProjectId] = useState<string>("");
  const [copyOtherCategoryId, setCopyOtherCategoryId] = useState<string>("__new__");
  const [copyOtherNewCatName, setCopyOtherNewCatName] = useState("Imported");
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemDesc, setAddItemDesc] = useState("");
  const [addItemQty, setAddItemQty] = useState("0");
  const [addItemUnit, setAddItemUnit] = useState("");
  const [addItemCategoryId, setAddItemCategoryId] = useState<string>("__none__");
  const [addItemTemplateId, setAddItemTemplateId] = useState<string>("__none__");
  const [templateComboOpen, setTemplateComboOpen] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [saveCatTemplateId, setSaveCatTemplateId] = useState<string | null>(null);
  const [saveCatTemplateName, setSaveCatTemplateName] = useState("");
  const [addCatTemplateId, setAddCatTemplateId] = useState<string>("__none__");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<GeneralCategoryTemplate | null>(null);
  const [catTemplateSearch, setCatTemplateSearch] = useState("");
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Sync confirmation: when OCM% or Profit% is edited on an ABC row that
  // has a linked DUPA, prompt the user to also hard-reset the DUPA value.
  const [syncPrompt, setSyncPrompt] = useState<{
    targets: { abcItemId: string; oldDupaValue: number; itemNo: string; description: string }[];
    field: "ocmPercent" | "profitPercent" | "vatPercent";
    newValue: number;
    previousItems: ABCItem[];
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const syncConfirmedRef = useRef(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [hScrollPercent, setHScrollPercent] = useState(0);
  const isScrollSliderDriving = useRef(false);

  
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isScrollSliderDriving.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        setHScrollPercent(Math.round((el.scrollLeft / maxScroll) * 100));
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const handleHScrollChange = useCallback(([v]: number[]) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isScrollSliderDriving.current = true;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = (v / 100) * maxScroll;
    setHScrollPercent(v);
    requestAnimationFrame(() => { isScrollSliderDriving.current = false; });
  }, []);

  useEffect(() => {
    if (lastAddedId) {
      const timer = setTimeout(() => {
        const row = document.querySelector(`[data-item-id="${lastAddedId}"]`);
        if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setLastAddedId(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lastAddedId, project.abcItems]);

  const handleAutoFit = useCallback(() => {
    if (!scrollContainerRef.current || !tableContainerRef.current) return;
    
    const prevZoom = zoom;
    tableContainerRef.current.style.zoom = '100%';
    const tableWidth = tableContainerRef.current.scrollWidth;
    const containerWidth = scrollContainerRef.current.clientWidth;
    
    tableContainerRef.current.style.zoom = `${prevZoom}%`;
    if (tableWidth <= containerWidth) {
      setZoom(100);
    } else {
      const fitZoom = Math.max(40, Math.floor((containerWidth / tableWidth) * 100 / 5) * 5);
      setZoom(fitZoom);
    }
  }, [zoom]);

  
  useLayoutEffect(() => {
    if (zoom === null && scrollContainerRef.current && tableContainerRef.current) {
      const el = tableContainerRef.current;
      const container = scrollContainerRef.current;
      el.style.zoom = '100%';
      const tableWidth = el.scrollWidth;
      const containerWidth = container.clientWidth;
      if (tableWidth <= containerWidth) {
        setZoom(100);
      } else {
        setZoom(Math.max(40, Math.floor((containerWidth / tableWidth) * 100 / 5) * 5));
      }
    }
  }, [zoom]);

  const effectiveZoom = zoom ?? 100;
  const items = project.abcItems;
  const settings = project.settings;

  
  const renumberItems = (itemsList: ABCItem[]): ABCItem[] => {
    const sorted = [...itemsList].sort((a, b) => a.order - b.order);
    const result = [...itemsList];
    
    const renumberChildren = (parentId: string | null, prefix: string) => {
      const siblings = sorted.filter(i => i.parentId === parentId);
      siblings.forEach((sibling, idx) => {
        const newItemNo = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        const resultIdx = result.findIndex(r => r.id === sibling.id);
        if (resultIdx >= 0) {
          result[resultIdx] = { ...result[resultIdx], itemNo: newItemNo, order: idx };
        }
        
        renumberChildren(sibling.id, newItemNo);
      });
    };
    
    renumberChildren(null, "");
    return result;
  };

  // Also renumber associated DUPA items
  const renumberDupaItems = (abcItems: ABCItem[], dupaItems: DUPAItem[]): DUPAItem[] => {
    return dupaItems.map(d => {
      const abc = abcItems.find(a => a.id === d.abcItemId);
      if (abc) return { ...d, itemNo: abc.itemNo };
      return d;
    });
  };

  const updateItems = (newItems: ABCItem[]) => {
    onSave({ ...project, abcItems: newItems });
  };

  const toggleLock = (itemId: string, field: string) => {
    const newItems = items.map((item) => {
      if (item.id !== itemId) return item;
      const locked = item.lockedFields || [];
      const isLocked = locked.includes(field);
      return { ...item, lockedFields: isLocked ? locked.filter((f) => f !== field) : [...locked, field] };
    });
    updateItems(newItems);
  };

  const isFieldLocked = (item: ABCItem, field: string): boolean => {
    return (item.lockedFields || []).includes(field);
  };

  const applyBulkPercent = (field: "ocmPercent" | "profitPercent" | "vatPercent", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const previousItems = items;
    const newItems = items.map((item) => {
      if (item.isCategory) return item;
      if (isFieldLocked(item, field)) return item;
      return recalcABCItem({ ...item, [field]: num });
    });
    updateItems(newItems);
    
    if (field === "ocmPercent" || field === "profitPercent" || field === "vatPercent") {
      const targets = items
        .filter((item) => !item.isCategory && !isFieldLocked(item, field))
        .map((item) => {
          const dupa = project.dupaItems.find((d) => d.abcItemId === item.id);
          if (!dupa) return null;
          const oldDupaVal =
            field === "ocmPercent" ? (dupa.ocmPercent ?? 0)
            : field === "profitPercent" ? (dupa.profitPercent ?? 0)
            : (dupa.vatPercent ?? 0);
          if (oldDupaVal === num) return null;
          return { abcItemId: item.id, oldDupaValue: oldDupaVal, itemNo: item.itemNo, description: item.description };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);
      if (targets.length > 0) {
        setTimeout(() => setSyncPrompt({ targets, field, newValue: num, previousItems }), 0);
      }
    }
  };

  const addCategory = (generalTemplateId?: string) => {
    const generalTemplates = getGeneralTemplates();
    const genTmpl = generalTemplateId ? generalTemplates.find(t => t.id === generalTemplateId) : null;

    const catCount = items.filter((i) => i.isCategory && !i.parentId).length;
    const cat = newABCItem({
      isCategory: true,
      itemNo: `${catCount + 1}`,
      description: genTmpl?.description || "New Category",
      ocmPercent: settings.ocmPercent,
      profitPercent: settings.profitPercent,
      vatPercent: settings.vatPercent,
      order: items.length,
    });

    let newItems = [...items, cat];
    let newDupaItems = [...project.dupaItems];

    if (genTmpl) {
      const dupaTemplatesList = getTemplates();
      genTmpl.items.forEach((tmplItem, idx) => {
        const childItemNo = `${cat.itemNo}.${idx + 1}`;
        const qty = tmplItem.quantity ?? 0;
        const child = newABCItem({
          itemNo: childItemNo,
          description: tmplItem.description,
          quantity: qty,
          unit: tmplItem.unit,
          parentId: cat.id,
          ocmPercent: settings.ocmPercent,
          profitPercent: settings.profitPercent,
          vatPercent: settings.vatPercent,
          order: newItems.length,
        });
        newItems.push(child);
        newItems = newItems.map(i => i.id === cat.id ? { ...i, children: [...i.children, child.id] } : i);

        if (tmplItem.dupaTemplateId) {
          const dupaT = dupaTemplatesList.find(d => d.id === tmplItem.dupaTemplateId);
          if (dupaT) {
            const dupa = templateToDupa(dupaT, child.id, childItemNo, qty);
            const recalced = recalcDupa(dupa);
            newDupaItems.push(recalced);
            const childIdx = newItems.findIndex(i => i.id === child.id);
            newItems[childIdx] = recalcABCItem({
              ...newItems[childIdx],
              materialsCost: recalced.totalMaterials,
              laborEquipmentCost: recalced.totalLabor + recalced.totalEquipment,
              hasDupa: true,
            });
          }
        }
      });
      toast({ title: "Category template applied", description: `Created "${genTmpl.name}" with ${genTmpl.items.length} items.` });
    }

    onSave({ ...project, abcItems: newItems, dupaItems: newDupaItems });
    setLastAddedId(cat.id);
    setAddCatTemplateId("__none__");
  };

  const addSubCategory = (parentId: string) => {
    const parent = items.find(i => i.id === parentId);
    if (!parent) return;
    const subCatCount = items.filter(i => i.parentId === parentId && i.isCategory).length;
    const subCat = newABCItem({
      isCategory: true,
      itemNo: `${parent.itemNo}.${subCatCount + 1}`,
      description: "New Sub-Category",
      parentId,
      ocmPercent: settings.ocmPercent,
      profitPercent: settings.profitPercent,
      vatPercent: settings.vatPercent,
      order: items.length,
    });
    const newItems = items.map(i => i.id === parentId ? { ...i, children: [...i.children, subCat.id] } : i);
    newItems.push(subCat);
    onSave({ ...project, abcItems: newItems });
    setLastAddedId(subCat.id);
    toast({ title: "Sub-category added", description: `Created sub-category under "${parent.description}"` });
  };

  const openAddItemDialog = (parentId?: string) => {
    setAddItemDesc("");
    setAddItemQty("1");
    setAddItemUnit("");
    setAddItemCategoryId(parentId || "__none__");
    setAddItemTemplateId("__none__");
    setAddItemDialogOpen(true);
  };

  const handleAddItemConfirm = () => {
    const parentId = addItemCategoryId === "__none__" ? undefined : addItemCategoryId;
    const parent = parentId ? items.find((i) => i.id === parentId) : null;
    const siblings = items.filter((i) => i.parentId === (parentId || null));
    const itemNo = parent
      ? `${parent.itemNo}.${siblings.length + 1}`
      : `${items.filter((i) => !i.parentId).length + 1}`;
    
    const templates = getTemplates();
    const selectedTemplate = addItemTemplateId !== "__none__" ? templates.find(t => t.id === addItemTemplateId) : null;
    
    const item = newABCItem({
      itemNo,
      description: addItemDesc || (selectedTemplate?.description ?? ""),
      quantity: parseFloat(addItemQty) || 0,
      unit: addItemUnit || (selectedTemplate?.unit ?? ""),
      parentId: parentId || null,
      ocmPercent: settings.ocmPercent,
      profitPercent: settings.profitPercent,
      vatPercent: settings.vatPercent,
      order: items.length,
    });
    const newItems = [...items, item];
    if (parent) {
      const idx = newItems.findIndex((i) => i.id === parentId);
      newItems[idx] = { ...newItems[idx], children: [...newItems[idx].children, item.id] };
    }
    
    let newDupaItems = [...project.dupaItems];
    if (selectedTemplate) {
      const dupa = templateToDupa(selectedTemplate, item.id, itemNo, parseFloat(addItemQty) || 0);
      const recalced = recalcDupa(dupa);
      newDupaItems.push(recalced);
      // Sync DUPA costs to ABC item
      const abcIdx = newItems.findIndex(i => i.id === item.id);
      newItems[abcIdx] = recalcABCItem({
        ...newItems[abcIdx],
        materialsCost: recalced.totalMaterials,
        laborEquipmentCost: recalced.totalLabor + recalced.totalEquipment,
        hasDupa: true,
      });
      toast({ title: "Template applied", description: `Created item with "${selectedTemplate.name}" template.` });
    }
    
    onSave({ ...project, abcItems: newItems, dupaItems: newDupaItems });
    setLastAddedId(item.id);
    setAddItemDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const idsToDelete = new Set<string>();
    const collect = (id: string) => {
      idsToDelete.add(id);
      items.filter((i) => i.parentId === id).forEach((i) => collect(i.id));
    };
    collect(deleteId);
    const filtered = items
      .filter((i) => !idsToDelete.has(i.id))
      .map((i) => ({
        ...i,
        children: i.children.filter((c) => !idsToDelete.has(c)),
      }));
    const newDupa = project.dupaItems.filter((d) => !idsToDelete.has(d.abcItemId));
    const renumbered = renumberItems(filtered);
    const renumberedDupa = renumberDupaItems(renumbered, newDupa);
    onSave({ ...project, abcItems: renumbered, dupaItems: renumberedDupa });
    setDeleteId(null);
  };

  const moveItem = (itemId: string, direction: "up" | "down") => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const siblings = [...items]
      .filter(i => i.parentId === item.parentId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex(s => s.id === itemId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    
    const swapItem = siblings[swapIdx];
    const newItems = items.map(i => {
      if (i.id === itemId) return { ...i, order: swapItem.order };
      if (i.id === swapItem.id) return { ...i, order: item.order };
      return i;
    });
    const renumbered = renumberItems(newItems);
    const renumberedDupa = renumberDupaItems(renumbered, project.dupaItems);
    onSave({ ...project, abcItems: renumbered, dupaItems: renumberedDupa });
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDragId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (!dragId || dragId === itemId) return;
    const dragItem = items.find(i => i.id === dragId);
    const overItem = items.find(i => i.id === itemId);
    if (!dragItem || !overItem) return;
    
    if (dragItem.parentId !== overItem.parentId) return;
    e.dataTransfer.dropEffect = "move";
    setDragOverId(itemId);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const dragItem = items.find(i => i.id === dragId);
    const targetItem = items.find(i => i.id === targetId);
    if (!dragItem || !targetItem || dragItem.parentId !== targetItem.parentId) { setDragId(null); setDragOverId(null); return; }

    const siblings = [...items]
      .filter(i => i.parentId === dragItem.parentId)
      .sort((a, b) => a.order - b.order);
    const fromIdx = siblings.findIndex(s => s.id === dragId);
    const toIdx = siblings.findIndex(s => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) { setDragId(null); setDragOverId(null); return; }

    
    const reordered = [...siblings];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const orderMap = new Map<string, number>();
    reordered.forEach((s, i) => orderMap.set(s.id, i));

    const newItems = items.map(i => orderMap.has(i.id) ? { ...i, order: orderMap.get(i.id)! } : i);
    const renumbered = renumberItems(newItems);
    const renumberedDupa = renumberDupaItems(renumbered, project.dupaItems);
    onSave({ ...project, abcItems: renumbered, dupaItems: renumberedDupa });
    setDragId(null);
    setDragOverId(null);
  };

  const handleCopy = () => {
    if (!copyItem) return;

    if (copyScope === "other" || copyScope === "new") {
      let targetProject: Project;
      if (copyScope === "new") {
        targetProject = {
          id: crypto.randomUUID(),
          name: `New Project (from ${project.name})`,
          description: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          abcItems: [],
          dupaItems: [],
          settings: { ...project.settings },
          versions: [],
        };
      } else {
        const allProjects = getProjects();
        const found = allProjects.find((p) => p.id === copyProjectId);
        if (!found) return;
        targetProject = JSON.parse(JSON.stringify(found));
      }

      let targetCatId: string;
      if (copyOtherCategoryId === "__new__") {
        const catCount = targetProject.abcItems.filter((i) => i.isCategory && !i.parentId).length;
        const newCat = newABCItem({
          isCategory: true,
          itemNo: `${catCount + 1}`,
          description: copyOtherNewCatName || `Imported from ${project.name}`,
          order: targetProject.abcItems.length,
        });
        targetProject.abcItems.push(newCat);
        targetCatId = newCat.id;
      } else {
        targetCatId = copyOtherCategoryId;
      }

      const targetCat = targetProject.abcItems.find(i => i.id === targetCatId);
      const siblings = targetProject.abcItems.filter(i => i.parentId === targetCatId && !i.isCategory);
      const itemNo = targetCat
        ? `${targetCat.itemNo}.${siblings.length + 1}`
        : `${targetProject.abcItems.length + 1}`;

      const copiedItem = newABCItem({
        ...copyItem,
        id: crypto.randomUUID(),
        itemNo,
        parentId: targetCatId,
        description: copyItem.description,
        children: [],
        hasDupa: false,
        order: targetProject.abcItems.length,
      });
      targetProject.abcItems.push(recalcABCItem(copiedItem));

      const catIdx = targetProject.abcItems.findIndex(i => i.id === targetCatId);
      if (catIdx >= 0) {
        targetProject.abcItems[catIdx] = {
          ...targetProject.abcItems[catIdx],
          children: [...targetProject.abcItems[catIdx].children, copiedItem.id],
        };
      }

      const sourceDupa = project.dupaItems.find((d) => d.abcItemId === copyItem.id);
      if (sourceDupa) {
        const copiedDupa = {
          ...JSON.parse(JSON.stringify(sourceDupa)),
          id: crypto.randomUUID(),
          abcItemId: copiedItem.id,
          itemNo: copiedItem.itemNo,
          description: copiedItem.description,
        };
        copiedDupa.materials = copiedDupa.materials.map((m: any) => ({ ...m, id: crypto.randomUUID() }));
        copiedDupa.labor = copiedDupa.labor.map((l: any) => ({ ...l, id: crypto.randomUUID() }));
        copiedDupa.equipment = copiedDupa.equipment.map((e: any) => ({ ...e, id: crypto.randomUUID() }));
        targetProject.dupaItems.push(copiedDupa);
      }

      saveProject(targetProject);
      setCopyItem(null);
      setCopyScope("this");
      setCopyTarget("same");
      setCopyProjectId("");
      setCopyOtherCategoryId("__new__");
      setCopyOtherNewCatName("Imported");
      return;
    }

    
    let targetParentId: string | null = null;
    let newItems = [...items];
    let newDupaItems = [...project.dupaItems];

    if (copyTarget === "new") {
      const catCount = items.filter((i) => i.isCategory && !i.parentId).length;
      const newCat = newABCItem({
        isCategory: true,
        itemNo: `${catCount + 1}`,
        description: `Category for ${copyItem.description}`,
        order: items.length,
      });
      newItems.push(newCat);
      targetParentId = newCat.id;
    } else if (copyTarget !== "same") {
      targetParentId = copyTarget;
    } else {
      targetParentId = copyItem.parentId;
    }

    const targetParent = targetParentId ? newItems.find((i) => i.id === targetParentId) : null;
    const sameSiblings = newItems.filter((i) => i.parentId === targetParentId && !i.isCategory);
    const itemNo = targetParent
      ? `${targetParent.itemNo}.${sameSiblings.length + 1}`
      : `${newItems.filter((i) => !i.parentId).length + 1}`;

    const copiedItem = newABCItem({
      ...copyItem,
      id: crypto.randomUUID(),
      itemNo,
      parentId: targetParentId,
      description: `${copyItem.description} (Copy)`,
      children: [],
      hasDupa: false,
      order: newItems.length,
    });
    newItems.push(recalcABCItem(copiedItem));

    if (targetParent) {
      const idx = newItems.findIndex((i) => i.id === targetParentId);
      newItems[idx] = { ...newItems[idx], children: [...newItems[idx].children, copiedItem.id] };
    }

    const sourceDupa = project.dupaItems.find((d) => d.abcItemId === copyItem.id);
    if (sourceDupa) {
      const copiedDupa = {
        ...JSON.parse(JSON.stringify(sourceDupa)),
        id: crypto.randomUUID(),
        abcItemId: copiedItem.id,
        itemNo: copiedItem.itemNo,
        description: copiedItem.description,
      };
      copiedDupa.materials = copiedDupa.materials.map((m: any) => ({ ...m, id: crypto.randomUUID() }));
      copiedDupa.labor = copiedDupa.labor.map((l: any) => ({ ...l, id: crypto.randomUUID() }));
      copiedDupa.equipment = copiedDupa.equipment.map((e: any) => ({ ...e, id: crypto.randomUUID() }));
      newDupaItems.push(copiedDupa);
    }

    onSave({ ...project, abcItems: newItems, dupaItems: newDupaItems });
    setCopyItem(null);
    setCopyScope("this");
    setCopyTarget("same");
  };

  const startEdit = (id: string, field: string, value: string | number) => {
    setEditingCell({ id, field });
    setEditValue(String(value));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    let pendingSyncPrompt: typeof syncPrompt = null;
    const newItems = items.map((item) => {
      if (item.id !== id) return item;
      const numFields = ["quantity", "materialsCost", "laborEquipmentCost", "ocmPercent", "profitPercent", "vatPercent"];
      const updated = {
        ...item,
        [field]: numFields.includes(field) ? parseFloat(editValue) || 0 : editValue,
      };
      return recalcABCItem(updated);
    });
    
    if (field === "ocmPercent" || field === "profitPercent" || field === "vatPercent") {
      const newVal = parseFloat(editValue) || 0;
      const dupa = project.dupaItems.find((d) => d.abcItemId === id);
      if (dupa) {
        const oldDupaVal =
          field === "ocmPercent" ? (dupa.ocmPercent ?? 0)
          : field === "profitPercent" ? (dupa.profitPercent ?? 0)
          : (dupa.vatPercent ?? 0);
        if (oldDupaVal !== newVal) {
          const abcItem = items.find((i) => i.id === id);
          pendingSyncPrompt = {
            field,
            newValue: newVal,
            previousItems: items,
            targets: [{
              abcItemId: id,
              oldDupaValue: oldDupaVal,
              itemNo: abcItem?.itemNo ?? "",
              description: abcItem?.description ?? "",
            }],
          };
        }
      }
    }
    updateItems(newItems);
    setEditingCell(null);
    if (pendingSyncPrompt) {
      // Defer to escape current event loop so the dialog isn't auto-dismissed
      // by the same blur/click that triggered commitEdit.
      const prompt = pendingSyncPrompt;
      setTimeout(() => setSyncPrompt(prompt), 0);
    }
  };

  const applyDupaSync = () => {
    if (!syncPrompt) return;
    const { targets, field, newValue } = syncPrompt;
    const targetIds = new Set(targets.map((t) => t.abcItemId));
    const newDupaItems = project.dupaItems.map((d) => {
      if (!targetIds.has(d.abcItemId)) return d;
      const updated = { ...d, [field]: newValue };
      return recalcDupa(updated);
    });
    onSave({ ...project, dupaItems: newDupaItems });
    syncConfirmedRef.current = true;
    setSyncPrompt(null);
    toast({
      title: "DUPA synced",
      description: `Hard reset ${targets.length} DUPA ${field === "ocmPercent" ? "OCM" : field === "profitPercent" ? "Markup" : "VAT"}% to ${newValue}%.`,
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isHidden = (item: ABCItem): boolean => {
    if (!item.parentId) return false;
    if (collapsed.has(item.parentId)) return true;
    const parent = items.find((i) => i.id === item.parentId);
    return parent ? isHidden(parent) : false;
  };

  const getDepth = (item: ABCItem): number => {
    if (!item.parentId) return 0;
    const parent = items.find((i) => i.id === item.parentId);
    return parent ? 1 + getDepth(parent) : 0;
  };

  const sorted = [...items].sort((a, b) => a.order - b.order);
  const ordered: ABCItem[] = [];
  const addWithChildren = (parentId: string | null) => {
    sorted
      .filter((i) => i.parentId === parentId)
      .forEach((i) => {
        ordered.push(i);
        if (i.isCategory || i.children.length > 0) {
          addWithChildren(i.id);
        }
      });
  };
  addWithChildren(null);
  items.forEach((i) => { if (!ordered.find((o) => o.id === i.id)) ordered.push(i); });

  const visible = ordered.filter((i) => !isHidden(i));

  const getCategoryTotal = (catId: string): number => {
    return items
      .filter((i) => i.parentId === catId && !i.isCategory)
      .reduce((sum, i) => sum + i.totalCost, 0) +
      items
        .filter((i) => i.parentId === catId && i.isCategory)
        .reduce((sum, i) => sum + getCategoryTotal(i.id), 0);
  };

  const categories = items.filter((i) => i.isCategory);
  const lockableFields = ["ocmPercent", "profitPercent", "vatPercent"];

  const renderCell = (item: ABCItem, field: string, value: string | number, isNumeric = false, editable = true) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    const locked = isFieldLocked(item, field);
    const isLockable = lockableFields.includes(field) && editable;

    if (isEditing) {
      if (field === "unit") {
        return (
          <UnitCombobox
            size="sm"
            value={editValue}
            onChange={(v) => {
              setEditValue(v);
              
              const newItems = items.map((it) =>
                it.id === item.id ? recalcABCItem({ ...it, unit: v }) : it
              );
              updateItems(newItems);
              setEditingCell(null);
            }}
          />
        );
      }
      if (field === "description") {
        return (
          <textarea
            autoFocus
            className="text-sm w-full min-w-[60px] rounded-md border border-input bg-background px-2 py-1 leading-snug resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={1}
            ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === "Escape") setEditingCell(null);
            }}
          />
        );
      }
      return (
        <Input
          autoFocus
          className="h-7 text-sm w-full min-w-[60px]"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
        />
      );
    }
    if (!editable) {
      return (
        <span className={`block px-1 py-0.5 ${isNumeric ? "text-right" : ""} text-muted-foreground/70`}>
          {isNumeric ? formatCurrency(value as number) : value}
        </span>
      );
    }

    const lockIcon = isLockable ? (
      <span
        className={`absolute -top-1 -right-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10 ${locked ? "!opacity-100" : ""}`}
        onClick={(e) => { e.stopPropagation(); toggleLock(item.id, field); }}
        title={locked ? "Unlock (allow bulk override)" : "Lock (prevent bulk override)"}
      >
        {locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3 text-muted-foreground/50" />}
      </span>
    ) : null;

    const wrapClass = field === "description" ? "whitespace-pre-wrap break-words" : "";
    if (proMode) {
      return (
        <span
          className={`cursor-pointer hover:bg-accent/20 px-1 py-0.5 rounded block relative group ${isNumeric ? "text-right" : ""} ${wrapClass} ${locked ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
          onClick={() => !locked || !isLockable ? startEdit(item.id, field, value) : null}
          onDoubleClick={() => isLockable ? toggleLock(item.id, field) : null}
        >
          {lockIcon}
          {isNumeric ? formatCurrency(value as number) : value || <span className="text-muted-foreground italic">—</span>}
        </span>
      );
    }
    return (
      <span
        className={`cursor-pointer hover:bg-accent/20 px-1 py-0.5 rounded block border border-dashed border-primary/30 bg-background relative group ${isNumeric ? "text-right" : ""} ${wrapClass} ${locked ? "!border-amber-400 !bg-amber-50 dark:!bg-amber-950/20" : ""}`}
        onClick={() => startEdit(item.id, field, value)}
        onDoubleClick={() => isLockable ? toggleLock(item.id, field) : null}
      >
        {lockIcon}
        {isNumeric ? formatCurrency(value as number) : value || <span className="text-muted-foreground italic">—</span>}
      </span>
    );
  };

  const renderBulkInput = (value: string, setValue: (v: string) => void, field: "ocmPercent" | "profitPercent" | "vatPercent", placeholder: string) => (
    <Input
      className="h-6 text-xs w-full min-w-[40px] text-center mt-1 bg-accent/10 border-accent/30 placeholder:text-muted-foreground/50"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          applyBulkPercent(field, value);
          setValue("");
        }
      }}
    />
  );

  const otherProjects = getProjects().filter((p) => p.id !== project.id);

  const allCategoriesCollapsed = categories.length > 0 && categories.every(c => collapsed.has(c.id));
  const toggleCollapseAll = () => {
    if (allCategoriesCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(categories.map(c => c.id)));
    }
  };

  const getOtherProjectCategories = (): ABCItem[] => {
    if (!copyProjectId) return [];
    const allProjects = getProjects();
    const target = allProjects.find(p => p.id === copyProjectId);
    if (!target) return [];
    return target.abcItems.filter(i => i.isCategory);
  };

  return (
    <div className="mt-4">
      <div className="sticky top-[49px] z-10 bg-background pb-2 pt-1">
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addCategory()}>Blank Category</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTemplatePickerOpen(true)}>
              <Package className="h-3 w-3 mr-1.5" /> From Template...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={() => openAddItemDialog()}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
        <Button size="sm" variant="outline" onClick={onSync}>
          <RefreshCw className="h-4 w-4 mr-1" /> Sync from DUPA
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1" title="Horizontal scroll">
            <MoveHorizontal className="h-3.5 w-3.5" />
            <Slider
              value={[hScrollPercent]}
              onValueChange={handleHScrollChange}
              min={0}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
            <ZoomOut className="h-3.5 w-3.5 cursor-pointer hover:text-foreground" onClick={() => setZoom(Math.max(40, effectiveZoom - 10))} />
            <Slider
              value={[effectiveZoom]}
              onValueChange={([v]) => setZoom(v)}
              min={40}
              max={100}
              step={5}
              className="w-20"
            />
            <ZoomIn className="h-3.5 w-3.5 cursor-pointer hover:text-foreground" onClick={() => setZoom(Math.min(100, effectiveZoom + 10))} />
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] font-medium" onClick={handleAutoFit} title="Auto-fit all columns">
              <Maximize className="h-3 w-3 mr-0.5" />Fit
            </Button>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] font-medium" onClick={() => setZoom(100)} title="Reset to 100%">
              <RotateCcw className="h-3 w-3 mr-0.5" />100%
            </Button>
            <span className="text-[10px] w-7 text-center">{effectiveZoom}%</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 text-amber-500" /> Double-click to lock
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pro-mode" className="text-xs text-muted-foreground cursor-pointer">
              {proMode ? "Pro" : "Simple"}
            </Label>
            <Switch id="pro-mode" checked={proMode} onCheckedChange={setProMode} className="scale-75" />
          </div>
          {!proMode && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 border border-dashed border-primary/30 bg-background rounded" /> Editable
              <span className="inline-block w-3 h-3 bg-muted/40 rounded ml-2" /> Computed
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border" ref={scrollContainerRef}>
        <div ref={tableContainerRef} style={{ zoom: `${effectiveZoom}%`, visibility: zoom === null ? 'hidden' : 'visible' }}>
        <table className="table-grid w-full">
          <thead>
            <tr>
              <th className="w-10">
                {categories.length > 0 && (
                  <button
                    onClick={toggleCollapseAll}
                    className="p-0.5 rounded hover:bg-primary-foreground/20 transition-colors mx-auto block"
                    title={allCategoriesCollapsed ? "Expand all categories" : "Collapse all categories"}
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </button>
                )}
              </th>
              <th className="w-20">Item No.</th>
              <th className="min-w-[200px]">Description</th>
              <th className="w-20">Qty</th>
              <th className="w-16">Unit</th>
              <th className="w-28">Materials</th>
              <th className="w-28">Labor & Equip</th>
              <th className="w-32">Est. Direct Cost</th>
              <th className="w-20">
                <div>OCM %</div>
                {renderBulkInput(bulkOcm, setBulkOcm, "ocmPercent", "Set all")}
              </th>
              <th className="w-20">
                <div>Profit %</div>
                {renderBulkInput(bulkProfit, setBulkProfit, "profitPercent", "Set all")}
              </th>
              <th className="w-20">Markup %</th>
              <th className="w-28">Markup Value</th>
              <th className="w-20">
                <div>VAT %</div>
                {renderBulkInput(bulkVat, setBulkVat, "vatPercent", "Set all")}
              </th>
              <th className="w-28">VAT</th>
              <th className="w-28">Total Indirect</th>
              <th className="w-36">Total Cost</th>
              <th className="w-32">Unit Cost</th>
              <th className="w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const depth = getDepth(item);
              const isExpanded = !collapsed.has(item.id);
              const hasChildren = items.some((i) => i.parentId === item.id);

              if (item.isCategory) {
                return (
                  <tr key={item.id} className={`category-row ${dragOverId === item.id ? "ring-2 ring-primary/50" : ""}`} data-item-id={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    style={{ opacity: dragId === item.id ? 0.4 : 1 }}
                  >
                    <td>
                      <div className="flex items-center gap-0.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0" />
                        {hasChildren && (
                          <button onClick={() => toggleCollapse(item.id)} className="p-0.5">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{renderCell(item, "itemNo", item.itemNo)}</td>
                    <td style={{ paddingLeft: `${depth * 16 + 12}px` }}>
                      {renderCell(item, "description", item.description)}
                    </td>
                    <td colSpan={13} className="text-right font-bold">
                      Subtotal: ₱{formatCurrency(getCategoryTotal(item.id))}
                    </td>
                    <td>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAddItemDialog(item.id)} title="Add item">
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addSubCategory(item.id)} title="Add sub-category">
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setSaveCatTemplateId(item.id);
                          setSaveCatTemplateName(item.description);
                        }} title="Save as template">
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={item.id} data-item-id={item.id}
                  className={dragOverId === item.id ? "ring-2 ring-primary/50" : ""}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  style={{ opacity: dragId === item.id ? 0.4 : 1 }}
                >
                  <td>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing mx-auto" />
                  </td>
                  <td>{renderCell(item, "itemNo", item.itemNo)}</td>
                  <td style={{ paddingLeft: `${depth * 16 + 12}px` }}>
                    {renderCell(item, "description", item.description)}
                  </td>
                  <td>{renderCell(item, "quantity", item.quantity, true)}</td>
                  <td>{renderCell(item, "unit", item.unit)}</td>
                  <td>{renderCell(item, "materialsCost", item.materialsCost, true)}</td>
                  <td>{renderCell(item, "laborEquipmentCost", item.laborEquipmentCost, true)}</td>
                  <td>{renderCell(item, "estimatedDirectCost", item.estimatedDirectCost, true, false)}</td>
                  <td>{renderCell(item, "ocmPercent", item.ocmPercent, true)}</td>
                  <td>{renderCell(item, "profitPercent", item.profitPercent, true)}</td>
                  <td>{renderCell(item, "totalMarkupPercent", item.totalMarkupPercent, true, false)}</td>
                  <td>{renderCell(item, "markupValue", item.markupValue, true, false)}</td>
                  <td>{renderCell(item, "vatPercent", item.vatPercent, true)}</td>
                  <td>{renderCell(item, "vatCost", item.vatCost, true, false)}</td>
                  <td>{renderCell(item, "totalIndirectCost", item.totalIndirectCost, true, false)}</td>
                  <td className="font-semibold">{renderCell(item, "totalCost", item.totalCost, true, false)}</td>
                  <td>{renderCell(item, "unitCost", item.unitCost, true, false)}</td>
                  <td>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCopyItem(item); setCopyScope("this"); setCopyTarget("same"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={18} className="text-center py-8 text-muted-foreground">
                  No items yet. Add a category or item to get started.
                </td>
              </tr>
            )}
          </tbody>
          {items.some((i) => !i.isCategory) && (
            <tfoot>
              <tr className="font-bold bg-muted">
                <td colSpan={15} className="text-right">Grand Total:</td>
                <td className="text-right">
                  ₱{formatCurrency(items.filter((i) => !i.isCategory && !i.parentId).reduce((s, i) => s + i.totalCost, 0) +
                    items.filter((i) => i.isCategory && !i.parentId).reduce((s, i) => s + getCategoryTotal(i.id), 0))}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      {}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the item and all its children. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog open={!!syncPrompt} onOpenChange={(open) => {
        if (!open && syncPrompt) {
          if (!syncConfirmedRef.current) {
            
            updateItems(syncPrompt.previousItems);
          }
          syncConfirmedRef.current = false;
          setSyncPrompt(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {syncPrompt && syncPrompt.targets.length > 1 ? `Also update ${syncPrompt.targets.length} linked DUPAs?` : "Also update the linked DUPA?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You changed <span className="font-medium">
                {syncPrompt?.field === "ocmPercent" ? "OCM %" : syncPrompt?.field === "profitPercent" ? "Profit / Markup %" : "VAT %"}
              </span>{" "}
              on {syncPrompt && syncPrompt.targets.length > 1 ? `${syncPrompt.targets.length} ABC rows` : "this ABC row"}.
              Do you want to <span className="font-medium">hard-reset</span> the linked DUPA value(s) to{" "}
              <span className="font-medium">{syncPrompt?.newValue}%</span> so they stay in sync?
              <br />
              <span className="text-xs text-muted-foreground">Choosing "Keep DUPA(s) as is" will also undo the ABC change so nothing diverges.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {syncPrompt && syncPrompt.targets.length > 0 && (
            <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground border border-border rounded p-2 space-y-1">
              {syncPrompt.targets.map((t) => (
                <div key={t.abcItemId} className="flex justify-between gap-2">
                  <span className="truncate">{t.itemNo} — {t.description}</span>
                  <span className="shrink-0">{t.oldDupaValue}% → {syncPrompt.newValue}%</span>
                </div>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep DUPA(s) as is</AlertDialogCancel>
            <AlertDialogAction onClick={applyDupaSync}>
              Hard reset DUPA{syncPrompt && syncPrompt.targets.length > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Dialog */}
      <Dialog open={!!copyItem} onOpenChange={() => setCopyItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Item</DialogTitle>
            <DialogDescription>Choose where to copy this item.</DialogDescription>
          </DialogHeader>
          {copyItem && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copying: <span className="font-medium text-foreground">{copyItem.itemNo} — {copyItem.description}</span>
              </p>
              {project.dupaItems.find((d) => d.abcItemId === copyItem.id) && (
                <p className="text-xs text-muted-foreground">DUPA sheet will also be copied.</p>
              )}

              <div>
                <Label className="text-sm mb-1.5 block">Copy to:</Label>
                <Select value={copyScope} onValueChange={(v) => { setCopyScope(v as any); setCopyTarget("same"); setCopyProjectId(""); setCopyOtherCategoryId("__new__"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this">This project</SelectItem>
                    <SelectItem value="other">Other project</SelectItem>
                    <SelectItem value="new">New project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {copyScope === "this" && (
                <div>
                  <Label className="text-sm mb-1.5 block">Category:</Label>
                  <Select value={copyTarget} onValueChange={setCopyTarget}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same">Same category{copyItem.parentId ? ` (${categories.find(c => c.id === copyItem.parentId)?.description || ""})` : " (root)"}</SelectItem>
                      <SelectItem value="new">New category</SelectItem>
                      {categories.filter((c) => c.id !== copyItem.parentId).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.itemNo} — {cat.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {copyScope === "other" && (
                <>
                  <div>
                    <Label className="text-sm mb-1.5 block">Select project:</Label>
                    {otherProjects.length > 0 ? (
                      <Select value={copyProjectId} onValueChange={(v) => { setCopyProjectId(v); setCopyOtherCategoryId("__new__"); }}>
                        <SelectTrigger><SelectValue placeholder="Choose a project..." /></SelectTrigger>
                        <SelectContent>
                          {otherProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No other projects available.</p>
                    )}
                  </div>
                  {copyProjectId && (
                    <div>
                      <Label className="text-sm mb-1.5 block">Target category:</Label>
                      <Select value={copyOtherCategoryId} onValueChange={setCopyOtherCategoryId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new__">New category</SelectItem>
                          {getOtherProjectCategories().map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.itemNo} — {cat.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {copyOtherCategoryId === "__new__" && (
                        <Input
                          className="mt-2"
                          placeholder="New category name"
                          value={copyOtherNewCatName}
                          onChange={(e) => setCopyOtherNewCatName(e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {copyScope === "new" && (
                <div>
                  <Label className="text-sm mb-1.5 block">Category name in new project:</Label>
                  <Input
                    value={copyOtherNewCatName}
                    onChange={(e) => setCopyOtherNewCatName(e.target.value)}
                    placeholder="Category name"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyItem(null)}>Cancel</Button>
            <Button onClick={handleCopy} disabled={copyScope === "other" && !copyProjectId}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-lg [&>*]:min-w-0">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>Create a new line item and choose its category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 min-w-0">
            <div>
              <Label className="text-sm mb-1.5 block">Use Template (optional)</Label>
              {(() => {
                const templates = getTemplates();
                const selected = addItemTemplateId !== "__none__" ? templates.find(t => t.id === addItemTemplateId) : null;
                const selectTemplate = (v: string) => {
                  setAddItemTemplateId(v);
                  if (v !== "__none__") {
                    const tmpl = templates.find(t => t.id === v);
                    if (tmpl) {
                      if (!addItemDesc) setAddItemDesc(tmpl.description);
                      if (!addItemUnit) setAddItemUnit(tmpl.unit);
                    }
                  }
                  setTemplateComboOpen(false);
                };
                return (
                  <Popover open={templateComboOpen} onOpenChange={setTemplateComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={templateComboOpen}
                        className="w-full min-w-0 max-w-full justify-between overflow-hidden font-normal"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                          {selected ? <Package className="h-3 w-3 shrink-0" /> : null}
                          <span className="block min-w-0 flex-1 truncate text-left" title={selected ? selected.name : "No template (blank DUPA)"}>
                            {selected ? selected.name : "No template (blank DUPA)"}
                          </span>
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command
                        filter={(value, search) => {
                          if (!search) return 1;
                          return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                        }}
                      >
                        <CommandInput placeholder="Search templates..." />
                        <CommandList>
                          <CommandEmpty>No templates found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="No template (blank DUPA)" onSelect={() => selectTemplate("__none__")}>
                              <Check className={cn("h-3.5 w-3.5 mr-2 shrink-0", addItemTemplateId === "__none__" ? "opacity-100" : "opacity-0")} />
                              <span className="block min-w-0 flex-1 truncate">No template (blank DUPA)</span>
                            </CommandItem>
                            {templates.map((t) => (
                              <CommandItem
                                key={t.id}
                                value={`${t.name} ${t.description ?? ""}`}
                                onSelect={() => selectTemplate(t.id)}
                                className="min-w-0"
                              >
                                <Check className={cn("h-3.5 w-3.5 mr-2 shrink-0", addItemTemplateId === t.id ? "opacity-100" : "opacity-0")} />
                                <Package className="h-3 w-3 mr-1.5 shrink-0" />
                                <span className="block min-w-0 flex-1 truncate" title={t.name}>{t.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Description</Label>
              <Input value={addItemDesc} onChange={(e) => setAddItemDesc(e.target.value)} placeholder="Item description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Quantity</Label>
                <Input type="number" value={addItemQty} onChange={(e) => setAddItemQty(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Unit</Label>
                <UnitCombobox value={addItemUnit} onChange={setAddItemUnit} placeholder="Select unit (or type to add new)" />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Category</Label>
              <Select value={addItemCategoryId} onValueChange={setAddItemCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category (root level)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.itemNo} — {cat.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItemConfirm}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!saveCatTemplateId} onOpenChange={() => setSaveCatTemplateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Category as Template</DialogTitle>
            <DialogDescription>Save this category and its items as a reusable General Category Template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1.5 block">Template Name</Label>
              <Input value={saveCatTemplateName} onChange={(e) => setSaveCatTemplateName(e.target.value)} placeholder="Template name" />
            </div>
            {saveCatTemplateId && (
              <div className="text-xs text-muted-foreground">
                <p>Items that will be included:</p>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  {items.filter(i => i.parentId === saveCatTemplateId && !i.isCategory).map(i => {
                    const dupa = project.dupaItems.find(d => d.abcItemId === i.id);
                    return (
                      <li key={i.id}>
                        {i.description} ({i.unit})
                        {dupa && <span className="text-primary/70"> — DUPA content will be saved</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveCatTemplateId(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!saveCatTemplateId) return;
              const cat = items.find(i => i.id === saveCatTemplateId);
              if (!cat) return;
              const childItems = items.filter(i => i.parentId === saveCatTemplateId && !i.isCategory);
              const dupaTemplatesList = getTemplates();
              const templateItems: GeneralCategoryTemplateItem[] = childItems.map(child => {
                const dupa = project.dupaItems.find(d => d.abcItemId === child.id);
                if (!dupa) return { description: child.description, unit: child.unit, quantity: child.quantity };
                
                let matchedDT = dupaTemplatesList.find(dt => dt.description === dupa.description);
                if (!matchedDT) {
                  
                  const newDT = dupaToTemplate(dupa, dupa.description || child.description);
                  saveTemplate(newDT);
                  dupaTemplatesList.push(newDT); 
                  matchedDT = newDT;
                }
                return {
                  description: child.description,
                  unit: child.unit,
                  quantity: child.quantity,
                  dupaTemplateId: matchedDT.id,
                };
              });
              const genTemplate: GeneralCategoryTemplate = {
                id: crypto.randomUUID(),
                name: saveCatTemplateName.trim() || cat.description,
                description: cat.description,
                items: templateItems,
                createdAt: new Date().toISOString(),
              };
              saveGeneralTemplate(genTemplate);
              setSaveCatTemplateId(null);
              toast({ title: "Category template saved", description: `"${genTemplate.name}" with ${templateItems.length} items (DUPA content included).` });
            }} disabled={!saveCatTemplateName.trim()}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {}
      <Dialog open={templatePickerOpen} onOpenChange={(open) => { setTemplatePickerOpen(open); if (!open) { setPreviewTemplate(null); setCatTemplateSearch(""); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Category Template</DialogTitle>
            <DialogDescription>Select a template to create a new category with pre-filled items and DUPA data.</DialogDescription>
          </DialogHeader>
          {(() => {
            const generalTemplates = getGeneralTemplates();
            const dupaTemplatesList = getTemplates();
            if (generalTemplates.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No category templates available</p>
                  <p className="text-sm">Save an ABC category as a template first, or create one in the Templates tab.</p>
                </div>
              );
            }
            const q = catTemplateSearch.trim().toLowerCase();
            const filtered = q
              ? generalTemplates.filter(gt =>
                  gt.name.toLowerCase().includes(q) ||
                  (gt.description || "").toLowerCase().includes(q)
                )
              : generalTemplates;
            return (
              <div className="space-y-3">
                <Input
                  placeholder="Search templates..."
                  value={catTemplateSearch}
                  onChange={(e) => setCatTemplateSearch(e.target.value)}
                  autoFocus
                />
                {filtered.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">No templates match "{catTemplateSearch}".</div>
                ) : filtered.map((gt) => (
                  <div key={gt.id} className={`border rounded-lg p-4 cursor-pointer transition-colors hover:border-primary/50 ${previewTemplate?.id === gt.id ? "border-primary bg-primary/5" : ""}`} onClick={() => setPreviewTemplate(previewTemplate?.id === gt.id ? null : gt)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{gt.name}</h3>
                        <p className="text-xs text-muted-foreground">{gt.description} • {gt.items.length} items</p>
                      </div>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); addCategory(gt.id); setTemplatePickerOpen(false); setPreviewTemplate(null); setCatTemplateSearch(""); }}>
                        Use Template
                      </Button>
                    </div>
                    {previewTemplate?.id === gt.id && (
                      <div className="mt-3 border-t pt-3">
                        <table className="table-grid w-full text-xs">
                          <thead><tr><th>Description</th><th>Unit</th><th>Linked DUPA</th></tr></thead>
                          <tbody>
                            {gt.items.map((item, i) => {
                              const linkedDupa = item.dupaTemplateId ? dupaTemplatesList.find(d => d.id === item.dupaTemplateId) : null;
                              return (
                                <tr key={i}>
                                  <td>{item.description}</td>
                                  <td>{item.unit}</td>
                                  <td className="text-primary/70">{linkedDupa ? `✓ ${linkedDupa.name} (${linkedDupa.materials.length}M, ${linkedDupa.labor.length}L, ${linkedDupa.equipment.length}E)` : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTemplatePickerOpen(false); setPreviewTemplate(null); setCatTemplateSearch(""); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
