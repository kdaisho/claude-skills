---
name: skeleton-ui
description: >
  Guide for building UIs with Skeleton (the Svelte/SvelteKit UI toolkit powered by Tailwind CSS).
  Use this skill whenever the user wants to build, style, or modify UI components in a SvelteKit project
  that uses Skeleton — or when they mention Skeleton components like AppBar, Navigation, Dialog, Tabs,
  Tables, or Accordion. Also trigger when the user asks about Skeleton themes, the Skeleton design system,
  or wants to add Skeleton to an existing SvelteKit + Tailwind CSS project. Even if the user just says
  "add a sidebar" or "create a modal" in a project that already has Skeleton installed, this skill applies.
---

# Skeleton UI for SvelteKit

Skeleton is an adaptive design system built on Tailwind CSS. It provides themed, pre-built components for Svelte (and React) via two packages: `@skeletonlabs/skeleton` (core styles, themes, Tailwind presets) and `@skeletonlabs/skeleton-svelte` (interactive framework components).

**Always check the live docs** when you need precise prop signatures or encounter unexpected behavior — the API evolves across releases:
- Introduction: https://skeleton.dev/docs/svelte/get-started/introduction
- Component index: https://skeleton.dev/docs/svelte/get-started/introduction (scroll to component lists)
- Theme guide: https://www.skeleton.dev/docs/design/themes
- Core API: https://www.skeleton.dev/docs/get-started/core-api

## Requirements

| Dependency | Minimum version |
|------------|----------------|
| SvelteKit  | 2              |
| Svelte     | 5              |
| Tailwind CSS | 4            |

## Installation (SvelteKit)

```bash
# Install both packages
pnpm add -D @skeletonlabs/skeleton @skeletonlabs/skeleton-svelte
```

In your global stylesheet (e.g. `src/app.css` or `src/routes/layout.css`), add these imports **in order**:

```css
@import 'tailwindcss';
@import '@skeletonlabs/skeleton';
@import '@skeletonlabs/skeleton-svelte';
@import '@skeletonlabs/skeleton/themes/cerberus'; /* or any preset theme */
```

Set the active theme on the root HTML element in `src/app.html`:

```html
<html lang="en" data-theme="cerberus">
```

## Theme System

Skeleton themes are CSS files containing CSS custom properties that override Tailwind's `@theme` directive values. This makes theme-switching as simple as changing `data-theme` on `<html>`.

### Preset themes (21 available)
catppuccin, cerberus, concord, crimson, fennec, hamlindigo, legacy, mint, modern, mona, nosh, nouveau, pine, reign, rocket, rose, sahara, seafoam, terminus, vintage, vox, wintry

### Multiple themes
Register several themes by importing them all, then switch dynamically:

```css
@import '@skeletonlabs/skeleton/themes/cerberus';
@import '@skeletonlabs/skeleton/themes/rose';
```

```ts
document.documentElement.dataset.theme = 'rose'; // switch at runtime
```

### Custom themes
Use the **Theme Generator** at https://themes.skeleton.dev to create a custom theme, export the CSS, save it in your project, and import it alongside or instead of presets.

### Dark / Light mode
Themes define both light and dark values via CSS custom properties (e.g. `--body-background-color` / `--body-background-color-dark`). Tailwind's `@variant dark` directives handle the switching. You can target a specific theme with `theme-[themeName]:` utility variant.

## Core Styling API

Skeleton extends Tailwind with design tokens for colors, typography, spacing, and radius:

- **Colors**: `text-primary-500`, `bg-surface-200`, etc. — maps to `--color-[name]-[shade]`
- **Color pairings** (light/dark balance): dual-shade notation like `--color-primary-500-400`
- **Typography**: scaled via `calc({remSize} * var(--text-scaling))`
- **Spacing**: dynamic via `--spacing` variable
- **Radius**: `--radius-base`, `--radius-container`
- **Presets**: pre-styled patterns for buttons, badges, cards — e.g. `class="preset-tonal-primary"`

