# Sparklight Design System

The Sparklight design system keeps the provisioning experience consistent across applications by centralizing design tokens, Tailwind primitives, and typography. This document explains how to reuse those assets in this project and in downstream tools.

## Design tokens

- **Location:** `src/styles/sparklight-theme.css`
- **Contents:** CSS custom properties (`--background`, `--primary`, etc.) for light and dark themes plus the Effra font import.
- **Usage:** Import the file wherever your global styles are assembled so the variables are available before Tailwind classes render.

```css
/* src/index.css */
@import "./styles/sparklight-theme.css";
```

The import registers all CSS variables under `:root` and `.dark`, allowing Tailwind utilities such as `bg-primary` or `text-muted-foreground` to read their values.

## Tailwind preset

A reusable Tailwind preset lives in `presets/sparklight.preset.ts`. It mirrors the `theme.extend` block we use in this app and exposes colors, typography, border radius, and keyframes.

### Using the preset from another project

1. **Copy the preset file** (or publish it as a package) and save it as `presets/sparklight.preset.ts` inside your project.
2. **Reference it in `tailwind.config.{js,ts}`**:

   ```ts
   import type { Config } from "tailwindcss"
   import sparklightPreset from "./presets/sparklight.preset"

   export default {
     presets: [sparklightPreset],
     theme: {
       extend: {
         // local overrides go here
       },
     },
   } satisfies Config
   ```

   <details>
   <summary>CommonJS example</summary>

   ```js
   module.exports = {
     presets: [require("./presets/sparklight.preset")],
   }
   ```
   </details>

3. **Include the CSS tokens** (see above) so the preset’s CSS variables resolve correctly.

## Typography alignment

- **Primary font:** Effra (weights 300/400/700). The CSS token file imports it from Google Fonts.
- **Fallbacks:** `Arial, sans-serif`.
- **Tailwind family:** Use the `font-sans` or `font-effra` utilities provided by the preset.

Add a global body style to apply the stack:

```css
body {
  font-family: "Effra", Arial, sans-serif;
}
```

## Theming conventions

- Use semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`, `border-border`) instead of hard-coded hex values.
- Respect the `--radius` scale for rounded corners (`rounded-lg`, `rounded-md`, `rounded-sm`).
- Animations `accordion-up` and `accordion-down` come from the preset and power shadcn/ui accordion components.

## Extending locally

Keep any product-specific extensions (additional colors, fonts, or animations) in your app’s `tailwind.config.ts` via `theme.extend`. Because the preset is additive, Tailwind will merge your overrides with the shared system.

## Token-aware prose helpers

For marketing copy or documentation surfaces, wrap rich text in the `.prose-brand` helper defined in `src/index.css`:

```tsx
<article className="prose-brand">
  <h1>Provisioning checklist</h1>
  <p>Use semantic tokens for every component.</p>
</article>
```

The helper is implemented with Tailwind utilities and Sparklight CSS variables, ensuring color, spacing, and typography match the current light or dark theme without reviving the old `App.css` styles.
