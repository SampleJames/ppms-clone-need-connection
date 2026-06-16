import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SignInScreen from "@/components/auth/SignInScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, FolderOpen, Trash2, Crown, Pencil, Shield, Mail, Trash, User as UserIcon, Search, List, LayoutGrid, Square, Grid3x3, RotateCcw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  CollabProjectDoc, createCollabProject, deleteCollabProject, subscribeMyProjects,
  subscribeAllProjects, fetchOwnerInfo, isAdminEmail,
  DeletedProjectDoc, subscribeDeletedProjects, restoreDeletedProject,
} from "@/lib/collabStorage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "grid" | "single" | "compact";

export default function CollabPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<CollabProjectDoc[]>([]);
  const [allProjects, setAllProjects] = useState<CollabProjectDoc[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<DeletedProjectDoc[]>([]);
  const [ownerInfoMap, setOwnerInfoMap] = useState<Record<string, { email: string; name: string }>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editProject, setEditProject] = useState<CollabProjectDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const isAdmin = useMemo(() => isAdminEmail(user?.email), [user]);

  const gridClass = useMemo(() => {
    switch (viewMode) {
      case "list": return "grid grid-cols-1 gap-2 mt-4";
      case "single": return "grid grid-cols-1 gap-4 mt-4";
      case "compact": return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4";
      case "grid":
      default: return "grid grid-cols-1 md:grid-cols-2 gap-3 mt-4";
    }
  }, [viewMode]);

  const matchesSearch = (s: string) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.toLowerCase().includes(q);
  };

  useEffect(() => {
    if (!user) return;
    return subscribeMyProjects(user.uid, setProjects);
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeAllProjects(setAllProjects);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeDeletedProjects(setDeletedProjects);
  }, [isAdmin]);

  // Backfill owner email/name for legacy projects missing ownerEmail
  useEffect(() => {
    if (!isAdmin) return;
    const missing = allProjects.filter(
      (p) => !p.ownerEmail && p.ownerId && !ownerInfoMap[p.id]
    );
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (p) => [p.id, await fetchOwnerInfo(p.id, p.ownerId)] as const)
      );
      if (cancelled) return;
      setOwnerInfoMap((prev) => {
        const next = { ...prev };
        for (const [id, info] of entries) next[id] = info;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [isAdmin, allProjects, ownerInfoMap]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <SignInScreen />;

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const id = await createCollabProject(name.trim(), desc.trim());
      setName(""); setDesc(""); setCreateOpen(false);
      navigate(`/collab/project/${id}`);
    } catch (e) {
      toast({ title: "Create failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const filteredMy = projects.filter((p) =>
    matchesSearch(`${p.name} ${p.description ?? ""}`)
  );
  const filteredAll = allProjects.filter((p) => {
    const oe = p.ownerEmail || ownerInfoMap[p.id]?.email || "";
    const on = p.ownerName || ownerInfoMap[p.id]?.name || "";
    return matchesSearch(`${p.name} ${p.description ?? ""} ${oe} ${on}`);
  });
  const filteredDeleted = deletedProjects.filter((d) =>
    matchesSearch(`${d.name} ${d.description ?? ""} ${d.ownerEmail ?? ""} ${d.deletedByEmail ?? ""} ${d.deletedByName ?? ""}`)
  );

  const handleRestore = async (d: DeletedProjectDoc) => {
    try {
      const pid = await restoreDeletedProject(d.id);
      toast({ title: "Project restored", description: `"${d.name}" has been restored.` });
      navigate(`/collab/project/${pid}`);
    } catch (e) {
      toast({ title: "Restore failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const renderMyProjects = () => (
    filteredMy.length === 0 ? (
      <Card className="mt-6">
        <CardContent className="py-12 text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{search ? "No matching projects" : "No projects yet"}</p>
          {!search && <p className="text-sm">Create one or accept an invite link to get started.</p>}
        </CardContent>
      </Card>
    ) : (
      <div className={gridClass}>
        {filteredMy.map((p) => {
          const isOwner = p.ownerId === user.uid;
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/collab/project/${p.id}`)}>
              <CardContent className={cn("flex items-center justify-between", viewMode === "compact" ? "py-3 px-4" : "py-4 px-5")}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{p.name}</p>
                    {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  {p.description && viewMode !== "compact" && <p className="text-sm text-muted-foreground truncate">{p.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.memberIds?.length ?? 1} member{(p.memberIds?.length ?? 1) === 1 ? "" : "s"}
                    {p.lastEditedByName && viewMode !== "compact" ? ` · last edit by ${p.lastEditedByName}` : ""}
                    {p.updatedAt?.toDate ? ` · ${p.updatedAt.toDate().toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isOwner && (
                    <>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => {
                          setEditProject(p);
                          setEditName(p.name);
                          setEditDesc(p.description || "");
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => {
                          if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                            deleteCollabProject(p.id).catch((e) =>
                              toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" })
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )
  );

  const renderAllProjects = () => (
    filteredAll.length === 0 ? (
      <Card className="mt-6">
        <CardContent className="py-12 text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{search ? "No matching projects" : "No projects in the system yet"}</p>
        </CardContent>
      </Card>
    ) : (
      <div className={gridClass}>
        {filteredAll.map((p) => {
          const ownerEmail = p.ownerEmail || ownerInfoMap[p.id]?.email || "";
          const ownerName = p.ownerName || ownerInfoMap[p.id]?.name || "Owner";
          const isMine = p.ownerId === user.uid;
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/collab/project/${p.id}`)}>
              <CardContent className={cn(viewMode === "compact" ? "py-3 px-4" : "py-4 px-5")}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{p.name}</p>
                  {isMine && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                </div>
                {p.description && viewMode !== "compact" && (
                  <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {ownerEmail || <em className="opacity-70">unknown</em>}
                  </span>
                  {viewMode !== "compact" && <span>Owner: {ownerName}</span>}
                  <span>{p.memberIds?.length ?? 1} member{(p.memberIds?.length ?? 1) === 1 ? "" : "s"}</span>
                  {p.updatedAt?.toDate && viewMode !== "compact" && <span>Updated {p.updatedAt.toDate().toLocaleDateString()}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )
  );

  const renderDeletedProjects = () => (
    filteredDeleted.length === 0 ? (
      <Card className="mt-6">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Trash className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{search ? "No matching deleted projects" : "No deleted projects yet"}</p>
          {!search && <p className="text-sm">When a project is deleted, it will appear here.</p>}
        </CardContent>
      </Card>
    ) : (
      <div className={gridClass}>
        {filteredDeleted.map((d) => (
          <Card key={d.id}>
            <CardContent className={cn(viewMode === "compact" ? "py-3 px-4" : "py-4 px-5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Trash className="h-4 w-4 text-destructive" />
                    <p className="font-semibold truncate">{d.name || "(untitled)"}</p>
                  </div>
                  {d.description && viewMode !== "compact" && (
                    <p className="text-sm text-muted-foreground mt-0.5">{d.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5" />
                      Owner: {d.ownerName || "Unknown"}
                      {d.ownerEmail ? ` (${d.ownerEmail})` : ""}
                    </span>
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                      Deleted by {d.deletedByName || d.deletedByEmail || "Unknown"}
                      {d.deletedByEmail && d.deletedByName ? ` (${d.deletedByEmail})` : ""}
                    </span>
                    {d.deletedAt?.toDate && (
                      <span>on {d.deletedAt.toDate().toLocaleString()}</span>
                    )}
                    <span>{d.memberCount} member{d.memberCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={!d.snapshot}
                  title={d.snapshot ? "Restore this project" : "No snapshot available (legacy deletion)"}
                  onClick={() => handleRestore(d)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Projects</h1>
          <p className="text-sm text-muted-foreground">Real-time collaborative projects you own or were invited to.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Project</Button>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="mine" className="mt-4">
          <TabsList>
            <TabsTrigger value="mine">My Shared Projects</TabsTrigger>
            <TabsTrigger value="all">
              <Shield className="h-3.5 w-3.5 mr-1" /> All Users' Projects
            </TabsTrigger>
            <TabsTrigger value="deleted">
              <Trash className="h-3.5 w-3.5 mr-1" /> Deleted Projects
              {deletedProjects.length > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({deletedProjects.length})</span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine">{renderMyProjects()}</TabsContent>
          <TabsContent value="all">{renderAllProjects()}</TabsContent>
          <TabsContent value="deleted">{renderDeletedProjects()}</TabsContent>
        </Tabs>
      ) : (
        renderMyProjects()
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collab Project</DialogTitle>
            <DialogDescription>This project will sync in real-time across all members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input placeholder="Description (optional)" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button
              disabled={!editName.trim()}
              onClick={async () => {
                if (!editProject) return;
                try {
                  await updateDoc(doc(db, "collabProjects", editProject.id), {
                    name: editName.trim(),
                    description: editDesc.trim(),
                    updatedAt: serverTimestamp(),
                  });
                  setEditProject(null);
                } catch (e) {
                  toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
                }
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
