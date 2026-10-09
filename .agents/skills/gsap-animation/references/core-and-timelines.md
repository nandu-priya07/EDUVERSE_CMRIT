# GSAP Core & Timelines Reference

GSAP (GreenSock Animation Platform) is the industry standard for high-performance JavaScript animations.

Source code in this workspace is located in:
`[design-skills/gsap/src](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap/src)`

---

## 1. Fundamentals

### Tweens
```javascript
import gsap from 'gsap';

// To: animate from current state to destination
gsap.to('.box', {
  x: 200,
  rotation: 360,
  duration: 1.5,
  ease: 'power3.out',
});

// From: animate from specified values to current state
gsap.from('.header', {
  opacity: 0,
  y: -50,
  duration: 1,
  ease: 'back.out(1.7)',
});

// FromTo: explicit starting and ending parameters
gsap.fromTo('.badge', 
  { scale: 0, opacity: 0 }, 
  { scale: 1, opacity: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' }
);
```

---

## 2. Staggers & Batch Animations

Animate multiple elements sequentially with high performance:

```javascript
gsap.to('.card-item', {
  opacity: 1,
  y: 0,
  duration: 0.6,
  stagger: {
    amount: 0.8,         // Total time distributed across all items
    from: 'start',       // 'start' | 'center' | 'end' | 'edges' | 'random'
    ease: 'power2.inOut',
  },
});
```

---

## 3. Timelines

Timelines allow orchestration of complex sequences without messy delay calculations:

```javascript
const tl = gsap.timeline({
  defaults: { duration: 0.7, ease: 'power2.out' },
  onComplete: () => console.log('Sequence finished'),
});

tl.from('.hero-badge', { y: -20, opacity: 0 })
  .from('.hero-title', { y: 30, opacity: 0 }, '-=0.4') // overlap by 0.4s
  .from('.hero-subtitle', { y: 20, opacity: 0 }, '<0.2') // 0.2s after start of previous
  .from('.hero-cta', { scale: 0.8, opacity: 0, ease: 'back.out(2)' }, '-=0.2')
  .from('.hero-preview', { y: 50, opacity: 0, duration: 1 }, '-=0.3');
```

---

## 4. Key Easing Functions

- **Snappy UI**: `power2.out`, `power3.out`, `expo.out`
- **Playful Bounces & Entrances**: `back.out(1.7)`, `elastic.out(1, 0.4)`
- **Linear / Loops**: `none`
- **Smooth Deceleration**: `circ.out`, `sine.out`
