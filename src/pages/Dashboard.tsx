import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Copy, Trash2, Pencil, FolderOpen, List, LayoutGrid, Square, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Project } from "@/types";
import { getProjects, createProject, deleteProject, duplicateProject, saveProject } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "grid" | "single" | "compact";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const gridClass = useMemo(() => {
    switch (viewMode) {
      case "list": return "grid grid-cols-1 gap-2";
      case "single": return "grid grid-cols-1 gap-4";
      case "compact": return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";
      case "grid":
      default: return "grid grid-cols-1 md:grid-cols-2 gap-3";
    }
  }, [viewMode]);

  const reload = () => setProjects(getProjects());
  useEffect(reload, []);

  const matchesSearch = (s: string) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.toLowerCase().includes(q);
  };

  const filtered = projects.filter((p) =>
    matchesSearch(`${p.name} ${p.description ?? ""}`)
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), newDesc.trim());
    setNewName("");
    setNewDesc("");
    setCreateOpen(false);
    reload();
    toast({ title: "Project created" });
  };

  const handleDuplicate = (id: string) => {
    duplicateProject(id);
    reload();
    toast({ title: "Project duplicated" });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteProject(deleteId);
    setDeleteId(null);
    reload();
    toast({ title: "Project deleted" });
  };

  const handleRename = () => {
    if (!renameId || !renameName.trim()) return;
    const p = projects.find((x) => x.id === renameId);
    if (p) {
      saveProject({ ...p, name: renameName.trim() });
      setRenameId(null);
      reload();
      toast({ title: "Project renamed" });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="pl-8"
          />
        </div>
        <div className="inline-flex rounded-md border bg-background overflow-hidden">
          {([
            { mode: "list", icon: List, label: "List" },
            { mode: "grid", icon: LayoutGrid, label: "Grid" },
            { mode: "single", icon: Square, label: "Single" },
            { mode: "compact", icon: Grid3x3, label: "Compact" },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              title={label}
              onClick={() => setViewMode(mode)}
              className={cn(
                "p-2 transition-colors",
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{search ? "No matching projects" : "No projects yet"}</p>
            {!search && <p className="text-sm">Create your first project to get started.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className={gridClass}>
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/project/${p.id}`)}
            >
              <CardContent className={cn("flex items-center justify-between", viewMode === "compact" ? "py-3 px-4" : "py-4 px-5")}>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  {p.description && viewMode !== "compact" && (
                    <p className="text-sm text-muted-foreground truncate">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.abcItems.length} items · Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setRenameId(p.id); setRenameName(p.name); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(p.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new construction cost project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Enter a new name for the project.</DialogDescription>
          </DialogHeader>
          <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All data including ABC and DUPA items will be permanently deleted.
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
    </div>
  );
}
