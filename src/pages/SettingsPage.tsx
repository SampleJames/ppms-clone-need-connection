import { useState, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSettings, DEFAULT_APP_SETTINGS, DEFAULT_PRINT_SETTINGS, PrintSettings } from "@/types";
import { getAppSettings, saveAppSettings } from "@/lib/storage";
import { exportConfigToFile, restoreConfigFromFile } from "@/lib/configBackup";
import { toast } from "@/hooks/use-toast";
import { NumberField } from "@/components/ui/number-field";
import { Plus, X, Star, Download, Upload } from "lucide-react";
import PrintSettingsEditor from "@/components/PrintSettingsEditor";
import ConfigImportLoader from "@/components/ConfigImportLoader";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [newUnit, setNewUnit] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<"working" | "done" | null>(null);
  const [importingName, setImportingName] = useState<string | undefined>(undefined);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = getAppSettings();
    setSettings({ ...DEFAULT_APP_SETTINGS, ...loaded });
  }, []);

  const handleSave = () => {
    saveAppSettings(settings);
    window.dispatchEvent(new Event('settingsChanged'));
    toast({ title: "Settings saved" });
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_APP_SETTINGS });
    saveAppSettings(DEFAULT_APP_SETTINGS);
    window.dispatchEvent(new Event('settingsChanged'));
    toast({ title: "Settings reset to defaults" });
  };

  const units = settings.units || [];
  const favs = settings.favoriteUnits || [];

  const addUnitLocal = () => {
    const t = newUnit.trim();
    if (!t) return;
    if (units.some((u) => u.toLowerCase() === t.toLowerCase())) {
      toast({ title: "Unit already exists", variant: "destructive" });
      return;
    }
    const updated = { ...settings, units: [...units, t] };
    setSettings(updated);
    saveAppSettings(updated);
    window.dispatchEvent(new Event('settingsChanged'));
    setNewUnit("");
  };

  const removeUnitLocal = (u: string) => {
    const updated = {
      ...settings,
      units: units.filter((x) => x !== u),
      favoriteUnits: favs.filter((x) => x !== u),
    };
    setSettings(updated);
    saveAppSettings(updated);
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const toggleFavLocal = (u: string) => {
    const isFav = favs.includes(u);
    const updated = {
      ...settings,
      favoriteUnits: isFav ? favs.filter((x) => x !== u) : [...favs, u],
    };
    setSettings(updated);
    saveAppSettings(updated);
    window.dispatchEvent(new Event('settingsChanged'));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Default Mark-up Rates</CardTitle>
          <CardDescription>
            Defaults applied to new projects. ABC items use OCM + Profit + VAT directly. DUPA Indirect Cost % defaults to OCM + Profit, and DUPA VAT % defaults to the same VAT %. Override per project or per item.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>OCM (Overhead, Contingency, Miscellaneous) %</Label>
            <NumberField
              value={settings.defaultOcmPercent}
              onValueChange={(n) => setSettings({ ...settings, defaultOcmPercent: n })}
            />
          </div>
          <div className="space-y-2">
            <Label>Profit / Mark-up %</Label>
            <NumberField
              value={settings.defaultProfitPercent}
              onValueChange={(n) => setSettings({ ...settings, defaultProfitPercent: n })}
            />
          </div>
          <div className="space-y-2">
            <Label>VAT %</Label>
            <NumberField
              value={settings.defaultVatPercent}
              onValueChange={(n) => setSettings({ ...settings, defaultVatPercent: n })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UI Layout</CardTitle>
          <CardDescription>
            Choose the navigation layout for the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Layout Mode</Label>
            <Select
              value={settings.layoutMode || 'topnav'}
              onValueChange={(v) => setSettings({ ...settings, layoutMode: v as 'topnav' | 'sidebar' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topnav">Top Navigation Bar</SelectItem>
                <SelectItem value="sidebar">Collapsible Sidebar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Units of Measurement</CardTitle>
          <CardDescription>
            Manage the list of units shown in the Unit dropdowns across the app (ABC table, DUPA items, templates, price list). Adding a unit anywhere also saves it here. Click the star to mark a unit as favorite — favorites appear at the top of every unit dropdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., m², bag, lot"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUnitLocal(); } }}
            />
            <Button type="button" onClick={addUnitLocal} disabled={!newUnit.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units defined. Add one above.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...units].sort((a, b) => {
                const af = favs.includes(a) ? 0 : 1;
                const bf = favs.includes(b) ? 0 : 1;
                return af - bf;
              }).map((u) => {
                const isFav = favs.includes(u);
                return (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 pl-1 pr-1 py-1 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFavLocal(u)}
                      className="rounded-full hover:bg-background/60 p-1"
                      title={isFav ? "Unfavorite" : "Mark as favorite"}
                    >
                      <Star className={isFav ? "h-3 w-3 fill-amber-400 text-amber-400" : "h-3 w-3 text-muted-foreground/60"} />
                    </button>
                    <span className="px-1">{u}</span>
                    <button
                      type="button"
                      onClick={() => removeUnitLocal(u)}
                      className="ml-1 rounded-full hover:bg-destructive/15 p-0.5"
                      title={`Remove "${u}"`}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Back up or restore your entire workspace — all projects, settings,
            units, pricelist, templates, S-curve versions, playgrounds, and
            print layouts. Use this to move between devices or roll back changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                try {
                  exportConfigToFile();
                  toast({ title: "Configuration exported", description: "Backup file downloaded." });
                } catch (e) {
                  toast({ title: "Export failed", description: String(e), variant: "destructive" });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export Configuration
            </Button>
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Import Configuration
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) setPendingFile(f);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Importing replaces your current workspace. Export first if you want a safety copy.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingFile} onOpenChange={(o) => !o && setPendingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your entire workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will erase all current projects, settings, templates, pricelist
              entries, S-curve versions, and playgrounds, then restore everything
              from <span className="font-medium">{pendingFile?.name}</span>. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const f = pendingFile;
                setPendingFile(null);
                if (!f) return;
                setImportingName(f.name);
                setImportState("working");
                const startedAt = Date.now();
                try {
                  const result = await restoreConfigFromFile(f, { wipeExisting: true });
                  const minMs = 1600;
                  const wait = Math.max(0, minMs - (Date.now() - startedAt));
                  await new Promise((r) => setTimeout(r, wait));
                  const restoredSettings = getAppSettings();
                  setSettings({ ...DEFAULT_APP_SETTINGS, ...restoredSettings });
                  setImportState("done");
                  toast({
                    title: "Configuration imported",
                    description: `Restored ${result.restoredKeys} item${result.restoredKeys === 1 ? "" : "s"}.`,
                  });
                  window.setTimeout(() => {
                    window.dispatchEvent(new Event("settingsChanged"));
                    setImportState(null);
                    setImportingName(undefined);
                  }, 1700);
                } catch (e: any) {
                  setImportState(null);
                  toast({ title: "Import failed", description: e?.message ?? String(e), variant: "destructive" });
                }
              }}
            >
              Replace and Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfigImportLoader state={importState} fileName={importingName} />

      <div className="flex gap-2">
        <Button onClick={handleSave}>Save Settings</Button>
        <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
      </div>
    </div>
  );
}
