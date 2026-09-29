# Skeleton Component Reference

Quick reference for commonly used Skeleton components. For full API details, always fetch the live docs at `https://www.skeleton.dev/docs/components/{name}/svelte`.

## Table of Contents
- [AppBar](#appbar)
- [Navigation](#navigation)
- [Dialog](#dialog)
- [Tabs](#tabs)
- [Tables](#tables-css-only)
- [Accordion](#accordion)
- [Toast](#toast)

---

## AppBar

**Import:** `import { AppBar } from '@skeletonlabs/skeleton-svelte'`
**Docs:** https://www.skeleton.dev/docs/components/app-bar/svelte

Compound components: `AppBar`, `AppBar.Toolbar`, `AppBar.Lead`, `AppBar.Headline`, `AppBar.Trail`

```svelte
<AppBar>
  <AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
    <AppBar.Lead><button>Menu</button></AppBar.Lead>
    <AppBar.Headline>Title</AppBar.Headline>
    <AppBar.Trail><button>Action</button></AppBar.Trail>
  </AppBar.Toolbar>
</AppBar>
```

Use Tailwind `grid-cols-*` on `AppBar.Toolbar` to control column layout. Responsive: `md:grid-cols-[auto_auto]`.

---

## Navigation

**Import:** `import { Navigation } from '@skeletonlabs/skeleton-svelte'`
**Docs:** https://www.skeleton.dev/docs/svelte/framework-components/navigation

Three layouts via `layout` prop:
- `"bar"` — mobile bottom bar (3-5 items)
- `"rail"` — tablet side rail (3-7 items)
- `"sidebar"` — desktop full sidebar with groups

Compound components: `Navigation`, `Navigation.Header`, `Navigation.Content`, `Navigation.Group`, `Navigation.Label`, `Navigation.Menu`, `Navigation.Trigger`, `Navigation.TriggerAnchor`, `Navigation.TriggerText`, `Navigation.Footer`

```svelte
<Navigation layout="sidebar">
  <Navigation.Content>
    <Navigation.Group>
      <Navigation.Label>Section</Navigation.Label>
      <Navigation.Menu>
        <Navigation.Trigger href="/page">Page</Navigation.Trigger>
      </Navigation.Menu>
    </Navigation.Group>
  </Navigation.Content>
</Navigation>
```

---

## Dialog

**Import:** `import { Dialog } from '@skeletonlabs/skeleton-svelte'`
**Docs:** https://www.skeleton.dev/docs/components/dialog/svelte

Headless by default — no styles applied, full customization freedom.

Compound components: `Dialog`, `Dialog.Trigger`, `Dialog.Backdrop`, `Dialog.Positioner`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.CloseTrigger`

Key props on root:
| Prop | Default | Description |
|------|---------|-------------|
| `trapFocus` | `true` | Keep focus inside dialog |
| `preventScroll` | `true` | Block background scroll |
| `closeOnInteractOutside` | `true` | Close on backdrop click |
| `closeOnEscape` | `true` | Close on Escape key |
| `role` | `"dialog"` | `"dialog"` or `"alertdialog"` |

```svelte
<Dialog>
  <Dialog.Trigger>
    <button class="preset-filled-primary-500">Open</button>
  </Dialog.Trigger>
  <Portal>
    <Dialog.Backdrop class="bg-black/50 fixed inset-0" />
    <Dialog.Positioner class="fixed inset-0 flex items-center justify-center">
      <Dialog.Content class="card preset-outlined-surface-200 p-6 w-96">
        <Dialog.Title>Confirm</Dialog.Title>
        <Dialog.Description>Are you sure?</Dialog.Description>
        <Dialog.CloseTrigger>
          <button class="preset-filled-primary-500">Close</button>
        </Dialog.CloseTrigger>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog>
```

Variant — **Drawer**: Use `flex justify-start` on Positioner + full-height styling on Content.

---

## Tabs

**Import:** `import { Tabs } from '@skeletonlabs/skeleton-svelte'`
**Docs:** https://www.skeleton.dev/docs/components/tabs/svelte

Compound components: `Tabs`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Indicator`, `Tabs.Content`

Key props:
| Prop | Values | Description |
|------|--------|-------------|
| `defaultValue` | string | Initial active tab |
| `value` | string | Controlled active tab |
| `orientation` | `"horizontal"` / `"vertical"` | Tab orientation |
| `activationMode` | `"automatic"` / `"manual"` | Focus vs click activation |
| `onValueChange` | callback | Fires when tab changes |

```svelte
<Tabs defaultValue="one">
  <Tabs.List>
    <Tabs.Trigger value="one">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="two">Tab 2</Tabs.Trigger>
    <Tabs.Indicator />
  </Tabs.List>
  <Tabs.Content value="one">Content 1</Tabs.Content>
  <Tabs.Content value="two">Content 2</Tabs.Content>
</Tabs>
```

Fluid-width tabs: add `class="flex-1"` to each `Tabs.Trigger`.

---

## Tables (CSS-only)

**Docs:** https://www.skeleton.dev/docs/svelte/tailwind-components/tables

No import needed — just use CSS classes on native HTML tables.

```svelte
<div class="table-wrap">
  <table class="table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody class="[&>tr]:hover:preset-tonal-primary">
      <tr>
        <td>Alice</td>
        <td>alice@example.com</td>
      </tr>
    </tbody>
  </table>
</div>
```

- Wrap in `.table-wrap` for overflow handling
- Add `.table` to `<table>`
- Row hover: `[&>tr]:hover:preset-tonal-primary` on `<tbody>`
- Interactive rows: put `<a>` or `<button>` in cells (native tables don't support row-level interaction)

---

## Accordion

**Import:** `import { Accordion } from '@skeletonlabs/skeleton-svelte'`
**Docs:** https://www.skeleton.dev/docs/components/accordion/svelte

Compound components: `Accordion`, `Accordion.Item`, `Accordion.Trigger`, `Accordion.Content`

```svelte
<Accordion>
  <Accordion.Item value="one">
    <Accordion.Trigger>Section 1</Accordion.Trigger>
    <Accordion.Content>Content 1</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="two">
    <Accordion.Trigger>Section 2</Accordion.Trigger>
    <Accordion.Content>Content 2</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

---

## Toast

**Import:** `import { Toast, createToaster } from '@skeletonlabs/skeleton-svelte'`
**Docs:** https://www.skeleton.dev/docs/components/toast/svelte

Toast requires a toaster instance, typically created once at the layout level.

```svelte
<!-- +layout.svelte -->
<script>
  import { Toast, createToaster } from '@skeletonlabs/skeleton-svelte';
  const toaster = createToaster();
</script>

<Toast {toaster} />

<!-- In any component -->
<script>
  function notify() {
    toaster.create({ title: 'Saved', description: 'Changes saved.' });
  }
</script>
```
