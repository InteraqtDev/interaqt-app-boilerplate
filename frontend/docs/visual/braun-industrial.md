# Braun Industrial Visual Style Guide

> Generated from reference image: 20251206-183305.png
> Generated at: 2025-12-06
> Design Inspiration: Braun / Dieter Rams Industrial Design

## 1. Design Philosophy

This design system draws inspiration from **Dieter Rams' legendary industrial designs for Braun**, embodying his famous "Ten Principles of Good Design." The aesthetic is characterized by **timeless minimalism**, **functional clarity**, and **understated elegance**. Every element serves a purpose, with visual noise eliminated in favor of clean, purposeful interfaces that prioritize user understanding and ease of interaction.

**Core Principles:**
- **Less, but better** (Weniger, aber besser)
- **Form follows function** with aesthetic refinement
- **Honest materials** - UI elements look like what they are
- **Unobtrusive design** that lets content speak
- **Long-lasting aesthetic** that transcends trends
- **Thoughtful details** with tactile, physical UI metaphors

## 2. Color Palette

### Primary Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Warm Cream | #F5F0E6 | rgb(245, 240, 230) | Primary background, base canvas |
| Slate Dark | #2C2C2C | rgb(44, 44, 44) | Primary text, icons |

### Secondary Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Stone Gray | #8B8680 | rgb(139, 134, 128) | Secondary text, labels |
| Soft Beige | #E8E2D8 | rgb(232, 226, 216) | Card backgrounds, surfaces |
| Warm White | #FAF8F5 | rgb(250, 248, 245) | Input backgrounds, elevated surfaces |

### Accent Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Braun Orange | #FF5C00 | rgb(255, 92, 0) | Primary CTA, active states, highlights |
| Amber Glow | #FF7A22 | rgb(255, 122, 34) | Hover states, gradients |
| Deep Orange | #E54D00 | rgb(229, 77, 0) | Pressed states, emphasis |

### Neutral Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Paper White | #FDFCFA | rgb(253, 252, 250) | Page background |
| Parchment | #F0EBE1 | rgb(240, 235, 225) | Subtle dividers |
| Aluminum | #C4BFB6 | rgb(196, 191, 182) | Borders, disabled elements |
| Charcoal | #3D3D3D | rgb(61, 61, 61) | Strong text |
| Jet Black | #1A1A1A | rgb(26, 26, 26) | Maximum contrast text |

### Semantic Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Success | #4A7C59 | rgb(74, 124, 89) | Positive actions, confirmations |
| Warning | #D4A84B | rgb(212, 168, 75) | Caution states, attention |
| Error | #C45C4F | rgb(196, 92, 79) | Error states, destructive actions |
| Info | #5B7B8C | rgb(91, 123, 140) | Informational messages |

## 3. Typography

### Font Families
- **Primary Font:** `"Neue Haas Grotesk"`, `"Helvetica Neue"`, `Helvetica`, `Arial`, sans-serif — Used for body text, UI elements
- **Display Font:** `"Suisse Int'l"`, `"Inter Tight"`, `"SF Pro Display"`, sans-serif — Used for headings, display text
- **Monospace Font:** `"IBM Plex Mono"`, `"SF Mono"`, `Consolas`, monospace — Used for code, data values

**Alternative Google Fonts:**
- `Inter` (closest to Helvetica Neue)
- `Space Grotesk` (geometric, modernist)
- `Outfit` (clean, versatile)

### Type Scale
| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Display | 48px / 3rem | 700 | 1.1 | -0.02em | Hero sections, major headings |
| H1 | 36px / 2.25rem | 600 | 1.2 | -0.015em | Page titles |
| H2 | 28px / 1.75rem | 600 | 1.25 | -0.01em | Section headings |
| H3 | 22px / 1.375rem | 600 | 1.3 | -0.005em | Subsection headings |
| H4 | 18px / 1.125rem | 600 | 1.35 | 0 | Card titles |
| Body Large | 16px / 1rem | 400 | 1.6 | 0 | Main content |
| Body | 14px / 0.875rem | 400 | 1.5 | 0 | Default text |
| Small | 12px / 0.75rem | 400 | 1.4 | 0.01em | Captions, labels |
| Tiny | 10px / 0.625rem | 500 | 1.3 | 0.02em | Fine print, badges |

### Text Colors
- **Primary Text:** #2C2C2C — Main body text
- **Secondary Text:** #8B8680 — Muted text, labels
- **Disabled Text:** #C4BFB6 — Inactive elements
- **Link Text:** #FF5C00 — Hyperlinks
- **Inverse Text:** #FAF8F5 — Text on dark backgrounds

