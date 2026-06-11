import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, FileSpreadsheet, Calculator, BarChart3, BookOpen,
  Grid3X3, Printer, Settings, History, Copy, Lock, RefreshCw, Download,
  Upload, Search, Filter, Save, Plus, Trash2, ChevronRight, ChevronsUpDown,
  Minimize2, Maximize2, HardHat
} from "lucide-react";

interface FeatureSection {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  details: string[];
  uiNotes?: string[];
}

const features: FeatureSection[] = [
  {
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "Dashboard — Project Management Hub",
    badge: "Core",
    description:
      "The Dashboard is the central command center of CostPro. It displays all your construction cost estimation projects as organized cards, each showing the project name, description, creation date, last update, and a quick summary of how many ABC items and DUPA sheets exist within.",
    details: [
      "**Project Cards**: Each project is shown as a card with its name in bold, description in muted text below, and metadata (dates, item counts) at the bottom. Cards have a subtle border and rounded corners for a clean, modern feel.",
      "**Create New Project**: A prominent button opens a dialog where you enter a project name and optional description. A new project is initialized with sample data (7 ABC categories with sub-items, each having 5 materials, 5 labor, and 5 equipment entries in DUPA) so you can explore immediately.",
      "**Delete Project**: Each card has a trash icon button that triggers a confirmation dialog to prevent accidental deletion. Once confirmed, the project and all its data are permanently removed from local storage.",
      "**Navigation**: Clicking a project card navigates to the full Project View where all tabs (ABC, DUPA, S-Curve, Price List, Playground) become available.",
      "**Search & Sorting**: Projects can be searched by name or description. The list updates in real-time as you type.",
    ],
    uiNotes: [
      "Cards use the `Card` component from shadcn/ui with `CardHeader` and `CardContent` for consistent spacing.",
      "The layout is a responsive grid: 1 column on mobile, 2 on medium screens, 3 on large screens.",
      "Empty state shows a friendly illustration prompting you to create your first project.",
    ],
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "ABC Table — Abstract of Bids and Costs",
    badge: "Core",
    description:
      "The ABC (Abstract of Bids and Costs) Table is the primary cost estimation worksheet. It presents a hierarchical, spreadsheet-like table where categories contain work items, each with detailed cost breakdowns including materials, labor/equipment, markup percentages (OCM, Profit), and VAT.",
    details: [
      "**Hierarchical Structure**: Items are organized into collapsible categories. Each category can contain sub-items. The collapse/expand toggle is on the leftmost cell of each category row, using a `ChevronRight`/`ChevronDown` icon. A 'Collapse All' button (`ChevronsUpDown` icon) in the first header cell toggles all categories at once.",
      "**Editable Cells**: Every data cell (description, quantity, unit, costs, percentages) is click-to-edit. Clicking a cell enters inline edit mode with an `Input` component. Press Enter to commit, Escape to cancel, or click outside to save.",
      "**Columns**: Item No. | Description | Qty | Unit | Materials Cost | Labor & Equipment Cost | Est. Direct Cost (auto-calculated) | OCM % | Profit % | Total Markup % (auto) | Markup Value (auto) | VAT % | VAT Cost (auto) | Total Indirect Cost (auto) | Total Cost (auto) | Unit Cost (auto).",
      "**Auto-Calculation**: Six columns are auto-computed and non-editable: Estimated Direct Cost = Materials + Labor/Equipment; Total Markup % = OCM% + Profit%; Markup Value = Direct Cost × Markup%; VAT Cost = (Direct + Markup) × VAT%; Total Indirect = Markup + VAT; Total Cost = (Direct + Indirect) × Qty; Unit Cost = Total / Qty. All intermediate values are rounded to 2 decimal places at each step to match Excel's computation behavior exactly.",
      "**Bulk Percent Override**: Below the OCM%, Profit%, and VAT% column headers, there's a small input field where you can type a percentage and press Enter to apply it to ALL unlocked items at once. This is extremely useful when you need to standardize markup rates across the entire project.",
      "**Field Locking**: In Pro Mode, you can double-click any OCM%, Profit%, or VAT% cell to toggle its lock status (amber lock icon). Locked fields are immune to bulk overrides, preserving custom rates for specific items.",
      "**Category Totals**: Each category row displays the sum of all its children's Total Cost values, calculated recursively to support nested categories.",
      "**Grand Total**: The last row shows the sum of all top-level category totals, giving you the overall project bid amount.",
      "**Add Category**: Creates a new top-level category with auto-numbered Item No.",
      "**Add Item**: Opens a dialog to specify description, quantity, unit, and parent category. Item numbers are auto-generated based on the parent (e.g., category '1' → item '1.1', '1.2').",
      "**Copy Item**: Right-click or use the copy button to duplicate an item within the same project, to another project, or to a brand new project. DUPA data is copied along with it.",
      "**Delete Item**: Confirmation dialog prevents accidental deletion. Deleting a category removes all its children and their associated DUPA sheets.",
      "**Sync with DUPA**: The 'Sync from DUPA' button pulls computed totals (materials, labor, equipment) from each item's DUPA sheet back into the ABC table, then recalculates all derived values.",
      "**Pro Mode Toggle**: Switches between a beginner-friendly view (with dashed borders on editable cells) and a clean, minimal pro view (no borders, hover highlights only).",
    ],
    uiNotes: [
      "The table uses a custom `table-grid` CSS class for consistent column sizing and borders.",
      "Category rows have a distinct background (`bg-muted`) and bold text to visually separate them from data rows.",
      "Indentation increases with nesting depth using `paddingLeft` proportional to depth level.",
      "Auto-calculated (non-editable) cells are displayed in a dimmer `text-muted-foreground/70` color.",
      "Locked cells have an amber background tint and a persistent lock icon.",
    ],
  },
  {
    icon: <Calculator className="h-5 w-5" />,
    title: "DUPA — Detailed Unit Price Analysis",
    badge: "Core",
    description:
      "DUPA (Detailed Unit Price Analysis) sheets provide the granular cost breakdown for each work item in your ABC table. Each DUPA sheet decomposes a single work item into three sections: Materials, Labor, and Equipment — with a comprehensive cost summary including indirect costs and VAT.",
    details: [
      "**DUPA List**: The DUPA tab shows all DUPA sheets as expandable cards. Each card displays the item number, description, and unit price. Clicking expands it to reveal the full detail form.",
      "**Create DUPA**: From the DUPA tab, you can create a new DUPA sheet linked to any ABC item that doesn't already have one. This associates the detailed breakdown with the parent item.",
      "**A. Materials Section**: A table with columns: Description, (Price List picker button), Quantity, Unit, Unit Cost, Total (auto = Qty × Unit Cost), and Delete. Each row represents one material input.",
      "**Price List Integration**: Each material row has a book icon button that opens the Price List Picker dialog. You can search, filter by category, and select an item to auto-fill the material's description, unit, and unit cost from your price list.",
      "**Save to Price List**: If a material description doesn't exist in your price list, an amber save icon appears. Clicking it opens a dialog to save that material back to the price list with optional extra descriptions and markup pricing.",
      "**B. Labor Section**: A table with columns: Description, Man-Days, Wage Rate, Total (auto = Man-Days × Wage Rate), and Delete.",
      "**C. Equipment Utilization Section**: A table with columns: Equipment name, Period, Rate, Total (auto = Period × Rate), and Delete.",
      "**Cost Summary Panel**: A bordered panel at the bottom showing: (a) Total Materials, (b) Total Labor, (c) Total Equipment, (d) Total Direct Cost = a+b+c, (e) Indirect Cost with editable percentage input (default from project settings), (f) Total Direct + Indirect, (g) VAT with editable percentage input, (h) Total Price = f + g. Unit Price = Total Price ÷ Quantity.",
      "**Editable Indirect Cost & VAT**: The indirect cost % and VAT % are editable inline within the summary. Changing them instantly recalculates all downstream values. Default values come from project settings but can be overridden per DUPA sheet.",
      "**Rounding**: All calculations use 2-decimal-place rounding at each intermediate step (`Math.round(value * 100) / 100`) to match Excel's computation behavior. This eliminates the tiny discrepancies (e.g., ±0.01 to ±0.05) that occur with floating-point arithmetic.",
      "**Pro Mode**: When enabled, editable cells appear without dashed borders for a cleaner look. Double-click behavior and inline editing remain the same.",
    ],
    uiNotes: [
      "Each section (Materials, Labor, Equipment) has a colored header bar with the section title, running total, and an Add button.",
      "The summary panel uses `bg-muted/30` background with clear labeled rows and a bold total at the bottom.",
      "Editable percentage inputs in the summary are small inline `Input` components (`h-6 w-16`) that blend naturally into the text flow.",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "S-Curve — Project Scheduling & Progress Visualization",
    badge: "Planning",
    description:
      "The S-Curve tab provides a visual project scheduling tool that combines a Gantt-style timeline with an S-Curve chart. It helps you plan the distribution of work over time and visualize cumulative progress as the characteristic S-shaped curve used in construction project management.",
    details: [
      "**Project Duration**: Set the total project duration in days. This defines the timeline for the Gantt chart and S-Curve visualization.",
      "**Period Count**: Choose how many periods to divide the project into (e.g., 6 periods for bi-monthly tracking on a 180-day project). Each period spans an equal number of days.",
      "**Auto Schedule**: One-click button that automatically distributes all work items evenly across the project duration with staggered start dates. Items are spread so they overlap naturally, creating a realistic S-Curve shape.",
      "**Manual Scheduling**: For each work item, set the Start Day and End Day manually to control exactly when each activity occurs in the timeline.",
      "**Weight Calculation**: Each item's weight is its Total Cost divided by the project's Grand Total, expressed as a percentage. This determines how much each item contributes to the overall progress curve.",
      "**Gantt Chart Table**: A table showing each work item with its description, weight %, total cost, start/end days, and a visual Gantt bar spanning the appropriate periods. Bars are color-coded and show partial fills for periods where work starts or ends mid-period.",
      "**S-Curve SVG Chart**: A smooth Bezier curve rendered in SVG showing cumulative progress (0–100%) over the project timeline. The chart includes gridlines, axis labels (period numbers and percentage markers), and a gradient-filled area under the curve.",
      "**Periodic & Cumulative Rows**: Below the Gantt bars, summary rows show the cost allocated to each period and the running cumulative total, both as absolute values and percentages.",
    ],
    uiNotes: [
      "The SVG chart uses a smooth cubic Bezier path for the S-Curve with a semi-transparent gradient fill beneath it.",
      "Gantt bars use `bg-primary` with `opacity` variations for partial-period fills.",
      "The entire component is contained in a `Card` with clear section headings and responsive layout.",
    ],
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Price List — Material & Rate Database",
    badge: "Reference",
    description:
      "The Price List is a comprehensive database of construction materials, labor rates, and equipment rental costs organized by year and category. It serves as a reference library that integrates directly with DUPA sheets for quick material cost lookup.",
    details: [
      "**Year-Based Organization**: Create multiple price lists for different years (e.g., 2024, 2025). Each year has its own set of categories and items. Tab navigation switches between years.",
      "**Categories**: Items are grouped into categories like Cement & Concrete, Steel & Rebar, Electrical, Plumbing, Aggregates, etc. Categories can be added, renamed, and deleted.",
      "**Default Data**: On first use, the app auto-initializes a '2025' price list with 70+ default construction items across 11 categories, giving you a realistic starting point.",
      "**Item Fields**: Description, Extra Description 1, Extra Description 2, Unit, Market Price, and Markup Price. All fields are click-to-edit inline.",
      "**Search & Filter**: A search bar filters items by description, extra descriptions, or unit in real-time. A category dropdown filters to show only items from a specific category, or 'All Categories' to see everything.",
      "**Category Filter Requirement**: The price list requires you to select a category filter (or 'All') before displaying data. This prevents lag when there are many items.",
      "**Copy Year**: Duplicate an entire year's price list to create a new version with updated prices. All categories and items are deep-copied with new IDs.",
      "**Compare Years**: A dialog that shows side-by-side price comparison between any two years. Displays price differences, percentage changes, and allows sorting by description, absolute difference, or percentage change. Includes search and category filter.",
      "**Add Item**: Opens a dialog to select a category and creates a new blank item row in that category.",
      "**Delete**: Items, categories (with all items), and entire years can be deleted with confirmation dialogs.",
      "**Integration**: DUPA material rows have a 'Pick from Price List' button that opens a searchable picker dialog, letting you import description, unit, and unit cost directly.",
    ],
    uiNotes: [
      "Category headers use `bg-primary text-primary-foreground` for strong visual grouping.",
      "The dropdown uses optimized rendering with `position='popper'` and `max-h-60` overflow for smooth scrolling even with many categories.",
      "Empty state messaging guides users to select a filter or create categories.",
      "Editable cells have dashed borders (`border-dashed border-primary/30`) to indicate interactivity.",
    ],
  },
  {
    icon: <Grid3X3 className="h-5 w-5" />,
    title: "Playground — Excel-Like Spreadsheet",
    badge: "Utility",
    description:
      "The Playground is a built-in spreadsheet tool that provides Excel-like functionality directly within CostPro. It's designed for quick calculations, what-if analysis, and data manipulation without leaving the application.",
    details: [
      "**Grid Layout**: A 26-column (A–Z) by 100-row spreadsheet grid with column and row headers. Cells are click-to-edit with a formula bar showing the active cell's contents.",
      "**Formula Support**: Enter formulas starting with `=`. Supported functions include: `SUM(range)`, `AVERAGE(range)`, `MIN(range)`, `MAX(range)`, `COUNT(range)`, `COUNTA(range)`, `IF(condition, true_val, false_val)`, `ROUND(value, decimals)`, `ABS(value)`, `POWER(base, exp)`, `SQRT(value)`.",
      "**Cell References**: Formulas support cell references like `A1`, `B5`, and range references like `A1:A10`. References update relatively when using Fill Down.",
      "**Range Selection**: Click a cell to select it. Shift+Click to select a range. The selected range is highlighted with a blue tint.",
      "**Fill Down (Ctrl+D)**: Select a range starting from a cell with a formula, press Ctrl+D, and the formula fills down with row references automatically adjusted (e.g., `=A1*B1` becomes `=A2*B2` in the next row).",
      "**Arithmetic**: Standard operators: `+`, `-`, `*`, `/`, and parentheses for grouping. Formulas can mix cell references with literal numbers.",
      "**Data Persistence**: Spreadsheet data is saved to localStorage and persists between sessions.",
      "**Clear All**: A button to reset the entire spreadsheet to blank.",
    ],
    uiNotes: [
      "The grid uses a fixed-layout table with thin borders for a spreadsheet appearance.",
      "The active cell has a blue border highlight. Selected range cells have a light blue background.",
      "The formula bar appears above the grid showing the current cell reference and its raw formula/value.",
      "Column headers (A–Z) and row numbers (1–100) are styled with `bg-muted` background.",
    ],
  },
  {
    icon: <Printer className="h-5 w-5" />,
    title: "Print / PDF Export — Customizable Report Generation",
    badge: "Export",
    description:
      "The Print page is a dedicated report preparation interface where you customize exactly what appears in your exported PDF. You can select which project to export, choose between ABC or DUPA output, and toggle individual rows and columns on or off before generating the PDF.",
    details: [
      "**Project Selection**: A dropdown at the top lets you choose which project's data to use for the export. Changing the project reloads all ABC and DUPA data.",
      "**ABC Export Customization**: Toggle visibility for each of the 16 columns (Item No, Description, Qty, Unit, Materials Cost, Labor/Equipment Cost, Est. Direct Cost, OCM%, Profit%, Total Markup%, Markup Value, VAT%, VAT Cost, Total Indirect, Total Cost, Unit Cost). Each column has an independent checkbox. You can also exclude specific rows by unchecking them in a row list.",
      "**DUPA Export Customization**: Select which DUPA pages to include in the export. Each DUPA sheet has a checkbox. You can also toggle entire sections (Materials, Labor, Equipment, Summary) and exclude individual sub-items within each section.",
      "**PDF Generation**: Uses `jsPDF` with `jspdf-autotable` for professional table formatting. The exported PDF includes proper headers, formatted currency values, and respects all your visibility toggles.",
      "**Preview Before Export**: The customization panel gives you a clear overview of what will be included, so you can verify before generating.",
    ],
    uiNotes: [
      "The page uses a two-panel layout: settings on the left, preview/summary on the right.",
      "Checkboxes use the shadcn `Checkbox` component with labels for each toggleable item.",
      "The export button is prominently placed with a `Download` icon.",
    ],
  },
  {
    icon: <History className="h-5 w-5" />,
    title: "Version History — Snapshots & Restore",
    badge: "Management",
    description:
      "The Version History feature lets you create named snapshots of your project at any point and restore them later. This provides an undo/checkpoint system for your entire project state.",
    details: [
      "**Save Version**: Click 'Save Version' in the project toolbar to create a snapshot. You're prompted to enter a version name (e.g., 'v1.0', 'Before Client Review', 'Final Draft'). The snapshot captures all ABC items, DUPA sheets, and project settings.",
      "**History Dialog**: Click 'History (N)' to open a dialog listing all saved versions in chronological order. Each entry shows the version name and timestamp.",
      "**Restore Version**: Click 'Restore' on any version to replace the current project state with that snapshot. The current state is overwritten (tip: save a version before restoring if you want to preserve it).",
      "**Deep Copy**: Snapshots are deep copies — changing the current project after saving a version does not affect the saved snapshot.",
    ],
    uiNotes: [
      "The History button in the toolbar shows the count of saved versions in parentheses.",
      "The version list in the dialog uses compact cards with name, date, and a Restore button.",
      "Disabled state when no versions exist prevents confusion.",
    ],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Excel Import & Export",
    badge: "Integration",
    description:
      "CostPro supports importing from and exporting to Excel (.xlsx) files, enabling interoperability with existing spreadsheet-based workflows common in construction cost estimation.",
    details: [
      "**Export to Excel**: Generates an .xlsx file with two sheets: 'ABC' containing all ABC table data with proper columns, and individual DUPA sheets for each work item with materials, labor, equipment, and summary sections.",
      "**Import from Excel**: Reads an .xlsx file and parses it into ABC items and DUPA sheets. The importer looks for standard column headers to map data correctly. A toast notification confirms how many items were imported.",
      "**File Handling**: Uses a hidden file input triggered by the 'Import from Excel' menu item. The input is reset after each import to allow re-importing the same file.",
    ],
    uiNotes: [
      "The Excel button in the toolbar opens a dropdown menu with Import and Export options.",
      "Import uses an `Upload` icon; Export uses a `Download` icon for intuitive recognition.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Settings — Application & Project Defaults",
    badge: "Configuration",
    description:
      "The Settings page configures global defaults that apply to new projects and provides application-wide preferences.",
    details: [
      "**Default Percentages**: Set default values for OCM%, Profit%, VAT% (used when creating new ABC items), and DUPA Indirect Cost% and DUPA VAT% (used when creating new DUPA sheets). These defaults are applied to new items but can be overridden per-item.",
      "**Layout Mode**: Switch between 'Top Navigation' (horizontal nav bar at the top) and 'Sidebar' (collapsible vertical sidebar on the left). The layout change takes effect immediately across the entire application.",
      "**Persistence**: All settings are saved to localStorage and persist across browser sessions.",
    ],
    uiNotes: [
      "Settings are organized in labeled input groups with clear descriptions.",
      "The layout mode switcher uses radio buttons or a toggle for clear selection.",
      "Changes auto-save — there's no explicit save button needed.",
    ],
  },
  {
    icon: <Copy className="h-5 w-5" />,
    title: "Copy & Cross-Project Operations",
    badge: "Productivity",
    description:
      "CostPro allows copying work items (with their full DUPA breakdown) between categories within the same project, to other existing projects, or to a brand new project.",
    details: [
      "**Copy Within Project**: Duplicate an item under the same category, a different category, or a new auto-created category. The copy gets a '(Copy)' suffix and new IDs.",
      "**Copy to Other Project**: Select any other project from a dropdown, choose an existing category in that project or create a new one. The item and its DUPA data are deep-copied.",
      "**Copy to New Project**: Creates a new project and copies the item into it. The new project inherits the source project's settings.",
      "**DUPA Preservation**: When copying an item that has an associated DUPA sheet, all materials, labor, and equipment entries are copied with new unique IDs to prevent data conflicts.",
    ],
    uiNotes: [
      "The copy dialog uses a multi-step flow: choose scope (same/other/new) → choose target → confirm.",
      "The dialog adapts its content based on the selected scope, showing relevant options.",
    ],
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Field Locking — Protect Custom Values",
    badge: "Pro Feature",
    description:
      "Field locking prevents bulk percentage overrides from changing specific cells, allowing you to maintain custom rates for individual items while still using bulk operations for the rest.",
    details: [
      "**Lockable Fields**: OCM%, Profit%, and VAT% cells in the ABC table can be locked.",
      "**Toggle Lock**: In Pro Mode, double-click a percentage cell to toggle its lock. A amber lock icon appears on locked cells and persists visually even outside hover.",
      "**Bulk Override Protection**: When you use the bulk input fields in column headers to set a percentage across all items, locked cells are skipped entirely.",
      "**Visual Feedback**: Locked cells have an amber background tint (`bg-amber-50` in light mode, `bg-amber-950/20` in dark mode) and a persistent lock icon.",
    ],
    uiNotes: [
      "Lock icons use `text-amber-500` for visibility.",
      "Hover reveals the unlock icon on unlocked cells for discoverability.",
      "The lock state is stored in the `lockedFields` array on each ABCItem.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {}
      <div className="text-center space-y-3 py-8">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <HardHat className="h-9 w-9 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">CostPro</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A comprehensive construction cost estimation and management tool built for engineers, quantity surveyors, and project managers. CostPro brings together ABC tables, DUPA sheets, scheduling, price lists, and spreadsheet tools in one integrated application.
        </p>
        <div className="flex gap-2 justify-center flex-wrap pt-2">
          <Badge variant="secondary">Local Storage</Badge>
          <Badge variant="secondary">Offline-Ready</Badge>
          <Badge variant="secondary">Excel Compatible</Badge>
          <Badge variant="secondary">PDF Export</Badge>
          <Badge variant="secondary">No Account Required</Badge>
        </div>
      </div>

      <Separator />

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Calculation Philosophy — Excel-Aligned Precision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            CostPro rounds every intermediate calculation to 2 decimal places using <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Math.round((value + Number.EPSILON) * 100) / 100</code>. This matches how Excel displays and chains cell computations, ensuring that values in CostPro match your Excel worksheets exactly — eliminating the ±0.01 to ±0.05 floating-point discrepancies that occur with raw JavaScript arithmetic.
          </p>
          <p>
            <strong>Rounding is applied at every step:</strong> individual line totals (Qty × Unit Cost), section subtotals (sum of line totals), indirect cost (Direct × %), VAT (Base × %), and final totals. This step-by-step rounding replicates Excel's cell-level precision model.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Feature Reference</h2>
        {features.map((feature, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="text-primary">{feature.icon}</span>
                {feature.title}
                {feature.badge && <Badge variant="outline" className="ml-auto text-xs">{feature.badge}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Detailed Breakdown</h4>
                <ul className="space-y-1.5">
                  {feature.details.map((detail, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary">
                      <span dangerouslySetInnerHTML={{
                        __html: detail.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                          .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
                      }} />
                    </li>
                  ))}
                </ul>
              </div>

              {feature.uiNotes && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground">UI/UX Design Notes</h4>
                  <ul className="space-y-1.5">
                    {feature.uiNotes.map((note, i) => (
                      <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['◦'] before:absolute before:left-0">
                        <span dangerouslySetInnerHTML={{
                          __html: note.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                            .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
                        }} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Architecture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>CostPro stores all data in the browser's <strong className="text-foreground">localStorage</strong>. No server, no account, no internet connection required after the initial page load.</p>
          <ul className="space-y-1 pl-4">
            <li className="before:content-['•'] before:mr-2"><strong className="text-foreground">Projects</strong>: Stored under <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">costmgr_projects</code>. Each project contains ABC items, DUPA items, settings, and version history.</li>
            <li className="before:content-['•'] before:mr-2"><strong className="text-foreground">Price List</strong>: Stored under <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">costmgr_pricelist</code>. Shared across all projects.</li>
            <li className="before:content-['•'] before:mr-2"><strong className="text-foreground">App Settings</strong>: Stored under <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">costmgr_settings</code>. Global defaults and layout preference.</li>
            <li className="before:content-['•'] before:mr-2"><strong className="text-foreground">Playground</strong>: Stored under its own key. Independent of project data.</li>
          </ul>
          <p className="text-xs italic">⚠️ Clearing browser data will delete all CostPro data. Use Excel export regularly to back up your work.</p>
        </CardContent>
      </Card>

      <div className="text-center py-8 text-xs text-muted-foreground">
        CostPro — Built with React, TypeScript, Tailwind CSS, and shadcn/ui
      </div>
    </div>
  );
}
