// import { useEffect, useRef, useCallback, useState, useMemo } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import {
//   ArrowLeft, Save, History, Download, Upload, FileSpreadsheet, FileText,
//   Minimize2, Maximize2, Printer, FolderInput, FolderOutput, UserPlus, Eye,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Checkbox } from "@/components/ui/checkbox";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Project, ProjectVersion } from "@/types";
// import { syncDupaToABC } from "@/lib/calculations";
// import { exportProjectToExcel, importExcelToProject } from "@/lib/excel";
// import { exportCategoriesToExcel, importCategoriesFromExcel } from "@/lib/categoryExcel";
// import { exportABCToPDF, exportDUPAToPDF } from "@/lib/pdf";
// import { toast } from "@/hooks/use-toast";
// import ABCTable from "@/components/ABCTable";
// import DUPAList from "@/components/DUPAList";
// import SCurve from "@/components/SCurve";
// import PriceList from "@/components/PriceList";
// import Playground from "@/components/Playground";
// import Templates from "@/components/Templates";
// import {
//   CollabMemberDoc, CollabProjectDoc, docToProject, flushPending,
//   getLastSentAt, logActivity, queueProjectWrite, subscribeMembers,
//   subscribeProject,
// } from "@/lib/collabStorage";
// import { useAuth } from "@/contexts/AuthContext";
// import { clearPresence, setPresence } from "@/lib/collabStorage";
// import MembersPopover from "@/components/collab/MembersPopover";
// import InviteDialog from "@/components/collab/InviteDialog";
// import ActivityDrawer from "@/components/collab/ActivityDrawer";
// import PresenceAvatars from "@/components/collab/PresenceAvatars";

// export default function CollabProjectView() {
//   const { id } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const [doc, setDoc] = useState<CollabProjectDoc | null>(null);
//   const [project, setProject] = useState<Project | null>(null);
//   const [members, setMembers] = useState<(CollabMemberDoc & { uid: string })[]>([]);
//   const [versionDialogOpen, setVersionDialogOpen] = useState(false);
//   const [versionName, setVersionName] = useState("");
//   const [historyOpen, setHistoryOpen] = useState(false);
//   const [compactView, setCompactView] = useState(false);
//   const [proMode, setProMode] = useState(false);
//   const [inviteOpen, setInviteOpen] = useState(false);
//   const [exportCatOpen, setExportCatOpen] = useState(false);
//   const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
//   const [tab, setTab] = useState("abc");
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const categoryImportRef = useRef<HTMLInputElement>(null);
//   const lastSnapshotAt = useRef(0);

  
//   useEffect(() => {
//     if (!id) return;
//     return subscribeProject(id, (d) => {
//       if (!d) {
//         toast({ title: "Project not found", variant: "destructive" });
//         navigate("/collab");
//         return;
//       }
//       setDoc(d);
//       const incomingMs = d.updatedAt?.toMillis?.() ?? 0;
      
//       if (incomingMs >= getLastSentAt(id)) {
//         lastSnapshotAt.current = incomingMs;
//         setProject(docToProject(d));
//       }
//     });
//   }, [id, navigate]);

//   useEffect(() => {
//     if (!id) return;
//     return subscribeMembers(id, setMembers);
//   }, [id]);

  
//   useEffect(() => {
//     if (!id || !user) return;
//     setPresence(id, tab);
//     const t = window.setInterval(() => setPresence(id, tab), 15_000);
//     const beforeUnload = () => clearPresence(id);
//     window.addEventListener("beforeunload", beforeUnload);
//     return () => {
//       window.clearInterval(t);
//       window.removeEventListener("beforeunload", beforeUnload);
//       clearPresence(id);
//       flushPending(id);
//     };
//   }, [id, user, tab]);

//   const myRole = useMemo(() => {
//     if (!user) return null;
//     const m = members.find((x) => x.uid === user.uid);
//     return m?.role ?? null;
//   }, [members, user]);
//   const canEdit = myRole === "owner" || myRole === "editor";

//   const save = useCallback(
//     (updated: Project) => {
//       if (!id || !canEdit) {
//         if (!canEdit) toast({ title: "Read-only mode", description: "You don't have edit permission." });
//         return;
//       }
//       setProject(updated);
//       queueProjectWrite(id, updated);
//     },
//     [id, canEdit]
//   );

