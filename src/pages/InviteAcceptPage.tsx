import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SignInScreen from "@/components/auth/SignInScreen";
import { acceptInvite } from "@/lib/collabStorage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Status = "idle" | "submitting" | "pending" | "already_member" | "error";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [pid, tok] = (token || "").split(":");

  useEffect(() => {
    if (!user || !pid || !tok || status !== "idle") return;
    setStatus("submitting");
    acceptInvite(pid, tok)
      .then((result) => {
        if (result === "already_member") {
          setStatus("already_member");
          toast({ title: "You're already a member" });
          setTimeout(() => navigate(`/collab/project/${pid}`), 800);
        } else {
          setStatus("pending");
          toast({ title: "Join request sent", description: "Waiting for the project owner to approve." });
        }
      })
      .catch((e) => {
        setError((e as Error).message);
        setStatus("error");
      });
  }, [user, pid, tok, navigate, status]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div>
        <div className="text-center pt-8 text-sm text-muted-foreground">
          Sign in to request access to this project.
        </div>
        <SignInScreen />
      </div>
    );
  }

  const renderIcon = () => {
    if (status === "pending") return <Clock className="h-10 w-10 text-amber-500" />;
    if (status === "already_member") return <CheckCircle2 className="h-10 w-10 text-green-500" />;
    if (status === "error") return <AlertCircle className="h-10 w-10 text-destructive" />;
    return null;
  };

  const title =
    status === "submitting" ? "Submitting your request…" :
    status === "pending" ? "Request sent" :
    status === "already_member" ? "You're already a member" :
    status === "error" ? "Invite problem" :
    "Processing…";

  const description =
    status === "submitting" ? "Hang tight." :
    status === "pending" ? "Your join request has been sent to the project owner. You'll get access once they approve it." :
    status === "already_member" ? "Redirecting you to the project." :
    status === "error" ? (error || "Something went wrong.") :
    "";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="items-center text-center">
          {renderIcon()}
          <CardTitle className="mt-2">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button onClick={() => navigate("/collab")}>Go to Projects</Button>
        </CardContent>
      </Card>
    </div>
  );
}
