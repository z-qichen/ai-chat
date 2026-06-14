---
name: shadcn-ui
description: Use when working with shadcn/ui components, including adding, customizing, theming, or building UI with shadcn. Triggered by keywords: shadcn, shadcn/ui, shadcn-ui, button component, dialog component, card component, form component, data table, login form, dashboard UI, registry, components.json. Also use when user asks to install/add UI components or build UI pages/sections using shadcn.
---

# shadcn/ui Skill

This skill provides deep knowledge of shadcn/ui components, patterns, CLI commands, theming, and registries.

## How to Use This Skill

1. Read `components.json` first to understand project configuration (framework, aliases, installed components)
2. Before generating component code, use `shadcn docs <component>` or `shadcn search <keyword>` to find components
3. Always follow shadcn composition patterns
4. Use `shadcn add <component>` to install components (never manually copy component code)

## CLI Commands

### `shadcn init`
Initialize shadcn in a project. Creates `components.json` and installs dependencies.

### `shadcn add <component...>`
Add components from a registry to the project. Examples:
- `pnpm dlx shadcn@latest add button` — single component
- `pnpm dlx shadcn@latest add button dialog card` — multiple components
- `pnpm dlx shadcn@latest add login-form` — a block/template
- `pnpm dlx shadcn@latest add @acme/hero` — from a namespaced registry

Flags:
- `--overwrite` — overwrite existing components
- `--dry-run` — preview without writing files
- `--yes` — skip confirmation prompts

### `shadcn search <keyword>`
Search for components across configured registries.
- `pnpm dlx shadcn@latest search form`
- `pnpm dlx shadcn@latest search login`

### `shadcn docs <component>`
Open the documentation for a component in the browser.
- `pnpm dlx shadcn@latest docs button`

### `shadcn info`
Show project configuration:
- `pnpm dlx shadcn@latest info`
- `pnpm dlx shadcn@latest info --json` — JSON output for scripts/AI

### `shadcn diff <component>`
Show changes between local component and latest registry version.

### `shadcn view <component>`
View a component's source code without installing it.

## Project Configuration (components.json)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide",
  "registries": {}
}
```

Key fields:
- `style`: `"default"` or `"new-york"` — controls component design
- `aliases.ui`: where components are installed (e.g., `@/components/ui`)
- `aliases.utils`: path to `cn()` utility function
- `iconLibrary`: `"lucide"` or alternative icon set
- `tailwind.baseColor`: CSS variable base color

## Theming

### CSS Variables (Tailwind v3)
shadcn uses CSS custom properties for theming. Key variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark variants */
}
```

### Adding Custom Colors
Add custom color entries to globals.css, then use in components:
```css
:root {
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
}
```

### OKLCH Colors (Tailwind v4)
With Tailwind v4, use OKLCH color format:
```css
--primary: oklch(0.205 0 0);
```

## Component Patterns

### Forms
Use `react-hook-form` + `zod` for form validation:
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
```

Use `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` from shadcn form components.

### Data Tables
Use `@tanstack/react-table` for data tables:
```tsx
import { useReactTable, getCoreRowModel, ColumnDef } from "@tanstack/react-table"
```

### Layout
Common layout patterns:
- Sidebar layout: `<SidebarProvider>` + `<AppSidebar>` + `<SidebarInset>`
- Dashboard: sidebar + header + main content with cards and data table
- Page sections: use `<Separator>` between sections

## Important Composition Rules

1. **Use `cn()` for className merging** - import from `@/lib/utils`
2. **Don't manually copy component source** - always use `shadcn add`
3. **Use `FieldGroup` for form layouts**, not manual spacing
4. **Use `ToggleGroup` for option sets**, not multiple Toggle buttons
5. **Use semantic color variables** (`text-primary`, `bg-secondary`) instead of hardcoded colors
6. **Components are yours to customize** - they live in your `components/ui/` directory
7. **Import from `@/components/ui/<name>`** not from `shadcn/ui` package

## Available Components (shadcn/ui registry)

Core: Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, ButtonGroup, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Combobox, Command, ContextMenu, DataTable, DatePicker, Dialog, Drawer, DropdownMenu, Empty, Field, Form, HoverCard, Input, InputGroup, InputOTP, Item, Kbd, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Spinner, Switch, Table, Tabs, Textarea, Toast, Toggle, ToggleGroup, Tooltip, Typography

## Before Generating Code

1. Run `pnpm dlx shadcn@latest info --json` to determine framework, aliases, and installed components
2. For any component you plan to use, run `pnpm dlx shadcn@latest add <component> --dry-run` to preview
3. If the component is not installed, tell the user to install it: `pnpm dlx shadcn@latest add <component>`
4. Only generate code using components that are installed or about to be installed
5. Always import from the correct alias path (from `components.json` aliases)