//   const categoryOptions = useMemo(() => {
//     if (!project) return [] as { id: string; label: string; depth: number }[];
//     const byParent = new Map<string | null, typeof project.abcItems>();
//     for (const it of project.abcItems) {
//       const k = it.parentId ?? null;
//       const arr = byParent.get(k) ?? [];
//       arr.push(it);
//       byParent.set(k, arr);
//     }
//     for (const arr of byParent.values()) arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
//     const out: { id: string; label: string; depth: number }[] = [];
//     const walk = (parentId: string | null, depth: number) => {
//       for (const it of byParent.get(parentId) ?? []) {
//         if (it.isCategory) {
//           out.push({ id: it.id, label: `${it.itemNo}  ${it.description}`, depth });
//           walk(it.id, depth + 1);
//         }
//       }
//     };
//     walk(null, 0);
//     return out;
//   }, [project]);

//   if (!project || !doc || !id) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

//   const handleSync = () => {
//     const synced = syncDupaToABC(project.abcItems, project.dupaItems);
//     save({ ...project, abcItems: synced });
//     logActivity(id, "synced ABC with DUPA");
//   };

//   const handleSaveVersion = () => {
//     if (!versionName.trim()) return;
//     const version: ProjectVersion = {
//       id: crypto.randomUUID(),
//       name: versionName.trim(),
//       createdAt: new Date().toISOString(),
//       abcItems: JSON.parse(JSON.stringify(project.abcItems)),
//       dupaItems: JSON.parse(JSON.stringify(project.dupaItems)),
//       settings: { ...project.settings },
//     };
//     save({ ...project, versions: [...project.versions, version] });
//     logActivity(id, "saved version", versionName.trim());
//     setVersionName("");
//     setVersionDialogOpen(false);
//   };

//   const handleRestoreVersion = (v: ProjectVersion) => {
//     save({
//       ...project,
//       abcItems: JSON.parse(JSON.stringify(v.abcItems)),
//       dupaItems: JSON.parse(JSON.stringify(v.dupaItems)),
//       settings: { ...v.settings },
//     });
//     setHistoryOpen(false);
//     logActivity(id, "restored version", v.name);
//   };

