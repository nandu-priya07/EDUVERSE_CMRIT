---
name: magic-ui
description: >-
  Use this skill when designing or implementing animated landing page components, Bento grids,
  marquees, interactive button styles, particle backgrounds, and dock navigations with Magic UI and Tailwind CSS.
---

# Magic UI Design Skill

Magic UI is a modern component library built for design engineers with React, TypeScript, Tailwind CSS, and Framer Motion.

Source code in this workspace is located in:
`[design-skills/magicui](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/magicui)`
Direct component source files:
`[design-skills/magicui/apps/www/registry/magicui](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/magicui/apps/www/registry/magicui)`

---

## When to Apply

Apply this skill when:
- Building high-converting landing pages and SaaS product sections.
- Implementing animated layout containers: `bento-grid`, `dock`, `marquee`, `terminal`.
- Enhancing interactive call-to-actions: `shimmer-button`, `shiny-button`, `rainbow-button`, `interactive-hover-button`.
- Adding ambient background grids: `animated-grid-pattern`, `retro-grid`, `dot-pattern`, `warp-background`, `particles`.
- Adding animated text reveals: `blur-fade`, `text-animate`, `word-rotate`, `sparkles-text`, `typing-animation`.

---

## Two Integration Modes

### Mode A: Direct Source Copy (Fastest for Vite / React)
Simply view and copy the raw component from:
`[design-skills/magicui/apps/www/registry/magicui/<component-slug>.tsx](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/magicui/apps/www/registry/magicui)`
into your project's `src/components/ui/<component-slug>.jsx` or `.tsx`.

Ensure standard dependencies are installed:
```bash
npm install clsx tailwind-merge framer-motion
```

### Mode B: shadcn CLI
If the project has shadcn initialized:
```bash
npx shadcn@latest add @magicui/<component-slug>
```

---

## Component Selection Guidelines

- **Social Proof / Reviews**: `marquee`, `avatar-circles`, `tweet-card`
- **Hero Sections**: `warp-background`, `globe`, `blur-fade`, `animated-grid-pattern`
- **Action Buttons**: `shiny-button`, `shimmer-button`, `rainbow-button`, `pulsating-button`
- **Feature Grids**: `bento-grid`, `magic-card`, `border-beam`, `shine-border`
- **Data & Metrics**: `number-ticker`, `animated-circular-progress-bar`

---

## References

- [Component Reference](./references/components.md) — Categorized index and install shapes.
- [Section Recipes](./references/recipes.md) — Complete hero, trust rail, and Bento grid recipes.
