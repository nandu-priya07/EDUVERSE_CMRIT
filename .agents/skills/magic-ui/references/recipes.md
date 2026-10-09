# Magic UI Recipes & Section Layouts

This guide provides concrete layout recipes using Magic UI components.

---

## Recipe 1: Hero Section with Warp Background & Blur Fade

```jsx
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Background Grid Pattern */}
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.15}
        duration={3}
        repeatDelay={1}
        className="[mask-image:radial-gradient(500px_circle_at_center,white,transparent)] inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
      />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <BlurFade delay={0.25} inView>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-xs font-medium text-sky-400">
            ✨ Next Generation Learning Hub
          </span>
        </BlurFade>

        <BlurFade delay={0.35} inView>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
            Transform Your Campus with <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Intelligence</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.45} inView>
          <p className="max-w-2xl mx-auto text-lg text-slate-300">
            Seamlessly generate educational comics, analyze student engagement, and access automated course workflows.
          </p>
        </BlurFade>

        <BlurFade delay={0.55} inView>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <ShimmerButton className="shadow-2xl">
              <span className="whitespace-pre-wrap text-center text-sm font-semibold leading-none tracking-tight text-white">
                Get Started Free &rarr;
              </span>
            </ShimmerButton>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
```

---

## Recipe 2: Bento Grid Feature Showcase

```jsx
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Marquee } from "@/components/ui/marquee";
import { Sparkles, Video, Bot, BookOpen } from "lucide-react";

const features = [
  {
    Icon: Video,
    name: "Smart Video Analytics",
    description: "Real-time attention scoring and cognitive engagement monitoring.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent" />,
  },
  {
    Icon: Bot,
    name: "AI Comic Generator",
    description: "Convert textbook chapters into visual, illustrated pedagogical narratives.",
    href: "#",
    cta: "Explore comics",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent" />,
  },
  {
    Icon: BookOpen,
    name: "RAG Knowledge Base",
    description: "Instant context-aware syllabus search and lecture Q&A engine.",
    href: "#",
    cta: "Ask question",
    className: "col-span-3 lg:col-span-3",
    background: <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent" />,
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-white">Platform Capabilities</h2>
        <p className="mt-2 text-slate-400">Everything needed to power smart classrooms and dynamic curricula.</p>
      </div>
      <BentoGrid>
        {features.map((feature, idx) => (
          <BentoCard key={idx} {...feature} />
        ))}
      </BentoGrid>
    </section>
  );
}
```
