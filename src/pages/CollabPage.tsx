import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SignInScreen from "@/components/auth/SignInScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, FolderOpen, Trash2, Crown, Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  CollabProjectDoc, createCollabProject, deleteCollabProject, subscribeMyProjects,
} from "@/lib/collabStorage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

export default function CollabPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<CollabProjectDoc[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editProject, setEditProject] = useState<CollabProjectDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (!user) return;
    return subscribeMyProjects(user.uid, setProjects);
  }, [user]);

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Projects</h1>
          <p className="text-sm text-muted-foreground">Real-time collaborative projects you own or were invited to.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Project</Button>
      </div>

      {projects.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm">Create one or accept an invite link to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 mt-4">
          {projects.map((p) => {
            const isOwner = p.ownerId === user.uid;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/collab/project/${p.id}`)}>
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground truncate">{p.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.memberIds?.length ?? 1} member{(p.memberIds?.length ?? 1) === 1 ? "" : "s"}
                      {p.lastEditedByName ? ` · last edit by ${p.lastEditedByName}` : ""}
                      {p.updatedAt?.toDate ? ` · ${p.updatedAt.toDate().toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isOwner && (
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
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
    </div>
  );
}