//   const handleExcelExport = () => exportProjectToExcel(project);
//   const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     try {
//       const { abcItems, dupaItems } = await importExcelToProject(file);
//       save({ ...project, abcItems, dupaItems });
//       logActivity(id, "imported Excel", file.name);
//     } catch {
//       toast({ title: "Import failed", variant: "destructive" });
//     }
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   return (
//     <div className="p-6 max-w-[1400px] mx-auto">
//       <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
//       <input
//         type="file"
//         ref={categoryImportRef}
//         accept=".xlsx"
//         className="hidden"
//         onChange={async (e) => {
//           const f = e.target.files?.[0];
//           if (!f) return;
//           try {
//             const { project: merged } = await importCategoriesFromExcel(f, project);
//             save(merged);
//             logActivity(id, "imported categories", f.name);
//           } catch (err) {
//             toast({ title: "Import failed", description: String((err as Error).message), variant: "destructive" });
//           }
//           if (categoryImportRef.current) categoryImportRef.current.value = "";
//         }}
//       />

//       <div className="flex items-center gap-3 mb-2">
//         <Button variant="ghost" size="icon" onClick={() => navigate("/collab")}>
//           <ArrowLeft className="h-4 w-4" />
//         </Button>
//         <div className="min-w-0 flex-1">
//           <div className="flex items-center gap-2">
//             <h1 className="text-xl font-bold truncate">{project.name}</h1>
//             {!canEdit && (
//               <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
//                 <Eye className="h-3 w-3 mr-1" /> Read-only
//               </span>
//             )}
//           </div>
//           {project.description && (
//             <p className="text-sm text-muted-foreground truncate">{project.description}</p>
//           )}
//           {doc.lastEditedByName && (
//             <p className="text-[11px] text-muted-foreground">
//               Last edited by {doc.lastEditedByName}
//               {doc.updatedAt?.toDate ? ` · ${doc.updatedAt.toDate().toLocaleString()}` : ""}
//             </p>
//           )}
//         </div>
//         <PresenceAvatars pid={id} />
//         <div className="flex gap-2 flex-wrap">
//           <MembersPopover pid={id} ownerId={doc.ownerId} />
//           {myRole === "owner" && (
//             <Button size="sm" onClick={() => setInviteOpen(true)}>
//               <UserPlus className="h-4 w-4 mr-1" /> Invite
//             </Button>
//           )}
//           <ActivityDrawer pid={id} />
//           <Button variant="outline" size="sm" onClick={() => navigate(`/print?project=${id}&collab=1`)}>
//             <Printer className="h-4 w-4 mr-1" /> Print
//           </Button>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline" size="sm">
//                 <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuItem disabled={!canEdit} onClick={() => fileInputRef.current?.click()}>
//                 <Upload className="h-4 w-4 mr-2" /> Import from Excel
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={handleExcelExport}>
//                 <Download className="h-4 w-4 mr-2" /> Export to Excel
//               </DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem
//                 disabled={categoryOptions.length === 0}
//                 onClick={() => { setSelectedCategoryIds(new Set()); setExportCatOpen(true); }}
//               >
//                 <FolderOutput className="h-4 w-4 mr-2" /> Export Categories…
//               </DropdownMenuItem>
//               <DropdownMenuItem disabled={!canEdit} onClick={() => categoryImportRef.current?.click()}>
//                 <FolderInput className="h-4 w-4 mr-2" /> Import Categories…
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline" size="sm">
//                 <FileText className="h-4 w-4 mr-1" /> PDF
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuItem onClick={() => exportABCToPDF(project)}>
//                 <FileText className="h-4 w-4 mr-2" /> Export ABC as PDF
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => exportDUPAToPDF(project)}>
//                 <FileText className="h-4 w-4 mr-2" /> Export All DUPA as PDF
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//           <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => setVersionDialogOpen(true)}>
//             <Save className="h-4 w-4 mr-1" /> Save Version
//           </Button>
//           <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} disabled={project.versions.length === 0}>
//             <History className="h-4 w-4 mr-1" /> History ({project.versions.length})
//           </Button>
//         </div>
//       </div>

//       <Tabs value={tab} onValueChange={setTab} className="w-full">
//         <div className="sticky top-0 z-20 bg-background pt-2 pb-2 border-b border-border">
//           <div className="flex items-center justify-between">
//             <TabsList>
//               <TabsTrigger value="abc">ABC</TabsTrigger>
//               <TabsTrigger value="dupa">DUPA</TabsTrigger>
//               <TabsTrigger value="scurve">S-Curve</TabsTrigger>
//               <TabsTrigger value="pricelist">Price List</TabsTrigger>
//               <TabsTrigger value="playground">Playground</TabsTrigger>
//               <TabsTrigger value="templates">Templates</TabsTrigger>
//             </TabsList>
//             <Button variant="outline" size="sm" onClick={() => setCompactView(!compactView)} className="gap-1 text-xs">
//               {compactView ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
//               {compactView ? "Full View" : "Compact"}
//             </Button>
//           </div>
//         </div>
//         <TabsContent value="abc">
//           <ABCTable project={project} onSave={save} onSync={handleSync} />
//         </TabsContent>
//         <TabsContent value="dupa">
//           <div className={compactView ? "max-w-[80%] mx-auto" : ""}>
//             <DUPAList project={project} onSave={save} compact={compactView} proMode={proMode} onProModeChange={setProMode} />
//           </div>
//         </TabsContent>
//         <TabsContent value="scurve">
//           <div className={compactView ? "max-w-[80%] mx-auto" : ""}>
//             <SCurve project={project} compact={compactView} />
//           </div>
//         </TabsContent>
//         <TabsContent value="pricelist">
//           <PriceList project={project} compact={compactView} onSave={save} />
//         </TabsContent>
//         <TabsContent value="playground">
//           <Playground compact={compactView} />
//         </TabsContent>
//         <TabsContent value="templates">
//           <Templates compact={compactView} project={project} />
//         </TabsContent>
//       </Tabs>

