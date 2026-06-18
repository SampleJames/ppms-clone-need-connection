import { ReactNode, useEffect, useMemo, useState } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import SignInScreen from "@/components/auth/SignInScreen";
import { usersApi, type AppUser } from "@/lib/api";
import { Loader2 } from "lucide-react";

type Ctx = { user: AppUser | null; setUser: (u: AppUser | null) => void };
import { createContext, useContext } from "react";
const AppUserCtx = createContext<Ctx>({ user: null, setUser: () => {} });

export function useAppUser() {
  return useContext(AppUserCtx);
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, inProgress, instance } = useMsal();
  const [user, setUser] = useState<AppUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const account = useMemo(
    () => instance.getActiveAccount() ?? accounts[0] ?? instance.getAllAccounts()[0],
    [accounts, instance],
  );
  const hasSignedInAccount = isAuthenticated || Boolean(account);

  useEffect(() => {
    if (!hasSignedInAccount || !account) {
      setUser(null);
      return;
    }
    instance.setActiveAccount(account);
    const email =
      (account.username as string | undefined) ||
      ((account.idTokenClaims as Record<string, unknown> | undefined)?.email as string | undefined) ||
      "";
    const name = account.name || email;
    const azureOid =
      ((account.idTokenClaims as Record<string, unknown> | undefined)?.oid as string | undefined) ||
      account.localAccountId ||
      account.homeAccountId;

    setSyncing(true);
    usersApi
      .upsert({ email, name, azureOid })
      .then((u) => setUser(u))
      .catch((err) => {
        console.error("[auth] user upsert failed", err);
        // Fall back to a local-only user record so the app stays usable
        // if the backend is offline. Role defaults to 'user'.
        setUser({
          id: azureOid,
          email,
          name,
          role: email.toLowerCase() === "mjfernandez@tsu.edu.ph" ? "admin" : "user",
          azureOid,
          isActive: true,
        });
      })
      .finally(() => setSyncing(false));
  }, [account, hasSignedInAccount, instance]);

  if (inProgress !== InteractionStatus.None && !hasSignedInAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasSignedInAccount) {
    return <SignInScreen />;
  }

  if (syncing && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Signing you in…
      </div>
    );
  }

  return <AppUserCtx.Provider value={{ user, setUser }}>{children}</AppUserCtx.Provider>;
}