## 4. Spacing System

### Base Unit
- **Base:** 4px

### Spacing Scale
| Token | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| space-0 | 0px | --space-0 | No spacing |
| space-1 | 4px | --space-1 | Tight inline spacing |
| space-2 | 8px | --space-2 | Small gaps, icon margins |
| space-3 | 12px | --space-3 | Input padding |
| space-4 | 16px | --space-4 | Default component padding |
| space-5 | 20px | --space-5 | Card padding |
| space-6 | 24px | --space-6 | Section spacing |
| space-8 | 32px | --space-8 | Large gaps |
| space-10 | 40px | --space-10 | Major sections |
| space-12 | 48px | --space-12 | Page margins |
| space-16 | 64px | --space-16 | Hero spacing |

### Layout Guidelines
- **Container Max Width:** 1280px
- **Content Width:** 960px
- **Sidebar Width:** 240px - 280px
- **Grid Columns:** 12
- **Grid Gap:** 24px (space-6)
- **Page Padding:** 32px - 48px

## 5. Border & Radius

### Border Widths
| Token | Value | Usage |
|-------|-------|-------|
| border-thin | 1px | Subtle dividers, input borders |
| border-default | 2px | Standard borders, cards |
| border-thick | 3px | Active states, emphasis |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| radius-none | 0px | Sharp corners (rare) |
| radius-sm | 4px | Small buttons, badges |
| radius-md | 8px | Input fields, small cards |
| radius-lg | 12px | Cards, containers |
| radius-xl | 16px | Modal dialogs, large cards |
| radius-2xl | 24px | Feature sections |
| radius-full | 9999px | Pills, avatars, circular buttons |

**Design Note:** The Braun aesthetic frequently uses **perfectly circular elements** (radius-full) for controls like toggles, knobs, and buttons. This is a defining characteristic of this design system.

### Border Colors
- **Default:** #E8E2D8
- **Muted:** #F0EBE1
- **Strong:** #C4BFB6
- **Focus:** #FF5C00

## 6. Shadows & Effects

### Box Shadows
| Token | Value | Usage |
|-------|-------|-------|
| shadow-none | none | Flat elements |
| shadow-xs | 0 1px 2px rgba(44, 44, 44, 0.04) | Subtle lift |
| shadow-sm | 0 2px 4px rgba(44, 44, 44, 0.06) | Input fields |
| shadow-md | 0 4px 12px rgba(44, 44, 44, 0.08) | Cards, dropdowns |
| shadow-lg | 0 8px 24px rgba(44, 44, 44, 0.10) | Modals, popovers |
| shadow-xl | 0 16px 48px rgba(44, 44, 44, 0.12) | Floating elements |

**Design Note:** Shadows in this system are subtle and warm-tinted, avoiding harsh dark shadows. The aesthetic favors elevation through subtle color shifts rather than heavy shadows.

### Inset Shadow (Tactile Controls)
| Token | Value | Usage |
|-------|-------|-------|
| inset-dial | inset 0 2px 4px rgba(0, 0, 0, 0.15) | Recessed dials, knobs |
| inset-input | inset 0 1px 2px rgba(0, 0, 0, 0.05) | Input fields |

### Other Effects
- **Backdrop Blur:** blur(8px) — For overlays
- **Overlay Light:** rgba(245, 240, 230, 0.85)
- **Overlay Dark:** rgba(44, 44, 44, 0.6)

## 7. UI Component Guidelines

### Buttons

**Primary Button (Orange CTA)**
- Background: #FF5C00
- Text: #FDFCFA
- Border Radius: radius-full (pill shape) or radius-md
- Padding: 12px 24px
- Font Weight: 600
- Hover: #E54D00
- Active: #CC4400

**Secondary Button**
- Background: #F5F0E6
- Text: #2C2C2C
- Border: 2px solid #E8E2D8
- Border Radius: radius-md
- Padding: 12px 24px
- Hover Background: #E8E2D8

**Ghost Button**
- Background: transparent
- Text: #2C2C2C
- Border: none
- Hover: Background #F0EBE1
- Active: Background #E8E2D8

**Icon Button (Circular)**
- Background: #F5F0E6
- Size: 40px × 40px
- Border Radius: radius-full
- Icon Color: #2C2C2C
- Hover: Background #E8E2D8
- Active with Orange: Background #FF5C00, Icon #FDFCFA

**Disabled State**
- Background: #E8E2D8
- Text: #C4BFB6
- Cursor: not-allowed

