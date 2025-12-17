# Cryptic Neon Dark Visual Style Guide

> Source: https://cdn.dribbble.com/userupload/45993595/file/039b4e7262cc76d3d747fcee9bb34d8a.webp
> Generated at: 2025-12-09
> Design Credit: Dribbble - Cryptic Web Dashboard

## 1. Design Philosophy

A sophisticated **fintech/crypto dashboard** aesthetic that combines:
- **Dark mode dominance** - Deep, almost black backgrounds for reduced eye strain and premium feel
- **Neon green accents** - Vibrant lime/chartreuse green symbolizing growth, profit, and digital futurism
- **Glassmorphism elements** - Subtle frosted glass effects on cards and overlays
- **Data-rich layouts** - Dense information display with clear visual hierarchy
- **Cyberpunk undertones** - Glowing edges, gradient fills, sci-fi inspired typography

**Keywords:** Dark fintech, Crypto UI, Neon green, Glassmorphism, Data dashboard, Cyberpunk minimal

## 2. Color Palette

### Primary Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Neon Lime | #7CFF01 | 124, 255, 1 | Primary accent, CTAs, positive indicators |
| Lime Dark | #5ACC00 | 90, 204, 0 | Hover states, secondary accent |
| Lime Glow | #AAFF55 | 170, 255, 85 | Highlights, glows |

### Secondary Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Electric Teal | #00D4AA | 0, 212, 170 | Secondary charts, variety |
| Coral Pink | #FF6B8A | 255, 107, 138 | Negative indicators, losses |
| Purple Accent | #8B5CF6 | 139, 92, 246 | Tertiary accent, icons |

### Accent Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Bitcoin Orange | #F7931A | 247, 147, 26 | BTC branding |
| Tether Green | #26A17B | 38, 161, 123 | USDT branding |
| Ethereum Blue | #627EEA | 98, 126, 234 | ETH branding |

### Neutral Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Deep Black | #0A0A0A | 10, 10, 10 | Page background |
| Card Dark | #141414 | 20, 20, 20 | Card backgrounds |
| Surface | #1A1A1A | 26, 26, 26 | Elevated surfaces |
| Border Dark | #2A2A2A | 42, 42, 42 | Subtle borders |
| Border Light | #3D3D3D | 61, 61, 61 | Active borders |
| Muted | #6B6B6B | 107, 107, 107 | Disabled, placeholders |
| Text Secondary | #9CA3AF | 156, 163, 175 | Secondary text |
| Text Primary | #F3F4F6 | 243, 244, 246 | Primary text |
| Pure White | #FFFFFF | 255, 255, 255 | Headings, emphasis |

### Semantic Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Success | #7CFF01 | 124, 255, 1 | Positive changes, gains |
| Warning | #FBBF24 | 251, 191, 36 | Caution states |
| Error | #FF6B8A | 255, 107, 138 | Losses, errors |
| Info | #60A5FA | 96, 165, 250 | Informational |

## 3. Typography

### Font Families
- **Primary:** "Inter", "SF Pro Display", system-ui - UI elements, body text
- **Display:** "Playfair Display", "Cormorant Garamond", serif - Hero titles, branding
- **Monospace:** "JetBrains Mono", "Fira Code", monospace - Numbers, prices, code

### Type Scale
| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 48px / 3rem | 400 | 1.1 | Hero sections, brand text |
| H1 | 32px / 2rem | 600 | 1.2 | Page titles |
| H2 | 24px / 1.5rem | 600 | 1.3 | Section headings |
| H3 | 18px / 1.125rem | 600 | 1.4 | Card titles |
| Body Large | 16px / 1rem | 400 | 1.5 | Important content |
| Body | 14px / 0.875rem | 400 | 1.5 | Main content |
| Small | 12px / 0.75rem | 400 | 1.4 | Captions, labels |
| Tiny | 10px / 0.625rem | 500 | 1.4 | Badges, tags |

### Text Colors
- **Primary:** #FFFFFF (Pure white for headings)
- **Secondary:** #9CA3AF (Muted for descriptions)
- **Tertiary:** #6B6B6B (Hints, placeholders)
- **Link:** #7CFF01 (Lime green)
- **Link Hover:** #AAFF55 (Lighter lime)

## 4. Spacing System

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-0 | 0px | None |
| space-1 | 4px | Tight inline spacing |
| space-2 | 8px | Icon gaps, tight padding |
| space-3 | 12px | Small component padding |
| space-4 | 16px | Default padding |
| space-5 | 20px | Card padding |
| space-6 | 24px | Section gaps |
| space-8 | 32px | Large section spacing |
| space-10 | 40px | Major section dividers |
| space-12 | 48px | Page sections |

