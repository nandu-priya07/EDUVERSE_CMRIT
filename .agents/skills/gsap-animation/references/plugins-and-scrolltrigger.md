# GSAP Plugins & ScrollTrigger Reference

GSAP includes powerful plugins for scroll-driven animations, layout morphing, and gesture interactions.

Source files:
- ScrollTrigger: `[design-skills/gsap/src/ScrollTrigger.js](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap/src/ScrollTrigger.js)`
- Flip: `[design-skills/gsap/src/Flip.js](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap/src/Flip.js)`
- Observer: `[design-skills/gsap/src/Observer.js](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap/src/Observer.js)`
- Draggable: `[design-skills/gsap/src/Draggable.js](file:///d:/NITHIN/EDUVERSE_CMRIT/design-skills/gsap/src/Draggable.js)`

---

## 1. ScrollTrigger

Registering plugin:
```javascript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
```

### Basic Scroll Trigger
```javascript
gsap.from('.feature-card', {
  scrollTrigger: {
    trigger: '.feature-card',
    start: 'top 80%',     // when the top of trigger hits 80% down the viewport
    end: 'bottom 20%',
    toggleActions: 'play none none reverse', // onEnter, onLeave, onEnterBack, onLeaveBack
  },
  y: 60,
  opacity: 0,
  duration: 0.8,
  ease: 'power2.out',
});
```

### Scrubbing (Direct Scroll Progress Binding)
```javascript
gsap.to('.progress-bar', {
  scrollTrigger: {
    trigger: '#article-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5, // smooth scrubbing with 0.5s catch-up lag
  },
  scaleX: 1,
  transformOrigin: 'left center',
  ease: 'none',
});
```

### Pinning Sections (Horizontal Scroll / Storytelling)
```javascript
const panels = gsap.utils.toArray('.panel');

gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-container',
    pin: true,
    scrub: 1,
    snap: 1 / (panels.length - 1),
    end: () => '+=' + document.querySelector('.horizontal-container').offsetWidth,
  },
});
```

---

## 2. Flip Plugin (State Morphing)

Flip effortlessly transitions elements between DOM positions, sizes, and states with 60fps GPU acceleration:

```javascript
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(Flip);

// 1. Get initial state
const state = Flip.getState('.gallery-item, .caption');

// 2. Make DOM change (e.g. toggle grid/list layout, move element to modal)
container.classList.toggle('grid-mode');

// 3. Animate smoothly from previous state to new layout
Flip.from(state, {
  duration: 0.7,
  ease: 'power3.inOut',
  stagger: 0.05,
  absolute: true, // prevents layout jumps
});
```
