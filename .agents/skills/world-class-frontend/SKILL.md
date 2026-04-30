---
name: world-class-frontend
description: Build production-grade UIs that match the quality of Vercel, Stripe, Linear, Airbnb, and Apple. Includes design systems, component patterns, animation principles, and accessibility standards used by billion-dollar companies.
version: 1.0.0
disable-model-invocation: false
user-invocable: false
allowed-tools:
  - read
  - write
  - edit
  - bash
  - glob
  - grep
---

# World-Class Frontend Engineering

You now have access to the design principles, component patterns, and engineering standards used by the world's best frontend teams. Apply these whenever building UI.

## The 10 Principles of World-Class UI

### 1. Typography Hierarchy
- **3-level minimum**: Heading / Subheading / Body. Each with distinct size, weight, and color.
- **Type scale**: Use a consistent ratio (1.25 or 1.333). H1: 2.5-3.5rem, H2: 1.875-2.25rem, H3: 1.5rem, Body: 1rem, Small: 0.875rem.
- **Weight contrast**: Headings 600-700, body 400-500. Never use 300 for body text.
- **Color hierarchy**: Primary text: `text-foreground`. Secondary: `text-muted-foreground`. Tertiary: `text-muted-foreground/60`.
- **Line height**: Headings 1.1-1.3, body 1.6-1.75, captions 1.4.
- **Letter spacing**: Tight for headings (`tracking-tight`), normal for body, wide for uppercase labels (`tracking-wider`).

### 2. Spacing System
- **Use Tailwind's scale**: 4 (1rem), 6 (1.5rem), 8 (2rem), 12 (3rem), 16 (4rem), 20 (5rem), 24 (6rem), 32 (8rem).
- **Section padding**: `py-16 sm:py-20 lg:py-24` between major sections.
- **Card padding**: `p-6` minimum. `p-8` for hero cards.
- **Gap consistency**: `gap-4` for tight groups, `gap-6` for related items, `gap-8` for independent sections.
- **Container max-width**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Content max-width for text**: `max-w-3xl` for readability (65-75 characters per line).

### 3. Color System (Stripe/Linear style)
```css
/* In globals.css — use this exact structure */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 6.9%;
  --card-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}
```

### 4. Border & Shadow System
- **Default border**: `border border-border/50` — subtle, not harsh.
- **Card borders**: `rounded-xl border border-border/50 bg-card`.
- **Hover elevation**: `hover:border-border hover:shadow-sm transition-all`.
- **Shadows** (use sparingly):
  - `shadow-sm`: Dropdowns, small popovers
  - `shadow-md`: Cards on hover, modals
  - `shadow-lg`: Dialogs, large overlays
  - `shadow-xl`: Full-screen overlays
- **No shadow by default**: Modern UIs use borders for definition. Shadows only for elevated layers.

### 5. Animation Principles
- **Duration**: 150ms (micro), 200ms (standard), 300ms (entrance), 500ms+ (page transitions).
- **Easing**: `ease-out` for entrances, `ease-in-out` for state changes, `ease-in` for exits.
- **Transform over position**: Use `translate`, `scale`, `opacity` — never animate `top`, `left`, `width`.
- **Stagger delay**: `delay-75`, `delay-100`, `delay-150` for sequential reveals.
- **Always respect `prefers-reduced-motion`**:
```tsx
import { useReducedMotion } from "framer-motion";
// or CSS: @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
```

### 6. Button Hierarchy
```tsx
// Primary action — one per page/section
<Button>Get Started</Button>

// Secondary action
<Button variant="outline">Learn More</Button>

// Tertiary / ghost action
<Button variant="ghost" size="sm">Cancel</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Icon buttons
<Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>

// Loading state
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Saving..." : "Save"}
</Button>
```

### 7. Card Design Patterns
```tsx
// Standard card
<div className="rounded-xl border border-border/50 bg-card p-6 transition-all hover:shadow-md hover:border-border">
  <h3 className="font-semibold text-lg">Title</h3>
  <p className="mt-1 text-sm text-muted-foreground">Description</p>
</div>

// Clickable card (interactive)
<Link href="/path" className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:shadow-md hover:border-border hover:-translate-y-0.5 block">
  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">Title</h3>
</Link>

// Feature card with icon
<div className="rounded-xl border border-border/50 bg-card p-6">
  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
    <Icon className="h-5 w-5" />
  </div>
  <h3 className="font-semibold">Title</h3>
  <p className="mt-1 text-sm text-muted-foreground">Description</p>
</div>
```