### Input Fields
- **Background:** #FAF8F5
- **Border:** 1px solid #E8E2D8
- **Border Radius:** radius-md (8px)
- **Focus Ring:** 2px solid #FF5C00
- **Placeholder:** #C4BFB6
- **Padding:** 12px 16px
- **Height:** 44px (default)

### Toggle Switches (Braun-style)
- **Track Off:** #E8E2D8
- **Track On:** #FF5C00
- **Knob:** #FDFCFA with subtle shadow
- **Knob Size:** 20px circle
- **Track Size:** 44px × 24px
- **Border Radius:** radius-full

### Sliders (Dial-inspired)
- **Track:** #E8E2D8, 4px height
- **Progress:** #FF5C00
- **Thumb:** 16px circle, #2C2C2C or #FF5C00
- **Hover Thumb:** Scale to 20px

### Cards
- **Background:** #FAF8F5
- **Border:** 1px solid #E8E2D8 (optional)
- **Border Radius:** radius-lg (12px)
- **Shadow:** shadow-md
- **Padding:** 20px - 24px

### Navigation Sidebar
- **Background:** #F5F0E6 or #FAF8F5
- **Width:** 240px
- **Item Padding:** 12px 16px
- **Active Item:** Background #FF5C00, Text #FDFCFA
- **Hover Item:** Background #E8E2D8
- **Icon Size:** 20px
- **Border Radius (items):** radius-md

### Data Tables
- **Header Background:** #F0EBE1
- **Header Text:** #2C2C2C, weight 600
- **Row Background:** #FDFCFA
- **Row Hover:** #F5F0E6
- **Row Border:** 1px solid #E8E2D8
- **Cell Padding:** 12px 16px

