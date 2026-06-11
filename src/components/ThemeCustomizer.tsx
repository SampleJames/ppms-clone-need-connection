import { useState, useEffect } from "react";
import { Paintbrush, Check, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const themes = [
  { name: "Default Blue", value: "theme-blue", color: "bg-blue-600" },
  { name: "TSU Maroon", value: "theme-maroon", color: "bg-red-800" },
  { name: "Emerald Green", value: "theme-green", color: "bg-emerald-600" },
  { name: "Violet Royal", value: "theme-violet", color: "bg-violet-600" },
  { name: "Zinc Charcoal", value: "theme-zinc", color: "bg-zinc-700" },
  { name: "Amber Orange", value: "theme-amber", color: "bg-amber-500" },
];

export default function ThemeCustomizer() {
  // State for Color Accent
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "theme-maroon";
  });

  // State for Dark/Light Mode
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("app-color-mode") as "light" | "dark" | "system") || "light";
  });

  // Effect to apply Color Accent
  useEffect(() => {
    const root = document.documentElement;
    themes.forEach((t) => root.classList.remove(t.value));
    root.classList.add(activeTheme);
    localStorage.setItem("app-theme", activeTheme);
  }, [activeTheme]);

  // Effect to apply Dark/Light Mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (themeMode === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeMode);
    }
    localStorage.setItem("app-color-mode", themeMode);
  }, [themeMode]);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shadow-sm">
          <Paintbrush className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">Appearance</span>
        </Button>
      </DrawerTrigger>

      <DrawerContent className="max-w-md mx-auto">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left pt-6">
            <DrawerTitle className="text-xl font-bold tracking-tight">
              Workspace Appearance
            </DrawerTitle>
            <DrawerDescription>
              Customize your theme and color preferences.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-6">
            
            {/* Dark / Light Mode Toggle Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground tracking-tight">Mode</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={themeMode === "light" ? "default" : "outline"}
                  onClick={() => setThemeMode("light")}
                  className={`gap-2 ${themeMode === "light" ? "shadow-sm" : "bg-card hover:bg-accent"}`}
                >
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button
                  variant={themeMode === "dark" ? "default" : "outline"}
                  onClick={() => setThemeMode("dark")}
                  className={`gap-2 ${themeMode === "dark" ? "shadow-sm" : "bg-card hover:bg-accent"}`}
                >
                  <Moon className="h-4 w-4" /> Dark
                </Button>
                <Button
                  variant={themeMode === "system" ? "default" : "outline"}
                  onClick={() => setThemeMode("system")}
                  className={`gap-2 ${themeMode === "system" ? "shadow-sm" : "bg-card hover:bg-accent"}`}
                >
                  <Monitor className="h-4 w-4" /> System
                </Button>
              </div>
            </div>

            {/* Accent Color Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground tracking-tight">Accent Color</h4>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => {
                  const isSelected = activeTheme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      onClick={() => setActiveTheme(theme.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
                        isSelected
                          ? "border-primary bg-primary/5 font-semibold ring-1 ring-primary/30"
                          : "border-border/60 bg-card hover:bg-accent"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-full shrink-0 shadow-sm ${theme.color} flex items-center justify-center`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm truncate">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <DrawerFooter className="pb-6 pt-2">
            <DrawerClose asChild>
              <Button className="w-full">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}