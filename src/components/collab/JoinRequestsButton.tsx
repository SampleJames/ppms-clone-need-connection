import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, Check, X } from "lucide-react";
import {
  JoinRequestDoc,
  approveJoinRequest,
  rejectJoinRequest,
  subscribeJoinRequests,
} from "@/lib/collabStorage";
import { toast } from "@/hooks/use-toast";

interface Props {
  pid: string;
}

export default function JoinRequestsButton({ pid }: Props) {
  const [requests, setRequests] = useState<(JoinRequestDoc & { id: string })[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribeJoinRequests(pid, setRequests), [pid]);

  const count = requests.length;

  const approve = async (uid: string, name: string) => {
    setBusy(uid);
    try {
      await approveJoinRequest(pid, uid);
      toast({ title: "Approved", description: `${name} now has access.` });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (uid: string, name: string) => {
    if (!confirm(`Reject join request from ${name}?`)) return;
    setBusy(uid);
    try {
      await rejectJoinRequest(pid, uid);
      toast({ title: "Rejected" });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <UserCheck className="h-4 w-4 mr-1" /> Requests
          {count > 0 && (
            <Badge
              variant="destructive"
              className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] rounded-full"
            >
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="font-semibold text-sm">Pending join requests</p>
          <p className="text-xs text-muted-foreground">
            Approve people who used your invite link.
          </p>
        </div>
        <div className="max-h-80 overflow-auto divide-y">
          {requests.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No pending requests.
            </div>
          ) : (
            requests.map((r) => {
              const initials = (r.displayName || r.email || "?")
                .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={r.id} className="flex items-center gap-2 p-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.photoURL || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.displayName || r.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.email} · wants {r.requestedRole}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600 hover:text-green-700"
                    disabled={busy === r.uid}
                    onClick={() => approve(r.uid, r.displayName || r.email)}
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={busy === r.uid}
                    onClick={() => reject(r.uid, r.displayName || r.email)}
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
