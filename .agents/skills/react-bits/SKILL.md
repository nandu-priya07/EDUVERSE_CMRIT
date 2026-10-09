---
name: react-bits
description: >-
  Use this skill when designing or implementing animated React UI components, text animations,
  canvas/WebGL background effects, custom cursors, magnetic physics, and interactive cards from React Bits.
---

# React Bits Design Skill

React Bits is an extensive open-source collection of animated, interactive, and customizable React components.

Source code in this workspace is located in:
`[design-skills/react-bits](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits)`

---

## When to Apply

Use this skill when:
- Creating headline animations (BlurText, SplitText, DecryptedText, ShinyText, VariableProximity, TrueFocus).
- Adding background atmospheres (Aurora, Beams, Hyperspeed, Particles, Ballpit, LiquidChrome, Waves).
- Enhancing interactivity with micro-interactions (BlobCursor, ClickSpark, SplashCursor, Magnet).
- Building modern cards, docks, and galleries (SpotlightCard, TiltedCard, MagicBento, Dock, CardSwap).

---

## Directory Mapping in Local Repo

- **Text Animations**: `[design-skills/react-bits/src/content/TextAnimations](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/content/TextAnimations)`
- **Backgrounds**: `[design-skills/react-bits/src/content/Backgrounds](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/content/Backgrounds)`
- **Interactive Animations**: `[design-skills/react-bits/src/content/Animations](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/content/Animations)`
- **Micro Interactions**: `[design-skills/react-bits/src/content/Micro](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/content/Micro)`
- **Components & Cards**: `[design-skills/react-bits/src/content/Components](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/content/Components)`
- **Tailwind Variants**: `[design-skills/react-bits/src/tailwind](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/tailwind)`
- **TypeScript Variants**: `[design-skills/react-bits/src/ts-tailwind](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits/src/ts-tailwind)`

---

## Core Workflow

1. **Select Component**: Check the component catalog in `[catalog.md](./references/catalog.md)`.
2. **Inspect Source**: View the source file in `design-skills/react-bits/src/content/<Category>/<Name>/<Name>.jsx` (or `ts-tailwind`).
3. **Verify Dependencies**:
   - Spring physics: `@react-spring/web` or `framer-motion`
   - 3D/Shaders: `three`
   - Utilities: `clsx`, `tailwind-merge`
4. **Integrate**: Copy or adapt the component into your project's `components/ui/` folder.
5. **Tune Aesthetics**: Ensure proper contrast, smooth framerates (`will-change`), and responsive fallbacks for touch/mobile devices.

---

## References

- [Component Catalog](./references/catalog.md) — Comprehensive table of all 100+ components, animations, and backgrounds.
- [Integration Recipes](./references/recipes.md) — Ready-to-use recipes for BlurText, SpotlightCard, and Magnet buttons.
