import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppUser } from "@/components/auth/AuthGate";

export default function UserMenu() {
  const { instance, accounts } = useMsal();
  const { user } = useAppUser();
  const account = accounts[0];
  if (!account) return null;

  const displayName = user?.name || account.name || account.username || "User";
  const email = user?.email || account.username || "";
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await instance.logoutPopup({ postLogoutRedirectUri: window.location.origin });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{email}</span>
            {user?.role === "admin" && (
              <Badge variant="default" className="w-fit gap-1 mt-1">
                <ShieldCheck className="h-3 w-3" /> Admin
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}