## 5. Border & Radius

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| radius-none | 0px | Sharp edges |
| radius-sm | 4px | Small inputs, tags |
| radius-md | 8px | Buttons, chips |
| radius-lg | 12px | Cards, panels |
| radius-xl | 16px | Modals, large cards |
| radius-2xl | 20px | Feature cards |
| radius-full | 9999px | Pills, avatars, circular buttons |

### Border Colors
- **Default:** #2A2A2A (Subtle dark)
- **Hover:** #3D3D3D (Slightly visible)
- **Active:** #7CFF01 (Neon lime)
- **Focus:** rgba(124, 255, 1, 0.5) (Lime glow)

### Border Widths
- **Default:** 1px
- **Active/Focus:** 1px with glow effect

## 6. Shadows & Effects

| Token | Value | Usage |
|-------|-------|-------|
| shadow-none | none | Flat elements |
| shadow-sm | 0 2px 4px rgba(0, 0, 0, 0.3) | Subtle lift |
| shadow-md | 0 4px 12px rgba(0, 0, 0, 0.4) | Cards |
| shadow-lg | 0 8px 24px rgba(0, 0, 0, 0.5) | Modals, dropdowns |
| shadow-glow-sm | 0 0 8px rgba(124, 255, 1, 0.3) | Subtle neon glow |
| shadow-glow-md | 0 0 16px rgba(124, 255, 1, 0.4) | Active states |
| shadow-glow-lg | 0 0 32px rgba(124, 255, 1, 0.5) | Hero elements |

### Glassmorphism Effect
```css
.glass {
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

## 7. UI Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #7CFF01 0%, #5ACC00 100%);
  color: #0A0A0A;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 0 16px rgba(124, 255, 1, 0.3);
  transition: all 0.2s ease;
}
.btn-primary:hover {
  box-shadow: 0 0 24px rgba(124, 255, 1, 0.5);
  transform: translateY(-1px);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: #7CFF01;
  border: 1px solid #7CFF01;
  padding: 12px 24px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  background: rgba(124, 255, 1, 0.1);
  box-shadow: 0 0 12px rgba(124, 255, 1, 0.2);
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: #9CA3AF;
  border: 1px solid #2A2A2A;
  padding: 12px 24px;
  border-radius: 8px;
}
.btn-ghost:hover {
  border-color: #3D3D3D;
  color: #FFFFFF;
}
```

### Input Fields
```css
.input {
  background: #141414;
  border: 1px solid #2A2A2A;
  border-radius: 8px;
  padding: 12px 16px;
  color: #FFFFFF;
  font-size: 14px;
}
.input:focus {
  border-color: #7CFF01;
  box-shadow: 0 0 0 3px rgba(124, 255, 1, 0.15);
  outline: none;
}
.input::placeholder {
  color: #6B6B6B;
}
```

### Cards
```css
.card {
  background: #141414;
  border: 1px solid #2A2A2A;
  border-radius: 16px;
  padding: 20px;
}
.card-elevated {
  background: rgba(26, 26, 26, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
}
.card-accent {
  background: linear-gradient(135deg, rgba(124, 255, 1, 0.05) 0%, rgba(124, 255, 1, 0.02) 100%);
  border: 1px solid rgba(124, 255, 1, 0.2);
  border-radius: 16px;
  padding: 20px;
}
```

### Navigation Sidebar
```css
.sidebar {
  background: #0A0A0A;
  border-right: 1px solid #2A2A2A;
  width: 240px;
}
.nav-item {
  padding: 12px 16px;
  color: #9CA3AF;
  border-radius: 8px;
  margin: 4px 8px;
}
.nav-item:hover {
  background: rgba(124, 255, 1, 0.05);
  color: #FFFFFF;
}
.nav-item.active {
  background: rgba(124, 255, 1, 0.1);
  color: #7CFF01;
  border-left: 2px solid #7CFF01;
}
```

### Data Table
```css
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.table th {
  color: #6B6B6B;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #2A2A2A;
}
.table td {
  padding: 16px;
  border-bottom: 1px solid #1A1A1A;
  color: #F3F4F6;
}
.table tr:hover {
  background: rgba(124, 255, 1, 0.02);
}
```

