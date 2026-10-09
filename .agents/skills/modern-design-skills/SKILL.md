---
name: modern-design-skills
description: >-
  Use this skill as the master design guide and decision framework for selecting and combining UI animation tools:
  React Bits, Magic UI, Motion Primitives, and GSAP. Use whenever planning or upgrading user interfaces.
---

# Modern Design & Motion Skills Suite

This workspace includes four modern UI and animation design systems stored in `design-skills/`:
- **React Bits**: `[design-skills/react-bits](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits)` & skill `[react-bits](file:///d:/NITHIN/EDUVERSE_CMRIT/.agents/skills/react-bits/SKILL.md)`
- **Magic UI**: `[design-skills/magicui](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/magicui)` & skill `[magic-ui](file:///d:/NITHIN/EDUVERSE_CMRIT/.agents/skills/magic-ui/SKILL.md)`
- **Motion Primitives**: `[design-skills/motion-primitives](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/motion-primitives)` & skill `[motion-primitives](file:///d:/NITHIN/EDUVERSE_CMRIT/.agents/skills/motion-primitives/SKILL.md)`
- **GSAP**: `[design-skills/gsap](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap)` & skill `[gsap-animation](file:///d:/NITHIN/EDUVERSE_CMRIT/.agents/skills/gsap-animation/SKILL.md)`

---

## When to Apply

Apply this skill when:
- Designing a new page, screen, or dashboard from scratch.
- Deciding which animation library or component architecture best fits a feature.
- Elevating a basic UI into an engaging, interactive experience with micro-animations and visual depth.
- Auditing performance and ensuring motion effects don't degrade mobile frame rates.

---

## Architecture Principles

1. **Hierarchy over Novelty**: Motion should direct user attention to key actions, status updates, and primary content.
2. **Combine, Don't Compete**:
   - Use **Magic UI** for layout containers (Bento grids, docks, marquees).
   - Use **React Bits** for headline entrances, particle accents, and magnetic cursors.
   - Use **Motion Primitives** for app interactions (tabs, dialogs, drawers).
   - Use **GSAP** for choreographed landing page intros and scroll-pinned sequences.
3. **Accessibility**: Always respect `prefers-reduced-motion` settings.
4. **Performance**: Keep high-motion WebGL shaders isolated, apply CSS `will-change` selectively, and use `IntersectionObserver` to unmount off-screen animations.

---

## References

- [Selection Matrix & Decision Tree](./references/selection-matrix.md) — Side-by-side comparison and use cases.