### 8. Form Design (Linear-grade)
```tsx
// Form field pattern
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" />
  <p className="text-xs text-muted-foreground">We'll never share your email.</p>
</div>

// With error state
<div className="space-y-2">
  <Label htmlFor="email" className="text-destructive">Email</Label>
  <Input id="email" type="email" className="border-destructive focus-visible:ring-destructive" />
  <p className="text-xs text-destructive">Please enter a valid email address.</p>
</div>

// Inline validation with react-hook-form + zod
// See form patterns in system prompt for complete implementation
```

### 9. Responsive Breakpoints
```
Mobile:  default (0-639px)    — single column, full-width buttons
Tablet:  sm: (640px+)         — 2 columns, side-by-side buttons  
Desktop: lg: (1024px+)       — 3+ columns, sidebar layouts
Wide:    xl: (1280px+)       — max-width container, generous padding
```

### 10. Empty States
```tsx
// Empty state (never leave blank screens)
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="mb-4 rounded-full bg-muted p-4">
    <Inbox className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold">No items yet</h3>
  <p className="mt-1 text-sm text-muted-foreground max-w-sm">
    When you create items, they'll appear here.
  </p>
  <Button className="mt-4">
    <Plus className="mr-2 h-4 w-4" />
    Create your first item
  </Button>
</div>
```

## Anti-Patterns — NEVER Do These

1. **No generic fonts**: Never use Inter, Roboto, Arial, or system fonts unless explicitly requested
2. **No purple gradients on white**: The most overused AI aesthetic
3. **No "Coming Soon" pages**: Build real functionality or don't build the page
4. **No lorem ipsum**: Use realistic placeholder content
5. **No broken hover states**: Every interactive element must respond to hover/focus
6. **No uncapped text**: Long text must truncate or wrap gracefully
7. **No fixed widths**: Use max-width and responsive units
8. **No hardcoded colors**: Use CSS variables / Tailwind tokens
9. **No spinner when skeleton works**: Skeletons show the shape of incoming content
10. **No unstyled forms**: Every input needs label, placeholder, and error state
11. **No dead links**: Every link must point to a real route
12. **No missing dark mode**: If light mode exists, dark mode must too
13. **No alert() dialogs**: Use proper dialog/sheet components
14. **No inline styles**: Use Tailwind classes exclusively
15. **No unhandled loading states**: Every data fetch needs loading + error UI

## Component Checklist (Before Marking UI Complete)

- [ ] Typography uses custom fonts (not system defaults)
- [ ] All colors use CSS variables / Tailwind tokens
- [ ] Dark mode works for every color/bg
- [ ] Hover/focus states on all interactive elements
- [ ] Loading skeleton matches final layout shape
- [ ] Empty state with illustration + CTA
- [ ] Error state with retry option
- [ ] Responsive at 320px, 768px, 1024px, 1440px
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus visible ring on all interactive elements
- [ ] Form inputs have labels, placeholders, error messages
- [ ] Images use next/Image with alt text
- [ ] No TODO comments or placeholder content
- [ ] No console.log statements
- [ ] All imports resolve correctly
- [ ] TypeScript types are correct (no `any`)
- [ ] Animation respects prefers-reduced-motion
- [ ] Long text truncates gracefully
- [ ] Container has max-width (not full viewport)
- [ ] Section spacing is consistent

## Motion Design System

### Framer Motion — Production Patterns
```tsx
import { motion } from "framer-motion";

// Page entrance (staggered)
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } }
};

// Usage:
<motion.div variants={container} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={item}>{/* content */}</motion.div>
  ))}
</motion.div>

// Hover scale (micro-interaction)
<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
  Click me
</motion.button>

// Layout animation (reorder, resize)
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
  {content}
</motion.div>
```

### CSS Animation — For Simple Cases
```tsx
// In globals.css
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-up { animation: slideUp 0.3s ease-out; }
```

## The Quality Bar

Before delivering any UI, ask yourself:

> "Would this look out of place on Vercel.com, Stripe.com, or Linear.app?"

If the answer is yes, iterate. The difference between good and great is:
- **Spacing**: Add 50% more padding than you think you need
- **Typography**: Use a distinctive font, tighten headings, increase line height
- **Color**: Add subtle borders, use muted text for secondary content
- **Motion**: Add hover transitions, staggered entrance, loading states
- **Details**: Icon in buttons, divider between sections, subtle background on cards