//       <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} pid={id} />

//       <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Save Version</DialogTitle>
//             <DialogDescription>Snapshot the current state for everyone.</DialogDescription>
//           </DialogHeader>
//           <Input placeholder="Version name" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>Cancel</Button>
//             <Button onClick={handleSaveVersion} disabled={!versionName.trim()}>Save</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Version History</DialogTitle>
//             <DialogDescription>Restore a previous version.</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-2 max-h-64 overflow-auto">
//             {project.versions.map((v) => (
//               <div key={v.id} className="flex items-center justify-between p-3 rounded-md border">
//                 <div>
//                   <p className="font-medium text-sm">{v.name}</p>
//                   <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
//                 </div>
//                 <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => handleRestoreVersion(v)}>Restore</Button>
//               </div>
//             ))}
//           </div>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={exportCatOpen} onOpenChange={setExportCatOpen}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Export Categories</DialogTitle>
//             <DialogDescription>Pick categories to export.</DialogDescription>
//           </DialogHeader>
//           <ScrollArea className="h-72 border rounded-md p-2">
//             <div className="space-y-1">
//               {categoryOptions.map((c) => (
//                 <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer" style={{ paddingLeft: `${0.5 + c.depth * 1.25}rem` }}>
//                   <Checkbox
//                     checked={selectedCategoryIds.has(c.id)}
//                     onCheckedChange={() => {
//                       setSelectedCategoryIds((prev) => {
//                         const n = new Set(prev);
//                         if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
//                         return n;
//                       });
//                     }}
//                   />
//                   <span className="text-sm truncate">{c.label}</span>
//                 </label>
//               ))}
//             </div>
//           </ScrollArea>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setExportCatOpen(false)}>Cancel</Button>
//             <Button
//               disabled={selectedCategoryIds.size === 0}
//               onClick={async () => {
//                 try {
//                   await exportCategoriesToExcel(project, Array.from(selectedCategoryIds));
//                   setExportCatOpen(false);
//                 } catch (err) {
//                   toast({ title: "Export failed", description: String((err as Error).message), variant: "destructive" });
//                 }
//               }}
//             >
//               <Download className="h-4 w-4 mr-1" /> Export
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }


import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Save, History, Download, Upload, FileSpreadsheet, FileText,
  Minimize2, Maximize2, Printer, FolderInput, FolderOutput, UserPlus, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Project, ProjectVersion } from "@/types";
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
import {
  CollabMemberDoc, CollabProjectDoc, docToProject, flushPending,
  getLastSentAt, logActivity, queueProjectWrite, subscribeMembers,
  subscribeProject, isAdminEmail, deleteCollabProject,
} from "@/lib/collabStorage";
import { useAuth } from "@/contexts/AuthContext";
import { clearPresence, setPresence } from "@/lib/collabStorage";
import MembersPopover from "@/components/collab/MembersPopover";
import InviteDialog from "@/components/collab/InviteDialog";
import ActivityDrawer from "@/components/collab/ActivityDrawer";
import PresenceAvatars from "@/components/collab/PresenceAvatars";
import JoinRequestsButton from "@/components/collab/JoinRequestsButton";
import SignInScreen from "@/components/auth/SignInScreen";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Shield, Trash2 } from "lucide-react";

