# Motion Primitives Component Reference

Motion Primitives provides fluid, composable UI building blocks powered by Framer Motion / Motion for React and Tailwind CSS.

Source code in this workspace is located in:
`[design-skills/motion-primitives/components/core](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/motion-primitives/components/core)`

---

## Primitives Catalog

| Component | Path | Use Case |
| :--- | :--- | :--- |
| **text-effect** | `components/core/text-effect.tsx` | Character/word/line staggered text reveal with presets (`blur`, `fade`, `scale`, `slide`). |
| **text-morph** | `components/core/text-morph.tsx` | Smooth SVG/path character morphing between two words. |
| **text-scramble** | `components/core/text-scramble.tsx` | Scrambled character text decrypter on hover or view. |
| **text-shimmer** | `components/core/text-shimmer.tsx` | Elegant sweeping gradient shimmer on text labels. |
| **text-shimmer-wave** | `components/core/text-shimmer-wave.tsx` | Wavy undulating shimmer effect across letters. |
| **text-loop** | `components/core/text-loop.tsx` | Smooth looping vertical word transition. |
| **spinning-text** | `components/core/spinning-text.tsx` | Circular rotating badge text along a curved path. |
| **morphing-dialog** | `components/core/morphing-dialog.tsx` | App Store style thumbnail card that expands smoothly into a full modal dialogue. |
| **morphing-popover** | `components/core/morphing-popover.tsx` | Button that morphs directly into a popover/menu with layout animation. |
| **border-trail** | `components/core/border-trail.tsx` | Glowing light beam tracing around the perimeter of any card or container. |
| **animated-number** | `components/core/animated-number.tsx` | Spring-based smooth integer/float counter animation. |
| **sliding-number** | `components/core/sliding-number.tsx` | Odometer-style vertical sliding reel for numbers and prices. |
| **animated-background** | `components/core/animated-background.tsx` | Shared floating pill background that glides between active tabs/nav items. |
| **infinite-slider** | `components/core/infinite-slider.tsx` | Physics-smooth seamless infinite carousel for items or images. |
| **progressive-blur** | `components/core/progressive-blur.tsx` | Multi-stop gradient blur overlay for hero images and scroll fade-outs. |
| **magnetic** | `components/core/magnetic.tsx` | Magnetic attraction pulling interactive elements towards the cursor. |
| **tilt** | `components/core/tilt.tsx` | 3D gyroscope/mouse tilt with spring physics for cards. |
| **spotlight** | `components/core/spotlight.tsx` | Mouse-following radial glow highlight on card surfaces. |
| **glow-effect** | `components/core/glow-effect.tsx` | Multi-color ambient aura glowing behind cards. |
| **toolbar-dynamic** | `components/core/toolbar-dynamic.tsx` | Dynamic island style expanding toolbar. |
| **transition-panel** | `components/core/transition-panel.tsx` | Animated tab panel transitions with slide & fade modes. |
| **image-comparison** | `components/core/image-comparison.tsx` | Before/after interactive image comparison slider. |
| **in-view** | `components/core/in-view.tsx` | Trigger animations when elements enter viewport with customizable thresholds. |

---

## Core Dependency

Motion Primitives works with `motion` (formerly `framer-motion`):
```bash
npm install motion clsx tailwind-merge
# or
npm install framer-motion clsx tailwind-merge
```
*(Note: If using `framer-motion`, replace `import { motion } from 'motion/react'` with `import { motion } from 'framer-motion'`)*
