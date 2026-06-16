import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { ChatMessageDoc, sendChatMessage, subscribeChat } from "@/lib/collabStorage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props { pid: string; }

function timeLabel(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ChatDrawer({ pid }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<(ChatMessageDoc & { id: string })[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<number>(Date.now());
  const [unread, setUnread] = useState(0);

  useEffect(() => subscribeChat(pid, setMessages), [pid]);

  // Track unread when drawer closed
  useEffect(() => {
    if (open) {
      setUnread(0);
      lastSeenRef.current = Date.now();
      return;
    }
    const count = messages.filter(
      (m) => m.uid !== user?.uid && (m.at?.toMillis?.() ?? 0) > lastSeenRef.current
    ).length;
    setUnread(count);
  }, [messages, open, user]);

  // Auto-scroll to bottom on new messages while open
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await sendChatMessage(pid, t);
      setText("");
    } catch (e) {
      toast({ title: "Send failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <MessageCircle className="h-4 w-4 mr-1" /> Chat
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-md">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Project Chat
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              No messages yet. Say hi to your team!
            </p>
          )}
          {messages.map((m, i) => {
            const mine = m.uid === user?.uid;
            const prev = messages[i - 1];
            const showHeader = !prev || prev.uid !== m.uid ||
              ((m.at?.toMillis?.() ?? 0) - (prev.at?.toMillis?.() ?? 0)) > 5 * 60_000;
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                <div className="w-8 shrink-0">
                  {showHeader && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.photoURL} />
                      <AvatarFallback className="text-[10px]">
                        {(m.displayName || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className={cn("flex flex-col max-w-[75%]", mine ? "items-end" : "items-start")}>
                  {showHeader && (
                    <div className={cn("flex items-center gap-2 mb-0.5 text-[11px] text-muted-foreground", mine && "flex-row-reverse")}>
                      <span className="font-medium text-foreground">{mine ? "You" : m.displayName}</span>
                      <span>{m.at?.toMillis ? timeLabel(m.at.toMillis()) : "…"}</span>
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}>
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t p-3 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            disabled={!user || sending}
          />
          <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
