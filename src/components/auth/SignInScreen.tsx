import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { loginRequest, isMsalConfigured } from "@/lib/msal";
import { Loader2 } from "lucide-react";

export default function SignInScreen() {
  const { instance } = useMsal();
  const [busy, setBusy] = useState(false);
  const configured = isMsalConfigured();

  const handleSignIn = async () => {
    if (!configured) {
      toast({
        title: "Microsoft sign-in not configured",
        description: "Set VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID in your .env file.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />

      <Card className="w-full max-w-md shadow-xl border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md relative z-10 rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7b1113] via-[#9e1619] to-[#7b1113]" />

        <CardHeader className="text-center pb-2 pt-10 px-8">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center mb-6 border border-slate-100 dark:border-zinc-700 p-3 shadow-sm">
            <img
              src="/favicon.png"
              alt="Logo"
              className="h-full w-full object-contain select-none"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
            Welcome to PPMS
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-zinc-400 mt-2 text-base">
            Sign in with your Microsoft account to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-10 pt-6 px-8">
          <Button
            variant="outline"
            className="w-full h-[52px] text-base font-medium gap-3 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 shadow-sm hover:shadow transition-all rounded-xl"
            disabled={busy}
            onClick={handleSignIn}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z" />
                <path fill="#00a4ef" d="M1 11h9v9H1z" />
                <path fill="#7fba00" d="M11 1h9v9h-9z" />
                <path fill="#ffb900" d="M11 11h9v9h-9z" />
              </svg>
            )}
            Sign in with Microsoft
          </Button>
          {!configured && (
            <p className="text-xs text-center text-muted-foreground">
              Microsoft sign-in is not configured yet. See <code>server/README.md</code> for setup.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}