### Charts & Data Visualization
- **Bar Charts:** Use orange (#FF5C00) for primary data, amber (#D4A84B) for secondary
- **Line Charts:** Orange line on cream grid
- **Grid Lines:** #E8E2D8
- **Axis Text:** #8B8680

## 8. Iconography

### Icon Style
- **Type:** Outlined with 1.5px stroke (preferred), Filled for active states
- **Default Size:** 20px × 20px
- **Small Size:** 16px × 16px
- **Large Size:** 24px × 24px
- **Stroke Width:** 1.5px - 2px
- **Default Color:** #2C2C2C
- **Active Color:** #FF5C00
- **Disabled Color:** #C4BFB6

### Icon Corner Radius
- Match icon corners to overall radius system
- Prefer rounded line caps and joins

### Recommended Icon Libraries
- **Lucide** — Clean, consistent outlined icons
- **Phosphor** — Flexible weight options, excellent for this aesthetic
- **Feather** — Simple, elegant outlines

## 9. Animation & Motion

### Duration Scale
| Token | Value | Usage |
|-------|-------|-------|
| duration-instant | 0ms | Immediate state changes |
| duration-fast | 100ms | Micro-interactions, hovers |
| duration-normal | 200ms | Standard transitions |
| duration-slow | 300ms | Complex animations |
| duration-slower | 500ms | Page transitions |

### Easing Functions
- **Standard:** cubic-bezier(0.4, 0, 0.2, 1) — General purpose
- **Entrance:** cubic-bezier(0, 0, 0.2, 1) — Elements entering
- **Exit:** cubic-bezier(0.4, 0, 1, 1) — Elements leaving
- **Bounce:** cubic-bezier(0.34, 1.56, 0.64, 1) — Playful emphasis

### Animation Guidelines
- Keep animations **subtle and purposeful**
- Prefer **opacity and transform** over layout-affecting properties
- Toggle switches should feel **tactile** with slight bounce
- Buttons should have **subtle scale feedback** on press (0.98)
- Loading states use **smooth, continuous motion**
- Avoid flashy or attention-grabbing animations

### Transition Examples
```css
/* Button hover */
transition: background-color 100ms ease, transform 100ms ease;

/* Card hover */
transition: box-shadow 200ms ease, transform 200ms ease;

/* Toggle switch */
transition: background-color 200ms ease;
.knob { transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1); }
```

## 10. CSS Variables

```css
:root {
  /* ===== Colors ===== */
  /* Primary */
  --color-cream: #F5F0E6;
  --color-slate: #2C2C2C;
  
  /* Secondary */
  --color-stone: #8B8680;
  --color-beige: #E8E2D8;
  --color-white: #FAF8F5;
  
  /* Accent - Braun Orange */
  --color-accent: #FF5C00;
  --color-accent-hover: #E54D00;
  --color-accent-light: #FF7A22;
  
  /* Neutral */
  --color-paper: #FDFCFA;
  --color-parchment: #F0EBE1;
  --color-aluminum: #C4BFB6;
  --color-charcoal: #3D3D3D;
  --color-jet: #1A1A1A;
  
  /* Semantic */
  --color-success: #4A7C59;
  --color-warning: #D4A84B;
  --color-error: #C45C4F;
  --color-info: #5B7B8C;
  
  /* ===== Typography ===== */
  --font-primary: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-display: "Inter Tight", "SF Pro Display", sans-serif;
  --font-mono: "IBM Plex Mono", "SF Mono", Consolas, monospace;
  
  /* ===== Spacing ===== */
  --space-unit: 4px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  
  /* ===== Border Radius ===== */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
  
  /* ===== Borders ===== */
  --border-default: 1px solid var(--color-beige);
  --border-strong: 2px solid var(--color-aluminum);
  --border-focus: 2px solid var(--color-accent);
  
  /* ===== Shadows ===== */
  --shadow-xs: 0 1px 2px rgba(44, 44, 44, 0.04);
  --shadow-sm: 0 2px 4px rgba(44, 44, 44, 0.06);
  --shadow-md: 0 4px 12px rgba(44, 44, 44, 0.08);
  --shadow-lg: 0 8px 24px rgba(44, 44, 44, 0.10);
  --shadow-xl: 0 16px 48px rgba(44, 44, 44, 0.12);
  
  /* ===== Transitions ===== */
  --transition-fast: 100ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

## 11. Tailwind Config Recommendations

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Braun-inspired palette
        cream: {
          50: '#FDFCFA',
          100: '#FAF8F5',
          200: '#F5F0E6',
          300: '#F0EBE1',
          400: '#E8E2D8',
          500: '#C4BFB6',
          600: '#8B8680',
          700: '#3D3D3D',
          800: '#2C2C2C',
          900: '#1A1A1A',
        },
        braun: {
          orange: '#FF5C00',
          'orange-light': '#FF7A22',
          'orange-dark': '#E54D00',
        },
        semantic: {
          success: '#4A7C59',
          warning: '#D4A84B',
          error: '#C45C4F',
          info: '#5B7B8C',
        },
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Inter Tight', 'SF Pro Display', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(44, 44, 44, 0.04)',
        'sm': '0 2px 4px rgba(44, 44, 44, 0.06)',
        'md': '0 4px 12px rgba(44, 44, 44, 0.08)',
        'lg': '0 8px 24px rgba(44, 44, 44, 0.10)',
        'xl': '0 16px 48px rgba(44, 44, 44, 0.12)',
        'dial': 'inset 0 2px 4px rgba(0, 0, 0, 0.15)',
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
    },
  },
  plugins: [],
}
```

## 12. Implementation Notes

### Do's ✓
- Use **cream/beige backgrounds** rather than pure white
- Apply **orange accents sparingly** for maximum impact
- Embrace **circular UI elements** for controls and buttons
- Create **tactile-feeling interactions** with subtle shadows and transforms
- Maintain **generous whitespace** between elements
- Use **consistent border-radius** within component groups
- Design for **visual hierarchy** through weight and color, not size alone
- Reference **physical product design** for UI metaphors

### Don'ts ✗
- Avoid pure white (#FFFFFF) as primary background
- Don't overuse the orange accent - reserve for CTAs and active states
- Avoid harsh drop shadows with cool undertones
- Don't use thin, light-weight typography for headings
- Avoid cluttered layouts - embrace minimalism
- Don't mix rounded and sharp corners inconsistently
- Avoid gradients except for subtle depth effects
- Don't use decorative elements without function

### Accessibility Considerations
- **Color Contrast:** Orange (#FF5C00) on cream (#F5F0E6) meets WCAG AA for large text (3.5:1). For body text, use #2C2C2C on cream (11.3:1 ratio)
- **Focus States:** Always provide visible focus rings using --color-accent
- **Touch Targets:** Minimum 44px × 44px for interactive elements
- **Text Size:** Never go below 12px for readable text
- **Motion:** Respect `prefers-reduced-motion` for animations

### Design System Signature Elements
1. **Circular Toggle Switches** with smooth animations
2. **Pill-shaped Primary Buttons** with orange background
3. **Sidebar Navigation** with active state highlighting
4. **Data Tables** with cream/beige row striping
5. **Progress Bars/Sliders** with orange accent
6. **Icon Buttons** in circular containers
7. **Card Layouts** with subtle shadows and generous padding

---

*This style guide embodies the timeless principles of Dieter Rams: "Good design is as little design as possible."*