### Badges & Tags
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.badge-success {
  background: rgba(124, 255, 1, 0.15);
  color: #7CFF01;
}
.badge-error {
  background: rgba(255, 107, 138, 0.15);
  color: #FF6B8A;
}
.badge-pro {
  background: linear-gradient(135deg, #7CFF01 0%, #5ACC00 100%);
  color: #0A0A0A;
}
```

### Charts
```css
.chart-positive {
  --chart-color: #7CFF01;
  --chart-gradient-start: rgba(124, 255, 1, 0.3);
  --chart-gradient-end: rgba(124, 255, 1, 0);
}
.chart-negative {
  --chart-color: #FF6B8A;
  --chart-gradient-start: rgba(255, 107, 138, 0.3);
  --chart-gradient-end: rgba(255, 107, 138, 0);
}
```

## 8. Iconography

- **Style:** Outlined / Linear with 1.5px stroke
- **Default Size:** 20px
- **Recommended Libraries:**
  - Lucide Icons (primary)
  - Phosphor Icons
  - Heroicons
- **Icon Colors:**
  - Default: #9CA3AF
  - Hover: #FFFFFF
  - Active: #7CFF01

## 9. Animation

| Token | Value | Usage |
|-------|-------|-------|
| duration-fast | 150ms | Micro-interactions, hovers |
| duration-normal | 200ms | Transitions, toggles |
| duration-slow | 300ms | Page transitions |
| duration-slower | 500ms | Complex animations |

- **Easing:** cubic-bezier(0.4, 0, 0.2, 1) (ease-out for entries)
- **Bounce:** cubic-bezier(0.68, -0.55, 0.265, 1.55) (playful interactions)

### Common Animations
```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 16px rgba(124, 255, 1, 0.3); }
  50% { box-shadow: 0 0 24px rgba(124, 255, 1, 0.5); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}
```

## 10. CSS Variables

```css
:root {
  /* Colors - Primary */
  --color-primary: #7CFF01;
  --color-primary-dark: #5ACC00;
  --color-primary-light: #AAFF55;
  --color-primary-glow: rgba(124, 255, 1, 0.3);
  
  /* Colors - Semantic */
  --color-success: #7CFF01;
  --color-warning: #FBBF24;
  --color-error: #FF6B8A;
  --color-info: #60A5FA;
  
  /* Colors - Background */
  --color-bg-primary: #0A0A0A;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1A1A1A;
  --color-bg-elevated: rgba(26, 26, 26, 0.8);
  
  /* Colors - Border */
  --color-border-default: #2A2A2A;
  --color-border-hover: #3D3D3D;
  --color-border-active: #7CFF01;
  
  /* Colors - Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #9CA3AF;
  --color-text-tertiary: #6B6B6B;
  --color-text-inverse: #0A0A0A;
  
  /* Typography */
  --font-primary: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Spacing */
  --space-unit: 4px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 16px rgba(124, 255, 1, 0.3);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

## 11. Tailwind Config

```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7CFF01',
          dark: '#5ACC00',
          light: '#AAFF55',
        },
        surface: {
          primary: '#0A0A0A',
          secondary: '#141414',
          tertiary: '#1A1A1A',
        },
        border: {
          DEFAULT: '#2A2A2A',
          hover: '#3D3D3D',
          active: '#7CFF01',
        },
        success: '#7CFF01',
        warning: '#FBBF24',
        error: '#FF6B8A',
        info: '#60A5FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.5)',
        'glow-sm': '0 0 8px rgba(124, 255, 1, 0.3)',
        'glow-md': '0 0 16px rgba(124, 255, 1, 0.4)',
        'glow-lg': '0 0 32px rgba(124, 255, 1, 0.5)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 16px rgba(124, 255, 1, 0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(124, 255, 1, 0.5)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

## 12. Implementation Notes

### Do's
- ✅ Use deep black backgrounds (#0A0A0A) for the base layer
- ✅ Apply neon lime (#7CFF01) sparingly for maximum impact
- ✅ Use glassmorphism for overlays and elevated cards
- ✅ Add subtle glow effects to interactive elements
- ✅ Use gradient fills for charts (fade to transparent)
- ✅ Keep text hierarchy clear with white headings and gray body
- ✅ Use monospace fonts for numerical data (prices, percentages)
- ✅ Apply subtle hover animations (translateY, glow increase)
- ✅ Use pill-shaped buttons for primary actions
- ✅ Include crypto coin branding colors for asset identification

### Don'ts
- ❌ Don't use pure white backgrounds (this is a dark theme only)
- ❌ Don't overuse the neon green - reserve for key actions and positive indicators
- ❌ Don't use heavy drop shadows (prefer glows)
- ❌ Don't mix too many accent colors - lime green should dominate
- ❌ Don't use serif fonts for UI elements (reserve for display only)
- ❌ Don't forget the red/pink color for negative indicators
- ❌ Don't make borders too visible - keep them subtle
- ❌ Don't skip the backdrop blur on overlapping elements

### Component Library Recommendations
- **React:** shadcn/ui with custom dark theme
- **Charts:** Recharts or Tremor with custom colors
- **Icons:** Lucide React
- **Animation:** Framer Motion

### Accessibility Notes
- Ensure lime green on dark backgrounds meets WCAG AA for large text
- Provide sufficient contrast for secondary text (#9CA3AF on #141414)
- Use focus rings with glow effects for keyboard navigation
- Consider reduced motion preferences for animations

