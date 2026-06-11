import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SignInScreen from "@/components/auth/SignInScreen";
import { acceptInvite } from "@/lib/collabStorage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pid, tok] = (token || "").split(":");

  useEffect(() => {
    if (!user || !pid || !tok) return;
    setBusy(true);
    acceptInvite(pid, tok)
      .then(() => {
        toast({ title: "Joined project!" });
        navigate(`/collab/project/${pid}`);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
  }, [user, pid, tok, navigate]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div>
        <div className="text-center pt-8 text-sm text-muted-foreground">
          Sign in to accept this invite.
        </div>
        <SignInScreen />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{busy ? "Joining project…" : error ? "Invite problem" : "All set!"}</CardTitle>
          <CardDescription>
            {error || (busy ? "Adding you to the project." : "You've been added to the project.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => navigate("/collab")}>Go to Collab</Button>
          {pid && <Button variant="outline" onClick={() => navigate(`/collab/project/${pid}`)}>Open project</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
