import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { ActivityDoc, subscribeActivity } from "@/lib/collabStorage";

interface Props { pid: string; }

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ActivityDrawer({ pid }: Props) {
  const [items, setItems] = useState<(ActivityDoc & { id: string })[]>([]);
  useEffect(() => subscribeActivity(pid, setItems), [pid]);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-1" /> Activity
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Activity</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 overflow-auto max-h-[80vh] pr-1">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
          {items.map((a) => (
            <div key={a.id} className="text-sm border-l-2 border-primary/30 pl-3">
              <p>
                <span className="font-medium">{a.displayName}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>
                {a.target ? <span className="text-foreground"> {a.target}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {a.at?.toMillis ? timeAgo(a.at.toMillis()) : "just now"}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
