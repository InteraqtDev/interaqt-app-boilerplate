# Bento Social Dark Visual Style Guide

> Source: `frontend/docs/visual/bento-cards/` (3 preview images)
> Generated at: 2024-12-08

## 1. Design Philosophy

**Bento Social Dark** is a sophisticated, modern dark-themed UI design system inspired by Japanese bento box layouts. It emphasizes:

- **Modular Grid Layout**: Components arranged in asymmetric bento-style grids
- **Deep Dark Palette**: Rich, layered dark backgrounds for reduced eye strain
- **Warm Accent Gradients**: Orange-to-pink gradients as focal points against cold backgrounds
- **Minimal Visual Noise**: Clean, uncluttered interfaces with generous whitespace
- **Soft Edges**: Rounded corners throughout for approachability
- **Content-First**: UI recedes to showcase user content (photos, posts, media)

**Keywords**: Dark Mode, Bento Grid, Social Media, Minimal, Premium, Warm Accents

---

## 2. Color Palette

### Primary Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Deep Black | #0A0A0B | rgb(10, 10, 11) | Page background |
| Surface Dark | #141416 | rgb(20, 20, 22) | Main content area |
| Card Dark | #1C1C1E | rgb(28, 28, 30) | Card backgrounds |

### Secondary Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Elevated Surface | #252528 | rgb(37, 37, 40) | Hover states, menus |
| Subtle Surface | #2C2C2E | rgb(44, 44, 46) | Active states, toggles |
| Border Dark | #3A3A3C | rgb(58, 58, 60) | Borders, dividers |

### Accent Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Accent Orange | #FF6B35 | rgb(255, 107, 53) | Gradient start, CTAs |
| Accent Pink | #FF1F8E | rgb(255, 31, 142) | Gradient end, highlights |
| Accent Purple | #A855F7 | rgb(168, 85, 247) | Alternative accent |
| Accent Coral | #FF7A6E | rgb(255, 122, 110) | Notification badges |

### Neutral Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Text Primary | #FFFFFF | rgb(255, 255, 255) | Headings, primary text |
| Text Secondary | #A1A1A6 | rgb(161, 161, 166) | Secondary text, labels |
| Text Tertiary | #636366 | rgb(99, 99, 102) | Placeholder, disabled |
| Text Muted | #48484A | rgb(72, 72, 74) | Subtle hints |

### Semantic Colors
| Name | HEX | RGB | Usage |
|------|-----|-----|-------|
| Success | #34C759 | rgb(52, 199, 89) | Positive actions, verified |
| Warning | #FF9F0A | rgb(255, 159, 10) | Caution states |
| Error | #FF453A | rgb(255, 69, 58) | Error states, destructive |
| Info | #5AC8FA | rgb(90, 200, 250) | Informational |

---

## 3. Typography

### Font Families
- **Primary:** SF Pro Display / Inter - Headlines, navigation
- **Secondary:** SF Pro Text / Inter - Body text, UI elements
- **Monospace:** SF Mono / JetBrains Mono - Code, usernames with @

### Type Scale
| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 32px | 700 | 1.2 | Hero titles |
| H1 | 24px | 600 | 1.3 | Page titles |
| H2 | 20px | 600 | 1.35 | Section headings |
| H3 | 17px | 600 | 1.4 | Card titles, usernames |
| Body | 15px | 400 | 1.5 | Main content |
| Body Small | 14px | 400 | 1.45 | Secondary content |
| Caption | 13px | 400 | 1.4 | Timestamps, meta |
| Micro | 11px | 500 | 1.3 | Badges, labels |

### Text Colors
- **Primary:** #FFFFFF (white)
- **Secondary:** #A1A1A6 (muted gray)
- **Disabled:** #636366 (dark gray)
- **Link:** #5AC8FA (info blue) or gradient accent

---

## 4. Spacing System

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight spacing, inline elements |
| space-2 | 8px | Icon gaps, tight padding |
| space-3 | 12px | Small gaps, button padding |
| space-4 | 16px | Default spacing, card padding |
| space-5 | 20px | Section gaps |
| space-6 | 24px | Large card padding |
| space-8 | 32px | Section spacing |
| space-10 | 40px | Major section gaps |
| space-12 | 48px | Page margins |

---

## 5. Border & Radius

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| radius-xs | 4px | Small badges, tags |
| radius-sm | 8px | Buttons, inputs, chips |
| radius-md | 12px | Cards, dropdowns |
| radius-lg | 16px | Modal corners, large cards |
| radius-xl | 20px | Feature cards, containers |
| radius-2xl | 24px | Login forms, hero sections |
| radius-full | 9999px | Avatars, pills, toggles |

### Border Colors
- **Default:** #3A3A3C (subtle border)
- **Focus:** Gradient border (orange to pink) or #5AC8FA
- **Hover:** #48484A (slightly lighter)

---

## 6. Shadows & Effects

