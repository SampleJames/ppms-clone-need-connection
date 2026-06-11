import { useEffect, useState } from "react";
import { PresenceDoc, subscribePresence } from "@/lib/collabStorage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function PresenceAvatars({ pid }: { pid: string }) {
  const [presence, setPresence] = useState<PresenceDoc[]>([]);
  useEffect(() => subscribePresence(pid, setPresence), [pid]);
  const live = presence.filter((p) => Date.now() - (p.lastSeen?.toMillis?.() ?? 0) < 45_000);
  if (live.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {live.slice(0, 5).map((p) => {
        const initials = (p.displayName || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
        return (
          <Tooltip key={p.uid}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background" style={{ outline: `2px solid ${p.color}` }}>
                <AvatarImage src={p.photoURL || undefined} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {p.displayName}{p.currentTab ? ` · ${p.currentTab}` : ""}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {live.length > 5 && (
        <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
          +{live.length - 5}
        </div>
      )}
    </div>
  );
}
