# React Bits Integration Recipes

This document outlines how to copy and integrate React Bits components into your React project.

---

## 1. Project Prerequisites

Most React Bits components use:
- React 18 / 19
- `framer-motion` (for spring physics and gesture handling)
- `@react-spring/web` (for select spring physics components)
- `three` (for WebGL / Three.js 3D background shaders)
- Optional: Lucide React icons, Tailwind CSS

Check dependencies before copying:
```bash
npm install framer-motion clsx tailwind-merge
# If using Three.js backgrounds (Aurora, Beams, Hyperspeed, Orb):
npm install three
```

---

## 2. Recipe: BlurText Headline

**Source**: `design-skills/react-bits/src/content/TextAnimations/BlurText/BlurText.jsx`

```jsx
import { useRef, useEffect, useState } from 'react';
import { useSprings, animated } from '@react-spring/web';

export const BlurText = ({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words', // 'words' | 'letters'
  direction = 'top',   // 'top' | 'bottom'
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing = 'easeOutCubic',
  onAnimationComplete,
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom =
    direction === 'top'
      ? { filter: 'blur(10px)', opacity: 0, transform: 'translate3d(0,-50px,0)' }
      : { filter: 'blur(10px)', opacity: 0, transform: 'translate3d(0,50px,0)' };

  const defaultTo = [
    {
      filter: 'blur(5px)',
      opacity: 0.5,
      transform: direction === 'top' ? 'translate3d(0,5px,0)' : 'translate3d(0,-5px,0)',
    },
    { filter: 'blur(0px)', opacity: 1, transform: 'translate3d(0,0px,0)' },
  ];

  const springs = useSprings(
    elements.length,
    elements.map((_, i) => ({
      from: animationFrom || defaultFrom,
      to: inView
        ? async (next) => {
            for (const step of animationTo || defaultTo) {
              await next(step);
            }
            if (i === elements.length - 1 && onAnimationComplete) {
              onAnimationComplete();
            }
          }
        : animationFrom || defaultFrom,
      delay: i * delay,
      config: { easing },
    }))
  );

  return (
    <p ref={ref} className={`blur-text ${className} flex flex-wrap`}>
      {springs.map((props, index) => (
        <animated.span
          key={index}
          style={props}
          className="inline-block transition-transform will-change-[transform,filter,opacity]"
        >
          {elements[index] === ' ' ? '\u00A0' : elements[index]}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </animated.span>
      ))}
    </p>
  );
};
```

---

## 3. Recipe: SpotlightCard (Interactive Glassmorphism)

**Source**: `design-skills/react-bits/src/content/Components/SpotlightCard/SpotlightCard.jsx`

```jsx
import { useRef, useState } from 'react';

export const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.15)',
}) => {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
```

---

## 4. Recipe: Magnet Button / Badge

**Source**: `design-skills/react-bits/src/content/Animations/Magnet/Magnet.jsx`

```jsx
import { useState, useEffect, useRef } from 'react';

export const Magnet = ({
  children,
  padding = 100,
  disabled = false,
  magnetStrength = 2,
  activeTransition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
  inactiveTransition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
  wrapperClassName = '',
  innerClassName = '',
  ...props
}) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const magnetRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      setPosition({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (e) => {
      if (!magnetRef.current) return;
      const { left, top, width, height } = magnetRef.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const distX = Math.abs(centerX - e.clientX);
      const distY = Math.abs(centerY - e.clientY);

      if (distX < width / 2 + padding && distY < height / 2 + padding) {
        setIsActive(true);
        const offsetX = (e.clientX - centerX) / magnetStrength;
        const offsetY = (e.clientY - centerY) / magnetStrength;
        setPosition({ x: offsetX, y: offsetY });
      } else {
        setIsActive(false);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [padding, disabled, magnetStrength]);

  const transition = isActive ? activeTransition : inactiveTransition;

  return (
    <div
      ref={magnetRef}
      className={wrapperClassName}
      style={{ position: 'relative', display: 'inline-block' }}
      {...props}
    >
      <div
        className={innerClassName}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
```
