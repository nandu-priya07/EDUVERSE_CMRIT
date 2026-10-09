# Magic UI Component Reference

All component files are located locally in:
`[design-skills/magicui/apps/www/registry/magicui](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/magicui/apps/www/registry/magicui)`

---

## Complete Component Index

### 1. Layouts & Grids
- **bento-grid.tsx**: Asymmetric high-impact grid cards with background graphics and hover actions.
- **dock.tsx**: Dock navigation bar with dynamic icon enlargement on hover.
- **marquee.tsx**: Smooth infinite looping scroll container for badges, logos, and testimonials.
- **terminal.tsx**: Retro/modern developer terminal window with typing simulations.

### 2. Buttons & CTAs
- **shimmer-button.tsx**: Button with glowing rotating border reflection.
- **shiny-button.tsx**: Metallic gradient swipe button.
- **rainbow-button.tsx**: Colorful vibrant animated gradient border button.
- **pulsating-button.tsx**: Subtle heartbeat pulsing button for primary calls to action.
- **interactive-hover-button.tsx**: Morphing hover button with sliding arrows.

### 3. Backgrounds & Ambience
- **animated-grid-pattern.tsx**: Flowing grid with randomized illuminated squares.
- **retro-grid.tsx**: 80s synthwave perspective floor grid with horizon fade.
- **warp-background.tsx**: Perspective 3D time-warp beam tunnel.
- **particles.tsx**: Lightweight Canvas particles floating in background.
- **flickering-grid.tsx**: Retro matrix flickering square grid.
- **dot-pattern.tsx**: Geometric dot matrix overlay.
- **meteors.tsx**: Diagonal shooting stars falling across screen.

### 4. Text & Typography
- **blur-fade.tsx**: Progressive blur and fade-in container for headings and cards.
- **text-animate.tsx**: Segmented letter/word reveal animations.
- **word-rotate.tsx**: Smooth vertical carousel flip for dynamic keywords.
- **sparkles-text.tsx**: Text decorated with twinkling particle stars.
- **typing-animation.tsx**: Mechanical typewriter text effect.
- **number-ticker.tsx**: Smooth animated counter ticker for metrics and statistics.

### 5. Borders & Badges
- **border-beam.tsx**: Traveling laser beam moving along card perimeters.
- **shine-border.tsx**: Glowing multi-color border stroke.
- **magic-card.tsx**: Card highlighting with dynamic mouse spotlight border.
- **neon-gradient-card.tsx**: High-vibrancy cyberpunk neon glowing card.
- **avatar-circles.tsx**: Overlapping user avatar cluster with total count.

---

## Utility Function `cn` Helper

All Magic UI components rely on the `cn` utility function:
```ts
// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```
