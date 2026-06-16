import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CollabMemberDoc,
  PresenceDoc,
  Role,
  changeRole,
  removeMember,
  subscribeMembers,
  subscribePresence,
  transferOwnership,
  leaveProject,
  isAdminEmail,
} from "@/lib/collabStorage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  pid: string;
  ownerId: string;
}

export default function MembersPopover({ pid, ownerId }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<(CollabMemberDoc & { uid: string })[]>([]);
  const [presence, setPresence] = useState<PresenceDoc[]>([]);

  useEffect(() => subscribeMembers(pid, setMembers), [pid]);
  useEffect(() => subscribePresence(pid, setPresence), [pid]);

  const isOwner = user?.uid === ownerId;
  const isAdmin = isAdminEmail(user?.email);
  const canManage = isOwner || isAdmin;
  const onlineUids = new Set(
    presence
      .filter((p) => {
        const ms = p.lastSeen?.toMillis?.() ?? 0;
        return Date.now() - ms < 45_000;
      })
      .map((p) => p.uid)
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-1" /> Members ({members.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="font-semibold text-sm">Project members</p>
          <p className="text-xs text-muted-foreground">
            {onlineUids.size} online · {members.length} total
          </p>
        </div>
        <div className="max-h-80 overflow-auto divide-y">
          {members.map((m) => {
            const initials = (m.displayName || m.email || "?")
              .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            const isMe = user?.uid === m.uid;
            const memberIsOwner = m.uid === ownerId;
            return (
              <div key={m.uid} className="flex items-center gap-2 p-2.5">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.photoURL || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  {onlineUids.has(m.uid) && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">
                      {m.displayName || m.email}{isMe && " (you)"}
                    </p>
                    {memberIsOwner && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                {canManage && !memberIsOwner ? (
                  <>
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        changeRole(pid, m.uid, v as Role).catch((e) =>
                          toast({ title: "Failed", description: (e as Error).message, variant: "destructive" })
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-[88px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm(`Remove ${m.displayName || m.email}?`)) {
                          removeMember(pid, m.uid).catch((e) =>
                            toast({ title: "Failed", description: (e as Error).message, variant: "destructive" })
                          );
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t flex gap-2">
          {isOwner ? (
            <p className="text-[11px] text-muted-foreground px-1">
              You are the owner. Use the role dropdown to change permissions or transfer via menu.
            </p>
          ) : isAdmin ? (
            <p className="text-[11px] text-muted-foreground px-1">
              Admin access: you can manage members and transfer ownership.
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                if (confirm("Leave this collab project?")) {
                  leaveProject(pid).then(() => (window.location.href = "/collab"));
                }
              }}
            >
              Leave Project
            </Button>
          )}
        </div>
        {canManage && members.length > 1 && (
          <div className="p-2 border-t">
            <Select
              onValueChange={(uid) => {
                if (confirm("Transfer ownership? You will become an editor.")) {
                  transferOwnership(pid, uid).catch((e) =>
                    toast({ title: "Failed", description: (e as Error).message, variant: "destructive" })
                  );
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Transfer ownership to…" />
              </SelectTrigger>
              <SelectContent>
                {members.filter((m) => m.uid !== ownerId).map((m) => (
                  <SelectItem key={m.uid} value={m.uid}>{m.displayName || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
