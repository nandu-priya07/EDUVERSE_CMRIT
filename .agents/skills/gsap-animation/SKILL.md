---
name: gsap-animation
description: >-
  Use this skill when implementing high-performance JavaScript animations, scroll-driven storytelling with ScrollTrigger,
  complex timeline sequences, SVG morphing, and FLIP layout transitions with GSAP and React.
---

# GSAP Animation Skill

GreenSock Animation Platform (GSAP) is the high-performance standard for scripted web animations, physics tweens, and complex timelines.

Source code in this workspace is located in:
`[design-skills/gsap](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap)`
Source plugins:
`[design-skills/gsap/src](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap/src)`

---

## When to Apply

Apply this skill when:
- Creating complex, multi-stage choreographed landing page animations where exact timing, reverse playback, or scrubbing is required.
- Building scroll-driven interactions with pinning, horizontal scrolling, and parallax via `ScrollTrigger`.
- Animating SVG paths (`MorphSVGPlugin`, `DrawSVGPlugin`, `MotionPathPlugin`).
- Requiring seamless FLIP layout transitions (`Flip.js`).
- Handling complex gesture-driven interactions with `Observer` and `Draggable`.

---

## Core Workflow for React Projects

1. **Install Dependencies**:
   ```bash
   npm install gsap @gsap/react
   ```
2. **Register Plugins**:
   ```javascript
   import gsap from 'gsap';
   import { useGSAP } from '@gsap/react';
   import { ScrollTrigger } from 'gsap/ScrollTrigger';
   gsap.registerPlugin(useGSAP, ScrollTrigger);
   ```
3. **Use Scoped Animations**:
   Always use the `useGSAP` hook with `{ scope: containerRef }` to ensure automatic memory cleanup and prevent duplicate triggers during React StrictMode mount/unmount cycles.
4. **Tune Easing**: Use `power2.out`, `power3.out`, or `back.out` for fluid UI motion.
5. **Mobile Responsiveness**: Implement `gsap.matchMedia()` to disable or simplify heavy animations on mobile devices.

---

## References

- [Core Tweens & Timelines](./references/core-and-timelines.md) — Tweens, staggers, timelines, and easing.
- [Plugins & ScrollTrigger](./references/plugins-and-scrolltrigger.md) — Scroll-driven animations, scrubbing, pinning, and Flip.
- [React Integration Guide](./references/react-integration.md) — Safe usage with `useGSAP`, state updates, and responsiveness.
