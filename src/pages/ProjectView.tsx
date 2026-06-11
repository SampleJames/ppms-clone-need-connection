import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, History, Download, Upload, FileSpreadsheet, FileText, Minimize2, Maximize2, Printer, FolderInput, FolderOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Project, ProjectVersion } from "@/types";
import { getProject, saveProject } from "@/lib/storage";
import { syncDupaToABC } from "@/lib/calculations";
import { exportProjectToExcel, importExcelToProject } from "@/lib/excel";
import { exportCategoriesToExcel, importCategoriesFromExcel } from "@/lib/categoryExcel";
import { exportABCToPDF, exportDUPAToPDF } from "@/lib/pdf";
import { toast } from "@/hooks/use-toast";
import ABCTable from "@/components/ABCTable";
import DUPAList from "@/components/DUPAList";
import SCurve from "@/components/SCurve";
import PriceList from "@/components/PriceList";
import Playground from "@/components/Playground";
import Templates from "@/components/Templates";

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [proMode, setProMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryImportRef = useRef<HTMLInputElement>(null);
  const [exportCatOpen, setExportCatOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

  const categoryOptions = useMemo(() => {
    if (!project) return [] as { id: string; label: string; depth: number }[];
    const byParent = new Map<string | null, typeof project.abcItems>();
    for (const it of project.abcItems) {
      const k = it.parentId ?? null;
      const arr = byParent.get(k) ?? [];
      arr.push(it);
      byParent.set(k, arr);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const out: { id: string; label: string; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const it of byParent.get(parentId) ?? []) {
        if (it.isCategory) {
          out.push({ id: it.id, label: `${it.itemNo}  ${it.description}`, depth });
          walk(it.id, depth + 1);
        }
      }
    };
    walk(null, 0);
    return out;
  }, [project]);

  useEffect(() => {
    if (id) {
      const p = getProject(id);
      if (p) {
        // Best-effort: attach price-list specifications to existing DUPA items
        // that were picked before the spec-carry feature existed.
        import("@/lib/specBackfill").then(({ backfillMaterials, backfillLabor, backfillEquipment }) => {
          const dupaItems = p.dupaItems.map((d) => ({
            ...d,
            materials: backfillMaterials(d.materials),
            labor: backfillLabor(d.labor),
            equipment: backfillEquipment(d.equipment),
          }));
          setProject({ ...p, dupaItems });
        });
      } else {
        navigate("/");
      }
    }
  }, [id, navigate]);

  const save = useCallback((updated: Project) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  const handleSync = useCallback(() => {
    if (!project) return;
    const synced = syncDupaToABC(project.abcItems, project.dupaItems);
    save({ ...project, abcItems: synced });
    toast({ title: "ABC synced with DUPA data" });
  }, [project, save]);

  const handleSaveVersion = () => {
    if (!project || !versionName.trim()) return;
    const version: ProjectVersion = {
      id: crypto.randomUUID(),
      name: versionName.trim(),
      createdAt: new Date().toISOString(),
      abcItems: JSON.parse(JSON.stringify(project.abcItems)),
      dupaItems: JSON.parse(JSON.stringify(project.dupaItems)),
      settings: { ...project.settings },
    };
    save({ ...project, versions: [...project.versions, version] });
    setVersionName("");
    setVersionDialogOpen(false);
    toast({ title: "Version saved" });
  };

  const handleRestoreVersion = (version: ProjectVersion) => {
    if (!project) return;
    save({
      ...project,
      abcItems: JSON.parse(JSON.stringify(version.abcItems)),
      dupaItems: JSON.parse(JSON.stringify(version.dupaItems)),
      settings: { ...version.settings },
    });
    setHistoryOpen(false);
    toast({ title: `Restored: ${version.name}` });
  };

  const handleExcelExport = () => {
    if (!project) return;
    exportProjectToExcel(project);
    toast({ title: "Excel file exported" });
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    try {
      const { abcItems, dupaItems } = await importExcelToProject(file);
      save({ ...project, abcItems, dupaItems });
      toast({ title: `Imported ${abcItems.length} ABC items and ${dupaItems.length} DUPA sheets` });
    } catch {
      toast({ title: "Import failed", description: "Could not parse the Excel file.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePDFExportABC = () => {
    if (!project) return;
    exportABCToPDF(project);
    toast({ title: "ABC PDF exported" });
  };

  const handlePDFExportDUPA = () => {
    if (!project) return;
    exportDUPAToPDF(project);
    toast({ title: "All DUPA PDF exported" });
  };

  const openExportCategoriesDialog = () => {
    setSelectedCategoryIds(new Set());
    setExportCatOpen(true);
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmCategoryExport = async () => {
    if (!project || selectedCategoryIds.size === 0) return;
    try {
      await exportCategoriesToExcel(project, Array.from(selectedCategoryIds));
      setExportCatOpen(false);
      toast({ title: `Exported ${selectedCategoryIds.size} ${selectedCategoryIds.size === 1 ? "category" : "categories"}` });
    } catch (err) {
      toast({ title: "Category export failed", description: String((err as Error)?.message ?? err), variant: "destructive" });
    }
  };

  const handleCategoryImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    try {
      const { project: merged, abcCount, dupaCount } = await importCategoriesFromExcel(file, project);
      save(merged);
      toast({ title: `Imported ${abcCount} ABC items and ${dupaCount} DUPA sheets` });
    } catch (err) {
      toast({ title: "Category import failed", description: String((err as Error)?.message ?? err), variant: "destructive" });
    }
    if (categoryImportRef.current) categoryImportRef.current.value = "";
  };

  if (!project) return null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
      <input type="file" ref={categoryImportRef} accept=".xlsx" className="hidden" onChange={handleCategoryImport} />

      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground truncate">{project.description}</p>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {}
          <Button variant="outline" size="sm" onClick={() => navigate(`/print?project=${project.id}`)}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>

          {}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Import from Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExcelExport}>
                <Download className="h-4 w-4 mr-2" /> Export to Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openExportCategoriesDialog} disabled={categoryOptions.length === 0}>
                <FolderOutput className="h-4 w-4 mr-2" /> Export Categories…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => categoryImportRef.current?.click()}>
                <FolderInput className="h-4 w-4 mr-2" /> Import Categories…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handlePDFExportABC}>
                <FileText className="h-4 w-4 mr-2" /> Export ABC as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePDFExportDUPA}>
                <FileText className="h-4 w-4 mr-2" /> Export All DUPA as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenuSeparator className="hidden" />

          <Button variant="outline" size="sm" onClick={() => setVersionDialogOpen(true)}>
            <Save className="h-4 w-4 mr-1" /> Save Version
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} disabled={project.versions.length === 0}>
            <History className="h-4 w-4 mr-1" /> History ({project.versions.length})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="abc" className="w-full">
        <div className="sticky top-0 z-20 bg-background pt-2 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="abc">ABC</TabsTrigger>
              <TabsTrigger value="dupa">DUPA</TabsTrigger>
              <TabsTrigger value="scurve">S-Curve</TabsTrigger>
              <TabsTrigger value="pricelist">Price List</TabsTrigger>
              <TabsTrigger value="playground">Playground</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompactView(!compactView)}
              className="gap-1 text-xs"
            >
              {compactView ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              {compactView ? "Full View" : "Compact"}
            </Button>
          </div>
        </div>
        <TabsContent value="abc">
          <ABCTable project={project} onSave={save} onSync={handleSync} />
        </TabsContent>
        <TabsContent value="dupa">
          <div className={compactView ? "max-w-[80%] mx-auto" : ""}>
            <DUPAList project={project} onSave={save} compact={compactView} proMode={proMode} onProModeChange={setProMode} />
          </div>
        </TabsContent>
        <TabsContent value="scurve">
          <div className={compactView ? "max-w-[80%] mx-auto" : ""}>
            <SCurve project={project} compact={compactView} />
          </div>
        </TabsContent>
        <TabsContent value="pricelist">
          <PriceList project={project} compact={compactView} onSave={save} />
        </TabsContent>
        <TabsContent value="playground">
          <Playground compact={compactView} />
        </TabsContent>
        <TabsContent value="templates">
          <Templates compact={compactView} project={project} />
        </TabsContent>
      </Tabs>

      {}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
            <DialogDescription>Create a snapshot of the current project state.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Version name (e.g., v1.0, Initial Draft)" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVersion} disabled={!versionName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>Restore a previous version of this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto">
            {project.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="font-medium text-sm">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(v)}>
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={exportCatOpen} onOpenChange={setExportCatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Categories</DialogTitle>
            <DialogDescription>
              Pick the categories to export. Each selected category is exported with all its sub-items and matching DUPA sheets, and can be re-imported into any project.
            </DialogDescription>
          </DialogHeader>
          {categoryOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">This project has no categories yet.</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selectedCategoryIds.size} selected</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setSelectedCategoryIds(new Set(categoryOptions.map((c) => c.id)))}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setSelectedCategoryIds(new Set())}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <ScrollArea className="h-72 border rounded-md p-2">
                <div className="space-y-1">
                  {categoryOptions.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                      style={{ paddingLeft: `${0.5 + c.depth * 1.25}rem` }}
                    >
                      <Checkbox
                        checked={selectedCategoryIds.has(c.id)}
                        onCheckedChange={() => toggleCategorySelection(c.id)}
                      />
                      <span className="text-sm truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportCatOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCategoryExport} disabled={selectedCategoryIds.size === 0}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