## Component Architecture

Skeleton has two categories of components:

### 1. Tailwind Components (CSS-only, no JS)
Styled with utility classes on native HTML elements. No imports needed.
- **Badges**, **Buttons**, **Cards**, **Chips**, **Dividers**, **Forms/Inputs**, **Placeholders**, **Tables**

### 2. Framework Components (from `@skeletonlabs/skeleton-svelte`)
Interactive, JS-powered components using a **compound component** pattern. Import from `@skeletonlabs/skeleton-svelte`.
- Accordion, AppBar, Avatar, Carousel, Collapsible, Combobox, Date Picker, Dialog, File Upload, Floating Panel, Listbox, Menu, Navigation, Pagination, Popover, Portal, Progress (Circular/Linear), Rating Group, Segmented Control, Slider, Steps, Switch, Tabs, Tags Input, Toast, Toggle Group, Tooltip, Tree View

All framework components accept an `element` prop/snippet to customize the rendered element (e.g. swap a button for an anchor).

For detailed props and examples of each component, read `references/components.md`.

## Common Layout Patterns

### App Shell (header + sidebar + main)

```svelte
<script>
  import { AppBar, Navigation } from '@skeletonlabs/skeleton-svelte';
</script>

<!-- Top bar -->
<AppBar>
  <AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
    <AppBar.Lead>
      <button>Menu</button>
    </AppBar.Lead>
    <AppBar.Headline>My App</AppBar.Headline>
    <AppBar.Trail>
      <button>Settings</button>
    </AppBar.Trail>
  </AppBar.Toolbar>
</AppBar>

<!-- Body with sidebar -->
<div class="flex h-[calc(100vh-64px)]">
  <Navigation layout="sidebar">
    <Navigation.Content>
      <Navigation.Group>
        <Navigation.Label>Section</Navigation.Label>
        <Navigation.Menu>
          <Navigation.Trigger href="/dashboard">Dashboard</Navigation.Trigger>
          <Navigation.Trigger href="/settings">Settings</Navigation.Trigger>
        </Navigation.Menu>
      </Navigation.Group>
    </Navigation.Content>
  </Navigation>
  <main class="flex-1 overflow-y-auto p-4">
    <slot />
  </main>
</div>
```

### Responsive Navigation
The Navigation component supports three layouts — switch based on screen size:
- `layout="bar"` — mobile (bottom bar, 3-5 items)
- `layout="rail"` — tablet (left rail, 3-7 items)
- `layout="sidebar"` — desktop (full sidebar with groups and labels)

### Card Grid

```svelte
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {#each items as item}
    <div class="card preset-outlined-surface-200 p-4">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </div>
  {/each}
</div>
```

## Guidelines for Building UIs

1. **Check the docs first.** Before writing a component, fetch the relevant docs page to confirm the current API. URLs follow the pattern: `https://www.skeleton.dev/docs/components/{component-name}/svelte` for framework components, or `https://www.skeleton.dev/docs/svelte/tailwind-components/{name}` for CSS-only components.

2. **Prefer Skeleton's components over hand-rolling.** If Skeleton has a Dialog, use it rather than building a custom modal — it handles focus trapping, scroll lock, escape-to-close, and accessibility out of the box.

3. **Use preset classes** for consistent styling: `preset-tonal-primary`, `preset-outlined-surface-200`, etc. These adapt to the active theme automatically.

4. **Compound component pattern.** Framework components use dot-notation sub-components (e.g. `Tabs.List`, `Tabs.Trigger`, `Tabs.Content`). Always structure them correctly — the parent manages state, children render the pieces.

5. **Tailwind-first.** For spacing, layout, typography, and responsive design, use Tailwind utilities directly. Skeleton enhances Tailwind; it doesn't replace it.

6. **Theme-aware colors.** Use Skeleton's semantic color tokens (`primary`, `secondary`, `surface`, `success`, `warning`, `error`) instead of hard-coded Tailwind colors. This ensures your UI adapts when themes change.