| Token | Value | Usage |
|-------|-------|-------|
| shadow-none | none | Flat elements |
| shadow-subtle | 0 1px 2px rgba(0,0,0,0.3) | Slight elevation |
| shadow-sm | 0 2px 8px rgba(0,0,0,0.4) | Cards |
| shadow-md | 0 4px 16px rgba(0,0,0,0.5) | Dropdowns |
| shadow-lg | 0 8px 32px rgba(0,0,0,0.6) | Modals |
| shadow-glow-accent | 0 0 20px rgba(255,107,53,0.3) | Accent glow |

### Backdrop Effects
```css
/* Glassmorphism for overlays */
.glass {
  background: rgba(28, 28, 30, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Subtle inner glow */
.inner-glow {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
```

---

## 7. UI Components

### Buttons

#### Primary Button (Gradient)
```css
.btn-primary {
  background: linear-gradient(135deg, #FF6B35 0%, #FF1F8E 100%);
  color: #FFFFFF;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 15px;
  border: none;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: #2C2C2E;
  color: #FFFFFF;
  border: 1px solid #3A3A3C;
  border-radius: 8px;
  padding: 12px 24px;
}
.btn-secondary:hover {
  background: #3A3A3C;
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: #A1A1A6;
  border: none;
  padding: 8px 16px;
}
.btn-ghost:hover {
  color: #FFFFFF;
  background: rgba(255,255,255,0.05);
}
```

### Input Fields
```css
.input {
  background: #1C1C1E;
  border: 1px solid #3A3A3C;
  border-radius: 8px;
  padding: 12px 16px;
  color: #FFFFFF;
  font-size: 15px;
}
.input::placeholder {
  color: #636366;
}
.input:focus {
  border-color: #FF6B35;
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.15);
}
```

### Cards
```css
.card {
  background: #1C1C1E;
  border: 1px solid #2C2C2E;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.card-elevated {
  background: #252528;
}
.card-interactive:hover {
  border-color: #3A3A3C;
  transform: translateY(-2px);
}
```

### Avatar
```css
.avatar {
  border-radius: 9999px;
  border: 2px solid #2C2C2E;
}
.avatar-sm { width: 32px; height: 32px; }
.avatar-md { width: 40px; height: 40px; }
.avatar-lg { width: 56px; height: 56px; }
.avatar-xl { width: 80px; height: 80px; }

.avatar-ring {
  border: 2px solid transparent;
  background: linear-gradient(#1C1C1E, #1C1C1E) padding-box,
              linear-gradient(135deg, #FF6B35, #FF1F8E) border-box;
}
```

### Navigation Tabs
```css
.tab {
  color: #A1A1A6;
  padding: 12px 16px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
}
.tab:hover {
  color: #FFFFFF;
}
.tab-active {
  color: #FFFFFF;
  border-bottom-color: #FF6B35;
}
```

### Toggle/Switch
```css
.toggle {
  width: 48px;
  height: 28px;
  background: #3A3A3C;
  border-radius: 14px;
  position: relative;
}
.toggle-active {
  background: linear-gradient(135deg, #FF6B35, #FF1F8E);
}
.toggle-knob {
  width: 24px;
  height: 24px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
```

---

## 8. Iconography

- **Style:** Outlined (Stroke weight: 1.5-2px)
- **Default Size:** 20px (body), 24px (navigation)
- **Recommended Library:** Lucide Icons, Heroicons (outline), SF Symbols
- **Color:** Inherits text color (#A1A1A6 default, #FFFFFF active)

---

## 9. Animation

| Token | Value | Usage |
|-------|-------|-------|
| duration-fast | 150ms | Hover states, toggles |
| duration-normal | 250ms | Transitions, fades |
| duration-slow | 400ms | Page transitions |
| duration-slower | 600ms | Complex animations |

- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out-quart)
- **Spring:** `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce effect)

```css
/* Common transitions */
.transition-default {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-fast {
  transition: all 0.15s ease-out;
}
```

---

## 10. CSS Variables

```css
:root {
  /* Colors - Background */
  --color-bg-page: #0A0A0B;
  --color-bg-surface: #141416;
  --color-bg-card: #1C1C1E;
  --color-bg-elevated: #252528;
  --color-bg-subtle: #2C2C2E;
  
  /* Colors - Accent */
  --color-accent-orange: #FF6B35;
  --color-accent-pink: #FF1F8E;
  --color-accent-gradient: linear-gradient(135deg, #FF6B35 0%, #FF1F8E 100%);
  
  /* Colors - Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A1A1A6;
  --color-text-tertiary: #636366;
  --color-text-muted: #48484A;
  
  /* Colors - Border */
  --color-border-default: #3A3A3C;
  --color-border-subtle: #2C2C2E;
  
  /* Colors - Semantic */
  --color-success: #34C759;
  --color-warning: #FF9F0A;
  --color-error: #FF453A;
  --color-info: #5AC8FA;
  
  /* Typography */
  --font-primary: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  
  /* Spacing */
  --space-unit: 4px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.6);
  --shadow-glow: 0 0 20px rgba(255,107,53,0.3);
  
  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 11. Tailwind Config

```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-page': '#0A0A0B',
        'bg-surface': '#141416',
        'bg-card': '#1C1C1E',
        'bg-elevated': '#252528',
        'bg-subtle': '#2C2C2E',
        
        // Accent
        accent: {
          orange: '#FF6B35',
          pink: '#FF1F8E',
          purple: '#A855F7',
          coral: '#FF7A6E',
        },
        
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1A6',
        'text-tertiary': '#636366',
        'text-muted': '#48484A',
        
        // Borders
        'border-default': '#3A3A3C',
        'border-subtle': '#2C2C2E',
        
        // Semantic
        success: '#34C759',
        warning: '#FF9F0A',
        error: '#FF453A',
        info: '#5AC8FA',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0,0,0,0.3)',
        'card': '0 2px 8px rgba(0,0,0,0.4)',
        'dropdown': '0 4px 16px rgba(0,0,0,0.5)',
        'modal': '0 8px 32px rgba(0,0,0,0.6)',
        'glow-accent': '0 0 20px rgba(255,107,53,0.3)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #FF6B35 0%, #FF1F8E 100%)',
        'gradient-card': 'linear-gradient(180deg, #1C1C1E 0%, #141416 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 12. Bento Grid Layout

A key feature of this design system is the **Bento Grid Layout** for dashboard-style interfaces:

```css
/* Bento Grid Container */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  padding: 16px;
}

/* Common Bento Cell Sizes */
.bento-sm { grid-column: span 3; }     /* Small square */
.bento-md { grid-column: span 4; }     /* Medium */
.bento-lg { grid-column: span 6; }     /* Half width */
.bento-xl { grid-column: span 8; }     /* Large */
.bento-full { grid-column: span 12; }  /* Full width */

/* Bento Cell Heights */
.bento-h-1 { min-height: 160px; }
.bento-h-2 { min-height: 320px; }
.bento-h-3 { min-height: 480px; }
```

---

## 13. Layout Patterns

### Three-Column Dashboard
```css
.dashboard-layout {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  min-height: 100vh;
  background: var(--color-bg-page);
}

.sidebar-left {
  background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border-subtle);
  padding: var(--space-4);
}