export default function CollabProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<CollabProjectDoc | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<(CollabMemberDoc & { uid: string })[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [proMode, setProMode] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [exportCatOpen, setExportCatOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("abc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryImportRef = useRef<HTMLInputElement>(null);
  const lastSnapshotAt = useRef(0);

  // Subscribe to Project changes (Works even if unauthenticated if Firestore rules allow it)
  useEffect(() => {
    if (!id) return;
    return subscribeProject(id, (d) => {
      if (!d) {
        toast({ title: "Project not found", variant: "destructive" });
        navigate(user ? "/collab" : "/");
        return;
      }
      setDoc(d);
      const incomingMs = d.updatedAt?.toMillis?.() ?? 0;
      
      if (incomingMs >= getLastSentAt(id)) {
        lastSnapshotAt.current = incomingMs;
        setProject(docToProject(d));
      }
    });
  }, [id, navigate, user]);

  // Subscribe to Members list
  useEffect(() => {
    if (!id) return;
    return subscribeMembers(id, (list) => {
      setMembers(list);
      setMembersLoaded(true);
    });
  }, [id]);

  const isAdmin = isAdminEmail(user?.email);

  // Sync real-time workspace activity presence indicator only if logged in AND a real member
  // (admins auto-viewing other people's projects should not show up as a member circle)
  useEffect(() => {
    if (!id || !user) return;
    const isMember = members.some((m) => m.uid === user.uid);
    if (!isMember) return;
    setPresence(id, tab);
    const t = window.setInterval(() => setPresence(id, tab), 15_000);
    const beforeUnload = () => clearPresence(id);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("beforeunload", beforeUnload);
      clearPresence(id);
      flushPending(id);
    };
  }, [id, user, tab, members]);

  // Evaluate dynamic structural permission roles securely
  const myRole = useMemo(() => {
    if (!user) return null;
    const m = members.find((x) => x.uid === user.uid);
    return m?.role ?? null;
  }, [members, user]);

  // Admin gets full edit/delete access on any project
  const canEdit = myRole === "owner" || myRole === "editor" || isAdmin;
  const canDelete = myRole === "owner" || isAdmin;

  const save = useCallback(
    (updated: Project) => {
      if (!id || !canEdit) {
        if (!canEdit) toast({ title: "Read-only mode", description: "You don't have edit permission." });
        return;
      }
      setProject(updated);
      queueProjectWrite(id, updated);
    },
    [id, canEdit]
  );

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

  if (!id) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  // Require sign-in to view shared projects
  if (!user) {
    return (
      <div>
        <div className="text-center pt-8 text-sm text-muted-foreground">
          Sign in to view this shared project.
        </div>
        <SignInScreen />
      </div>
    );
  }

  // Wait for both project and members to load before deciding access
  if (!project || !doc || !membersLoaded) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  // Block non-members - link sharing should not grant access (admins bypass)
  if (!myRole && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="items-center text-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <CardTitle className="mt-2">No access to this project</CardTitle>
            <CardDescription>
              You are not a member of this shared project. Ask the project owner
              to send you an invite link, then request to join.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/collab")}>Go to My Projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const handleSync = () => {
    if (!canEdit) return;
    const synced = syncDupaToABC(project.abcItems, project.dupaItems);
    save({ ...project, abcItems: synced });
    logActivity(id, "synced ABC with DUPA");
  };

  const handleSaveVersion = () => {
    if (!canEdit || !versionName.trim()) return;
    const version: ProjectVersion = {
      id: crypto.randomUUID(),
      name: versionName.trim(),
      createdAt: new Date().toISOString(),
      abcItems: JSON.parse(JSON.stringify(project.abcItems)),
      dupaItems: JSON.parse(JSON.stringify(project.dupaItems)),
      settings: { ...project.settings },
      savedByEmail: user?.email || "",
      savedByName: user?.displayName || user?.email || "Someone",
    };
    save({ ...project, versions: [...project.versions, version] });
    logActivity(id, "saved version", versionName.trim());
    setVersionName("");
    setVersionDialogOpen(false);
  };

  const handleRestoreVersion = (v: ProjectVersion) => {
    if (!canEdit) return;
    save({
      ...project,
      abcItems: JSON.parse(JSON.stringify(v.abcItems)),
      dupaItems: JSON.parse(JSON.stringify(v.dupaItems)),
      settings: { ...v.settings },
    });
    setHistoryOpen(false);
    logActivity(id, "restored version", v.name);
  };

  const handleExcelExport = () => exportProjectToExcel(project);
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { abcItems, dupaItems } = await importExcelToProject(file);
      save({ ...project, abcItems, dupaItems });
      logActivity(id, "imported Excel", file.name);
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
      <input
        type="file"
        ref={categoryImportRef}
        accept=".xlsx"
        className="hidden"
        onChange={async (e) => {
          if (!canEdit) return;
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const { project: merged } = await importCategoriesFromExcel(f, project);
            save(merged);
            logActivity(id, "imported categories", f.name);
          } catch (err) {
            toast({ title: "Import failed", description: String((err as Error).message), variant: "destructive" });
          }
          if (categoryImportRef.current) categoryImportRef.current.value = "";
        }}
      />

      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(user ? "/collab" : "/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{project.name}</h1>
            {!canEdit && (
              <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                <Eye className="h-3 w-3 mr-1" /> Read-only
              </span>
            )}
            {isAdmin && !myRole && (
              <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                <Shield className="h-3 w-3 mr-1" /> Admin access
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground truncate">{project.description}</p>
          )}
          {doc.lastEditedByName && (
            <p className="text-[11px] text-muted-foreground">
              Last edited by {doc.lastEditedByName}
              {doc.updatedAt?.toDate ? ` · ${doc.updatedAt.toDate().toLocaleString()}` : ""}
            </p>
          )}
        </div>
        <PresenceAvatars pid={id} />
        <div className="flex gap-2 flex-wrap">
          <MembersPopover pid={id} ownerId={doc.ownerId} />
          {(myRole === "owner" || isAdmin) && (
            <>
              <JoinRequestsButton pid={id} />
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Invite
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => {
                if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                  deleteCollabProject(id)
                    .then(() => {
                      toast({ title: "Project deleted" });
                      navigate("/collab");
                    })
                    .catch((e) =>
                      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" })
                    );
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <ActivityDrawer pid={id} />
          <Button variant="outline" size="sm" onClick={() => navigate(`/print?project=${id}&collab=1`)}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled={!canEdit} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Import from Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExcelExport}>
                <Download className="h-4 w-4 mr-2" /> Export to Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={categoryOptions.length === 0}
                onClick={() => { setSelectedCategoryIds(new Set()); setExportCatOpen(true); }}
              >
                <FolderOutput className="h-4 w-4 mr-2" /> Export Categories…
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canEdit} onClick={() => categoryImportRef.current?.click()}>
                <FolderInput className="h-4 w-4 mr-2" /> Import Categories…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportABCToPDF(project)}>
                <FileText className="h-4 w-4 mr-2" /> Export ABC as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportDUPAToPDF(project)}>
                <FileText className="h-4 w-4 mr-2" /> Export All DUPA as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => setVersionDialogOpen(true)}>
            <Save className="h-4 w-4 mr-1" /> Save Version
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} disabled={project.versions.length === 0}>
            <History className="h-4 w-4 mr-1" /> History ({project.versions.length})
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
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
            <Button variant="outline" size="sm" onClick={() => setCompactView(!compactView)} className="gap-1 text-xs">
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
          <PriceList project={project} compact={compactView} onSave={save} pid={id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="playground">
          <Playground compact={compactView} />
        </TabsContent>
        <TabsContent value="templates">
          <Templates compact={compactView} project={project} />
        </TabsContent>
      </Tabs>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} pid={id} />

      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
            <DialogDescription>Snapshot the current state for everyone.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Version name" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVersion} disabled={!versionName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>Restore a previous version.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto">
            {[...project.versions]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-md border">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                  {v.savedByEmail && (
                    <p className="text-xs text-muted-foreground truncate">Saved by {v.savedByEmail}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => handleRestoreVersion(v)}>Restore</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportCatOpen} onOpenChange={setExportCatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Categories</DialogTitle>
            <DialogDescription>Pick categories to export.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72 border rounded-md p-2">
            <div className="space-y-1">
              {categoryOptions.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer" style={{ paddingLeft: `${0.5 + c.depth * 1.25}rem` }}>
                  <Checkbox
                    checked={selectedCategoryIds.has(c.id)}
                    onCheckedChange={() => {
                      setSelectedCategoryIds((prev) => {
                        const n = new Set(prev);
                        if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
                        return n;
                      });
                    }}
                  />
                  <span className="text-sm truncate">{c.label}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportCatOpen(false)}>Cancel</Button>
            <Button
              disabled={selectedCategoryIds.size === 0}
              onClick={async () => {
                try {
                  await exportCategoriesToExcel(project, Array.from(selectedCategoryIds));
                  setExportCatOpen(false);
                } catch (err) {
                  toast({ title: "Export failed", description: String((err as Error).message), variant: "destructive" });
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}