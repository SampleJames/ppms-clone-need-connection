import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Project, ABCItem, DUPAItem } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import DUPADetail from "@/components/DUPADetail";
import { createDefaultEquipmentRows, createDefaultLaborRows, createDefaultMaterials } from "@/lib/dupaDefaults";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  project: Project;
  onSave: (p: Project) => void;
  compact?: boolean;
  proMode?: boolean;
  onProModeChange?: (v: boolean) => void;
}

export default function DUPAList({ project, onSave, compact = false, proMode = false, onProModeChange }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [zoom, setZoom] = useState(100);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const handleAutoFit = useCallback(() => {
    if (!scrollContainerRef.current || !contentContainerRef.current) return;
    const prevZoom = zoom;
    contentContainerRef.current.style.zoom = '100%';
    const contentWidth = contentContainerRef.current.scrollWidth;
    const containerWidth = scrollContainerRef.current.clientWidth;
    contentContainerRef.current.style.zoom = `${prevZoom}%`;
    if (contentWidth <= containerWidth) {
      setZoom(80);
    } else {
      const fitZoom = Math.max(40, Math.floor((containerWidth / contentWidth) * 80 / 5) * 5);
      setZoom(fitZoom);
    }
  }, [zoom]);

  const lineItems = project.abcItems.filter((i) => !i.isCategory);

  // Sort line items by itemNo naturally
  const sortedLineItems = [...lineItems].sort((a, b) => {
    const partsA = a.itemNo.split(".").map(Number);
    const partsB = b.itemNo.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] ?? 0;
      const numB = partsB[i] ?? 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  });

  const getDupa = (abcItemId: string): DUPAItem | undefined => {
    return project.dupaItems.find((d) => d.abcItemId === abcItemId);
  };

  const createDupa = (abcItem: ABCItem): DUPAItem => {
    return {
      id: crypto.randomUUID(),
      abcItemId: abcItem.id,
      itemNo: abcItem.itemNo,
      description: abcItem.description,
      quantity: abcItem.quantity,
      unit: abcItem.unit,
      materials: createDefaultMaterials(),
      labor: createDefaultLaborRows(),
      equipment: createDefaultEquipmentRows(),
      totalMaterials: 0,
      totalLabor: 0,
      totalEquipment: 0,
      totalDirectCost: 0,
      ocmPercent: project.settings.ocmPercent,
      profitPercent: project.settings.profitPercent,
      indirectCostPercent: project.settings.ocmPercent + project.settings.profitPercent,
      indirectCost: 0,
      totalDirectAndIndirect: 0,
      vatPercent: project.settings.vatPercent,
      vat: 0,
      totalPrice: 0,
      unitPrice: 0,
    };
  };

  const handleSelect = (abcItemId: string) => {
    setSelectedId(abcItemId);
    // Create DUPA if it doesn't exist
    if (!getDupa(abcItemId)) {
      const abcItem = project.abcItems.find((i) => i.id === abcItemId);
      if (abcItem) {
        const dupa = createDupa(abcItem);
        onSave({ ...project, dupaItems: [...project.dupaItems, dupa] });
      }
    }
  };

  const handleDupaUpdate = (updated: DUPAItem) => {
    const newDupaItems = project.dupaItems.map((d) => (d.id === updated.id ? updated : d));
    onSave({ ...project, dupaItems: newDupaItems });
  };

  const selectedDupa = selectedId ? getDupa(selectedId) : undefined;
  const selectedAbc = selectedId ? project.abcItems.find((i) => i.id === selectedId) : undefined;
  const selectedCategory = selectedAbc?.parentId
    ? project.abcItems.find(i => i.id === selectedAbc.parentId && i.isCategory)
    : null;

  if (lineItems.length === 0) {
    return (
      <div className="mt-4 text-center py-12 text-muted-foreground">
        <p className="font-medium">No line items in ABC table</p>
        <p className="text-sm">Add items to the ABC table first, then create their unit price analysis here.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium whitespace-nowrap">Select Work Item:</label>
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger className="max-w-lg">
            <SelectValue placeholder="Choose an item to view/edit its DUPA..." />
          </SelectTrigger>
          <SelectContent className="max-w-lg">
            {sortedLineItems.map((item) => {
              const dupa = getDupa(item.id);
              return (
                <SelectItem key={item.id} value={item.id}>
                  <span className="flex items-center gap-2 truncate max-w-[450px]">
                    <span className="font-medium shrink-0">{item.itemNo}</span>
                    <span className="shrink-0">—</span>
                    <span className="truncate">{item.description || "Untitled"}</span>
                    {dupa && (
                      <span className="text-muted-foreground text-xs ml-2 shrink-0">
                        (₱{formatCurrency(dupa.totalPrice)})
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
          <ZoomOut className="h-3.5 w-3.5 cursor-pointer hover:text-foreground" onClick={() => setZoom(Math.max(40, zoom - 10))} />
          <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={40} max={100} step={5} className="w-20" />
          <ZoomIn className="h-3.5 w-3.5 cursor-pointer hover:text-foreground" onClick={() => setZoom(Math.min(100, zoom + 10))} />
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] font-medium" onClick={handleAutoFit} title="Auto-fit">
            <Maximize className="h-3 w-3 mr-0.5" />Fit
          </Button>
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] font-medium" onClick={() => setZoom(100)} title="Reset to 100%">
            100%
          </Button>
          <span className="text-[10px] w-7 text-center">{zoom}%</span>
        </div>
        {onProModeChange && (
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="dupa-pro-mode" className="text-xs text-muted-foreground cursor-pointer">
              {proMode ? "Pro" : "Simple"}
            </Label>
            <Switch id="dupa-pro-mode" checked={proMode} onCheckedChange={onProModeChange} className="scale-75" />
          </div>
        )}
      </div>

      {}
      {selectedDupa && selectedAbc && (
        <div className="overflow-x-auto rounded-lg border" ref={scrollContainerRef}>
        <div ref={contentContainerRef} style={{ zoom: `${zoom}%` }}>
        <div className="overflow-hidden">
          {selectedCategory && (
            <div className="bg-secondary px-4 py-1.5 text-xs font-semibold border-b">
              {selectedCategory.itemNo}. {selectedCategory.description}
            </div>
          )}
          <div className="bg-primary text-primary-foreground text-center py-1.5 font-bold text-xs">
            Detailed Unit Price Analysis
          </div>
          <div className="border-b">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 text-sm font-semibold w-1/3"></th>
                  <th className="text-center px-4 py-2 text-sm font-semibold w-1/6">Qty.</th>
                  <th className="text-center px-4 py-2 text-sm font-semibold w-1/6">Unit</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold w-1/6">Unit Price</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold w-1/6">Total Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-secondary font-bold">
                  <td className="px-4 py-2 text-sm">
                    {selectedDupa.itemNo}. &nbsp; {selectedDupa.description}
                  </td>
                  <td className="text-center px-4 py-2 text-sm">{selectedDupa.quantity}</td>
                  <td className="text-center px-4 py-2 text-sm">{selectedDupa.unit}</td>
                  <td className="text-right px-4 py-2 text-sm">₱{formatCurrency(selectedDupa.unitPrice)}</td>
                  <td className="text-right px-4 py-2 text-sm">₱{formatCurrency(selectedDupa.totalPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={compact ? "p-2" : "p-4"}>
            <DUPADetail dupa={selectedDupa} onUpdate={handleDupaUpdate} compact={compact} proMode={proMode} project={project} />
          </div>
        </div>
        </div>
        </div>
      )}

      {!selectedId && (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p className="font-medium">Select a work item above</p>
          <p className="text-sm">Choose an ABC line item to view or edit its Detailed Unit Price Analysis.</p>
        </div>
      )}
    </div>
  );
}