.main-content {
  padding: var(--space-6);
  overflow-y: auto;
}

.sidebar-right {
  background: var(--color-bg-surface);
  border-left: 1px solid var(--color-border-subtle);
  padding: var(--space-4);
}
```

### Feed Layout
```css
.feed {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.feed-post {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
}
```

---

## 14. Implementation Notes

### Do's
- ✅ Use the accent gradient sparingly for primary CTAs only
- ✅ Maintain high contrast ratios (text on dark backgrounds)
- ✅ Apply subtle border separations between sections
- ✅ Use rounded corners consistently (8px-16px for most elements)
- ✅ Add subtle hover state elevations
- ✅ Use the three-layer background hierarchy (page → surface → card)
- ✅ Include inner glows/top borders for depth on dark cards
- ✅ Keep iconography outlined and consistent in weight

### Don'ts
- ❌ Don't use pure black (#000000) - use deep grays instead
- ❌ Don't overuse the accent gradient - it loses impact
- ❌ Don't use thin fonts (below 400 weight) on dark backgrounds
- ❌ Don't skip the subtle borders - they provide essential structure
- ❌ Don't use heavy shadows - keep them soft and diffused
- ❌ Don't mix rounded and sharp corners in the same interface
- ❌ Don't use bright colors for large areas - reserve for accents

---

## 15. Component Examples

### Post Card
```jsx
<div className="bg-bg-card border border-border-subtle rounded-xl p-4 space-y-3">
  {/* Author */}
  <div className="flex items-center gap-3">
    <img className="w-10 h-10 rounded-full" src="avatar.jpg" />
    <div>
      <p className="text-text-primary font-semibold">Username</p>
      <p className="text-text-tertiary text-sm">2 hours ago</p>
    </div>
  </div>
  
  {/* Content */}
  <p className="text-text-primary">Post content here...</p>
  
  {/* Media */}
  <img className="w-full rounded-lg" src="media.jpg" />
  
  {/* Actions */}
  <div className="flex items-center gap-4 text-text-secondary">
    <button className="hover:text-accent-coral">♥ 24</button>
    <button className="hover:text-text-primary">💬 12</button>
    <button className="hover:text-text-primary">↗ Share</button>
  </div>
</div>
```

### Settings Menu Item
```jsx
<button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-bg-elevated transition-colors">
  <div className="flex items-center gap-3">
    <span className="text-text-secondary">🔔</span>
    <span className="text-text-primary">Notifications</span>
  </div>
  <span className="text-text-tertiary">→</span>
</button>
```

---

## Summary

| Property | Value |
|----------|-------|
| **Style Name** | bento-social-dark |
| **Source** | `frontend/docs/visual/bento-cards/` |
| **Philosophy** | Modern dark social UI with warm gradient accents and bento-style layouts |
| **Primary Colors** | #0A0A0B, #1C1C1E, #FF6B35, #FF1F8E |
| **Primary Font** | Inter / SF Pro Display |
| **Keywords** | Dark Mode, Bento Grid, Social Media, Minimal, Premium, Warm Accents, Gradient CTA |

