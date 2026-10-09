# GSAP in React & `@gsap/react`

Best practices for safely using GSAP in modern React applications (React 18 / 19, Next.js, Vite).

---

## 1. Installing GSAP for React

```bash
npm install gsap @gsap/react
```

---

## 2. Using the `useGSAP` Hook

The `@gsap/react` hook handles automatic animation scoping, cleanup, and cancellation when components unmount or re-render (essential for React StrictMode).

```jsx
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HeroBanner() {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      // All selectors are scoped to containerRef.current
      gsap.from('.hero-badge', { opacity: 0, y: -20, duration: 0.6 });
      gsap.from('.hero-title', { opacity: 0, y: 30, duration: 0.8, delay: 0.2 });
      gsap.from('.hero-card', {
        opacity: 0,
        scale: 0.9,
        stagger: 0.15,
        delay: 0.4,
        ease: 'back.out(1.5)',
      });
    },
    { scope: containerRef } // Scoping prevents targeting classes outside this component
  );

  return (
    <div ref={containerRef} className="hero-section">
      <span className="hero-badge">Welcome</span>
      <h1 className="hero-title">Experience EDUVERSE</h1>
      <div className="grid">
        <div className="hero-card">Card 1</div>
        <div className="hero-card">Card 2</div>
      </div>
    </div>
  );
}
```

---

## 3. Handling React State Changes

Pass dependencies into `useGSAP` just like `useEffect`:

```jsx
useGSAP(
  () => {
    gsap.to('.counter-fill', { width: `${progress}%`, duration: 0.5 });
  },
  { dependencies: [progress], scope: containerRef }
);
```

---

## 4. Responsive Animations with `mm.add()`

Use `gsap.matchMedia()` inside `useGSAP` to effortlessly switch animation properties across desktop and mobile screens:

```jsx
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', () => {
    // Desktop animation: horizontal slide
    gsap.to('.panel', { x: 500, duration: 1 });
  });

  mm.add('(max-width: 767px)', () => {
    // Mobile animation: vertical fade
    gsap.to('.panel', { y: 200, duration: 1 });
  });
}, { scope: containerRef });
```
