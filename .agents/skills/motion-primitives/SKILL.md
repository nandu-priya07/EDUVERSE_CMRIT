---
name: motion-primitives
description: >-
  Use this skill when implementing fluid UI transitions, micro-interactions, layout morphing (morphing dialog, morphing popover),
  animated tabs, magnetic cursors, border trails, and text reveals using Framer Motion / Motion for React.
---

# Motion Primitives Design Skill

Motion Primitives provides open-source, accessible, and physics-driven interactive components built on top of Motion / Framer Motion and Tailwind CSS.

Source code in this workspace is located in:
`[design-skills/motion-primitives](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/motion-primitives)`
Direct component files:
`[design-skills/motion-primitives/components/core](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/motion-primitives/components/core)`

---

## When to Apply

Apply this skill when:
- Designing seamless modal and popover transitions where the trigger element directly morphs into the container (`morphing-dialog`, `morphing-popover`).
- Creating smooth layout navigation pills (`animated-background`).
- Adding subtle animated counters or odometer displays (`animated-number`, `sliding-number`).
- Adding animated glowing card outlines (`border-trail`, `glow-effect`).
- Animating text reveals with fine-grained letter/word staggering (`text-effect`, `text-morph`, `text-shimmer`).

---

## Core Workflow

1. **Locate Primitive**: Review `[primitives.md](./references/primitives.md)`.
2. **Access Source**: Read the source from `design-skills/motion-primitives/components/core/<component-name>.tsx`.
3. **Verify Dependencies**:
   - Ensure `motion` or `framer-motion` is installed:
     ```bash
     npm install motion clsx tailwind-merge
     ```
4. **Integrate & Adapt**: Copy into your project's `components/core/` or `components/ui/` directory. If using React JSX (non-TS), adjust TypeScript type annotations accordingly.
5. **Spring Physics Tuning**: Tweak `bounce` (0 to 0.3) and `duration` (0.25s to 0.45s) for natural, premium physics.

---

## References

- [Component Primitives Reference](./references/primitives.md) — Complete list of all 30+ core components.
- [Layout Recipes](./references/recipes.md) — Morphing dialogs, animated tab indicators, and cards.
