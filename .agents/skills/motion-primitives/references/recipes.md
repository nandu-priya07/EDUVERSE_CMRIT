# Motion Primitives Recipes

Ready-to-use recipes for common UI requirements.

---

## 1. Recipe: Morphing Dialog (Card Expanding to Modal)

Transforms a thumbnail card directly into a detailed modal with continuous layout animations.

```tsx
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogClose,
  MorphingDialogDescription,
  MorphingDialogContainer,
} from '@/components/core/morphing-dialog';
import { XIcon } from 'lucide-react';

export function CourseCardMorph({ course }) {
  return (
    <MorphingDialog
      transition={{
        type: 'spring',
        bounce: 0.05,
        duration: 0.35,
      }}
    >
      <MorphingDialogTrigger className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-3 hover:border-sky-500/50 transition-colors">
        <MorphingDialogImage
          src={course.image}
          alt={course.title}
          className="h-48 w-full rounded-xl object-cover"
        />
        <div className="p-3 text-left">
          <MorphingDialogTitle className="text-lg font-semibold text-white">
            {course.title}
          </MorphingDialogTitle>
          <MorphingDialogSubtitle className="text-sm text-slate-400">
            {course.instructor}
          </MorphingDialogSubtitle>
        </div>
      </MorphingDialogTrigger>

      <MorphingDialogContainer>
        <MorphingDialogContent className="relative max-w-2xl rounded-3xl border border-white/15 bg-slate-950 p-6 shadow-2xl">
          <MorphingDialogClose className="absolute top-4 right-4 rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700">
            <XIcon className="h-4 w-4" />
          </MorphingDialogClose>
          <MorphingDialogImage
            src={course.image}
            alt={course.title}
            className="h-64 w-full rounded-2xl object-cover"
          />
          <div className="mt-4 space-y-3">
            <MorphingDialogTitle className="text-2xl font-bold text-white">
              {course.title}
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="text-sm font-medium text-sky-400">
              {course.instructor} • {course.duration}
            </MorphingDialogSubtitle>
            <MorphingDialogDescription className="text-slate-300 leading-relaxed">
              {course.description}
            </MorphingDialogDescription>
          </div>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
```

---

## 2. Recipe: Animated Tab Background Pill

A fluid active pill indicator that glides under nav tabs.

```tsx
import { useState } from 'react';
import { AnimatedBackground } from '@/components/core/animated-background';

const TABS = ['Overview', 'Modules', 'Assignments', 'Analytics', 'Discussions'];

export function AnimatedTabs() {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div className="flex space-x-1 rounded-2xl bg-slate-900/80 p-1.5 border border-white/10 backdrop-blur-md">
      <AnimatedBackground
        defaultValue={activeTab}
        className="rounded-xl bg-sky-500/20 border border-sky-500/30"
        transition={{
          type: 'spring',
          bounce: 0.2,
          duration: 0.3,
        }}
        enableHover
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            data-id={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-sky-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </AnimatedBackground>
    </div>
  );
}
```
