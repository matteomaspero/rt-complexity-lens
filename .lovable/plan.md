

# Plan: Improve Navigation in Help/Documentation Page

## Summary
Add a sticky table of contents (TOC) sidebar that allows users to quickly jump to any section of the documentation. Include smooth scrolling, active section highlighting, and a mobile-friendly collapsible version.

---

## Current State

The Help page is a single long-scrolling page with **8 sections**:
1. Introduction
2. Metrics Reference
3. IEC 61217 Coordinate System
4. How to Use
5. CSV Export Format
6. References & Citations
7. Technical Resources (within References)
8. About

**Problems:**
- No way to see all available sections at a glance
- Long scrolling required to reach later sections
- No indication of current position in the document
- Metrics Reference section is particularly long with multiple categories

---

## Implementation

### Navigation Approach
Add a **sticky sidebar TOC** on the left side for desktop, with a collapsible mobile version at the top.

### Section IDs
Add anchor IDs to each section for scroll-to functionality:
- `introduction`
- `metrics-reference`
- `coordinate-system`
- `how-to-use`
- `export-format`
- `references`
- `about`

### Layout Structure
```text
Desktop (lg+):
┌─────────────────────────────────────────────────┐
│ Header (Back button + Title)                     │
├──────────────┬──────────────────────────────────┤
│   TOC        │                                  │
│   (sticky)   │   Content Cards                  │
│              │                                  │
│ • Intro      │   [Introduction Card]            │
│ • Metrics    │   [Metrics Reference Card]       │
│ • Coords     │   [Coordinate System Card]       │
│ • How to Use │   ...                            │
│ • Export     │                                  │
│ • References │                                  │
│ • About      │                                  │
└──────────────┴──────────────────────────────────┘

Mobile:
┌───────────────────────────┐
│ Header                    │
├───────────────────────────┤
│ [TOC Dropdown - Optional] │
├───────────────────────────┤
│ Content Cards             │
│ ...                       │
└───────────────────────────┘
```

---

## Technical Details

### File to Modify
`src/pages/Help.tsx`

### Changes

#### 1. Define sections array with IDs and labels
```typescript
const sections = [
  { id: 'introduction', label: 'Introduction', icon: BookOpen },
  { id: 'metrics-reference', label: 'Metrics Reference', icon: Calculator },
  { id: 'coordinate-system', label: 'Coordinate System', icon: Compass },
  { id: 'how-to-use', label: 'How to Use', icon: Upload },
  { id: 'export-format', label: 'CSV Export Format', icon: Download },
  { id: 'references', label: 'References', icon: FileText },
  { id: 'about', label: 'About', icon: Info },
];
```

#### 2. Add smooth scroll function
```typescript
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
```

#### 3. Track active section with Intersection Observer
```typescript
const [activeSection, setActiveSection] = useState('introduction');

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    { rootMargin: '-20% 0px -80% 0px' }
  );

  sections.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, []);
```

#### 4. Add ID attributes to each Card section
```tsx
<Card id="introduction">
<Card id="metrics-reference">
<Card id="coordinate-system">
// etc.
```

#### 5. Create sticky TOC sidebar component
```tsx
<aside className="hidden lg:block sticky top-24 self-start w-48 shrink-0">
  <nav className="space-y-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
      On this page
    </p>
    {sections.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => scrollToSection(id)}
        className={cn(
          "flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
          activeSection === id 
            ? "bg-muted text-foreground font-medium" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    ))}
  </nav>
</aside>
```

#### 6. Update layout to flex container
```tsx
<div className="flex gap-8">
  {/* Sticky TOC sidebar */}
  <aside>...</aside>

  {/* Main content */}
  <div className="flex-1 space-y-8 max-w-4xl">
    {/* All the Card sections */}
  </div>
</div>
```

#### 7. Add mobile collapsible TOC (optional enhancement)
Use the existing Collapsible component for mobile:
```tsx
<div className="lg:hidden mb-6">
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="outline" className="w-full justify-between">
        Jump to section
        <ChevronDown className="h-4 w-4" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-2 space-y-1">
      {sections.map(...)}
    </CollapsibleContent>
  </Collapsible>
</div>
```

---

## New Imports Required

```typescript
import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Info, FileText, Compass, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
```

---

## Additional Improvements

1. **Fix missing categories**: Update `categories` array to include `'accuracy'` and `'deliverability'`
2. **Add sub-navigation for Metrics Reference**: Show metric category links as nested items
3. **Back-to-top button**: Add a floating button that appears when scrolled down

---

## Summary

| Change | Description |
|--------|-------------|
| Add section IDs | Each Card gets an id attribute for anchor linking |
| Sticky sidebar TOC | Desktop navigation with active section highlighting |
| Mobile dropdown TOC | Collapsible section jumper for mobile |
| Intersection Observer | Track visible section and highlight in TOC |
| Fix metric categories | Add missing 'accuracy' and 'deliverability' categories |

