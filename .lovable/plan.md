

# Plan: Add "Go Back to Home" Button

## Summary
Add a button to the plan viewer header that clears the loaded plan and returns to the initial upload screen. This provides a simple way to start fresh without reloading the page.

---

## Implementation

### File to Modify
`src/components/viewer/InteractiveViewer.tsx`

### Changes

1. **Import the Home or ArrowLeft icon** from lucide-react
2. **Add a handler function** to clear the session plan:
   ```
   const handleClosePlan = useCallback(() => {
     setSessionPlan(null);
     setSelectedBeamIndex(0);
     setCurrentCPIndex(0);
     setIsPlaying(false);
   }, []);
   ```
3. **Add a "Back to Home" button** in the header, next to the Help button:
   - Use a ghost button with an icon (Home or ArrowLeft)
   - Add tooltip for clarity
   - Position it before the Help button in the header actions area

### UI Location
The button will be placed in the header's action area (right side), appearing as:
```
[Back to Home] [Help] [Upload New Plan zone]
```

### Visual Design
- Ghost button style (matches Help button)
- Home icon with "Back to Home" tooltip
- Consistent sizing with other header buttons

---

## Technical Details

### Code Changes (lines 202-211)
Add the new button before the Help button:
```tsx
<Button 
  variant="ghost" 
  size="icon" 
  onClick={handleClosePlan}
  title="Back to Home"
>
  <Home className="h-5 w-5" />
</Button>
```

### Updated Import (line 25)
```tsx
import { HelpCircle, ChevronDown, Home } from 'lucide-react';
```

---

## Summary
- Single file change: `src/components/viewer/InteractiveViewer.tsx`
- Adds one new callback function
- Adds one button to the header
- Updates imports to include the Home icon

