# React Bits Component Catalog

React Bits is a rich library of animated, interactive, and customizable React components. Source code in this workspace is located at:
`[design-skills/react-bits](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/react-bits)`

The repository provides variations in:
- `src/ts-tailwind/` (TypeScript + Tailwind CSS)
- `src/tailwind/` (JavaScript + Tailwind CSS)
- `src/ts-default/` (TypeScript + Vanilla CSS)
- `src/content/` (JavaScript + Vanilla CSS)

---

## 1. Text Animations (`src/content/TextAnimations/` & `src/tailwind/TextAnimations/`)

| Component | Path | Use Case | Key Props |
| :--- | :--- | :--- | :--- |
| **BlurText** | `TextAnimations/BlurText` | Smooth blur-to-focus reveal on word/letter entry | `text`, `delay`, `animateBy="words"\|"letters"`, `direction="top"\|"bottom"` |
| **SplitText** | `TextAnimations/SplitText` | Staggered character/word spring reveals | `text`, `className`, `delay`, `animationFrom`, `animationTo` |
| **DecryptedText** | `TextAnimations/DecryptedText` | Cyberpunk / matrix decryption scramble effect | `text`, `speed`, `maxIterations`, `characters`, `animateOn="hover"\|"view"` |
| **ShinyText** | `TextAnimations/ShinyText` | Metallic shimmer sweep across text | `text`, `disabled`, `speed`, `className` |
| **GradientText** | `TextAnimations/GradientText` | Flowing animated multi-stop gradient text | `colors`, `animationSpeed`, `showBorder` |
| **TrueFocus** | `TextAnimations/TrueFocus` | Interactive focus frame snapping to active word | `sentence`, `manualMode`, `blurAmount`, `borderColor`, `glowColor` |
| **VariableProximity** | `TextAnimations/VariableProximity` | Variable font weight/width reacting to cursor distance | `label`, `fromFontVariationSettings`, `toFontVariationSettings`, `radius` |
| **RotatingText** | `TextAnimations/RotatingText` | Rotating flip words in headings | `texts`, `transition`, `staggerDuration`, `rotationInterval` |
| **CountUp** | `TextAnimations/CountUp` | Dynamic number increment with easing | `to`, `from`, `duration`, `separator`, `decimals` |
| **GlitchText** | `TextAnimations/GlitchText` | RGB-split glitch artifact effect | `speed`, `enableShadows`, `enableOnHover` |
| **ScrollFloat** | `TextAnimations/ScrollFloat` | Characters float up gracefully on scroll | `scrollContainerRef`, `containerClassName`, `textClassName` |
| **ScrollReveal** | `TextAnimations/ScrollReveal` | Opacity & blur reveal bound to scroll progress | `baseOpacity`, `enableBlur`, `baseRotation` |
| **CircularText** | `TextAnimations/CircularText` | Text rotating around a curved radius | `text`, `spinDuration`, `onHover="speedUp"\|"pause"` |
| **FuzzyText** | `TextAnimations/FuzzyText` | Canvas-based noisy text distortion | `fontSize`, `fontWeight`, `color`, `enableHover` |
| **ASCIIText** | `TextAnimations/ASCIIText` | Retro ASCII art shader transformation | `text`, `asciiFontSize`, `planeBaseHeight` |

---

## 2. Backgrounds (`src/content/Backgrounds/` & `src/tailwind/Backgrounds/`)

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Aurora** | Three.js / Canvas | Organic swirling northern lights shader background |
| **Particles** | Canvas 2D | Interactive particles with connecting proximity web |
| **Beams** | WebGL / Three.js | Volumetric light beams moving across dark backdrop |
| **Hyperspeed** | Three.js / Starfield | High-speed neon warp highway with light trails |
| **Ballpit** | Matter.js 2D Physics | Interactive bouncing spheres reacting to mouse gravity & click |
| **LiquidChrome** | WebGL Shader | Fluid reflective liquid metal distortion |
| **Waves** | Canvas / SVG | Smooth rhythmic sine wave ribbons |
| **Iridescence** | WebGL Shader | Pearlescent rainbow soap-bubble shader |
| **GridDistortion** | WebGL Shader | Interactive ripple grid responding to mouse velocity |
| **DotGrid** | CSS / Canvas | Interactive dot matrix expanding on cursor proximity |
| **DarkVeil** | CSS / Shader | Mysterious subtle smoky dark background |
| **LightRays** | Canvas | God-rays radiating from a focal point |
| **Orb** | Three.js | Floating 3D glowing volumetric orb reacting to cursor |

---

## 3. Cursor & Micro-Interactions (`src/content/Animations/` & `Micro/`)

| Component | Description |
| :--- | :--- |
| **BlobCursor** | Smooth fluid gooey blob following cursor with physics delay |
| **ClickSpark** | Multi-colored sparks exploding outward on click |
| **SplashCursor** | Fluid dynamics smoke/liquid simulation on mouse movement |
| **Magnet** | Magnetic pull effect on buttons, icons, or badges towards cursor |
| **MagnetLines** | Grid of line indicators pointing towards cursor location |
| **StarBorder** | Glowing star-streak tracing around card borders |
| **GlareHover** | 3D holographic glare reflection following cursor over cards |
| **ElasticMesh** | Springy interactive mesh grid |
| **HoldButton** | Long-press action button with radial fill progress |
| **SquishSwitch** | Jelly-like squash and stretch toggle switch |
| **TearTicket** | Perforated ticket with tear animation |

---

## 4. Cards & Components (`src/content/Components/`)

| Component | Description |
| :--- | :--- |
| **SpotlightCard** | Glassmorphism card with radial spotlight tracking cursor |
| **TiltedCard** | 3D parallax card tilting in 3D space with floating caption |
| **MagicBento** | Bento grid with spotlight glow borders and interactive cards |
| **Dock** | macOS style dock with smooth magnification physics |
| **CardSwap** | Stacking card deck with swipe/swap animations |
| **InfiniteMenu** | Radial circular endless rotating carousel menu |
| **FluidGlass** | Refractive glassmorphism surface with dynamic blur |
| **FlowingMenu** | Hovering over menu items displays flowing background imagery |
| **Stack** | Interactive card stack that pops and cycles on drag/click |
| **GooeyNav** | Floating navigation bar with liquid gooey selection indicator |
