# SprintFlow — Design System

## Brand Identity

**Name:** SprintFlow
**Tagline:** "Ship faster. Together."
**Personality:** Bold, energetic, confident, approachable

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|---|---|---|
| Electric Blue | `#2563EB` | Primary actions, active states, links |
| Sunset Orange | `#F97316` | Accents, highlights, sprint indicators |
| Vivid Purple | `#8B5CF6` | Secondary actions, tags, badges |
| Emerald Green | `#10B981` | Success states, "Done" status |
| Rose Pink | `#F43F5E` | Destructive actions, critical priority, bugs |

### Neutral Colors
| Name | Hex | Usage |
|---|---|---|
| Slate 900 | `#0F172A` | Sidebar background, primary text |
| Slate 700 | `#334155` | Secondary text, borders |
| Slate 400 | `#94A3B8` | Placeholder text, disabled states |
| Slate 100 | `#F1F5F9` | Page background, card hover |
| White | `#FFFFFF` | Cards, panels, inputs |

### Status Colors (Sprint Board)
| Status | Color | Hex |
|---|---|---|
| To Do | Slate Blue | `#6366F1` |
| In Progress | Electric Blue | `#2563EB` |
| In Review | Amber | `#F59E0B` |
| Done | Emerald | `#10B981` |

### Priority Colors
| Priority | Color | Hex |
|---|---|---|
| Critical | Red | `#EF4444` |
| High | Orange | `#F97316` |
| Medium | Yellow | `#EAB308` |
| Low | Blue | `#3B82F6` |

### Backlog Item Type Colors
| Type | Color | Hex |
|---|---|---|
| Story | Blue | `#3B82F6` |
| Task | Purple | `#8B5CF6` |
| Bug | Rose | `#F43F5E` |

---

## Typography

**Font Family:** Inter (user-selected)
- Display headers paired with semi-bold/bold weights for energy
- Clean body text with regular weight

| Element | Size | Weight | Line Height |
|---|---|---|---|
| Page Title (H1) | 28px | Bold (700) | 36px |
| Section Title (H2) | 22px | Semi-bold (600) | 30px |
| Card Title (H3) | 16px | Semi-bold (600) | 24px |
| Body | 14px | Regular (400) | 22px |
| Small / Caption | 12px | Medium (500) | 18px |
| Badge / Tag | 11px | Semi-bold (600) | 16px |

---

## Spacing System

Base unit: 4px

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Tight gaps, badge padding |
| sm | 8px | Icon gaps, compact spacing |
| md | 12px | Card padding, list gaps |
| lg | 16px | Section gaps, input padding |
| xl | 24px | Card padding, major gaps |
| 2xl | 32px | Section margins |
| 3xl | 48px | Page-level spacing |

---

## Layout

### Sidebar (Collapsible)
- **Expanded width:** 260px
- **Collapsed width:** 64px (icon only)
- **Background:** Slate 900 (`#0F172A`)
- **Active item:** Electric Blue with left border accent
- **Hover:** Subtle white overlay (8% opacity)
- **Transition:** 200ms ease-in-out

### Main Content Area
- **Background:** Slate 100 (`#F1F5F9`)
- **Max content width:** 1400px (centered)
- **Padding:** 24px on desktop, 16px on mobile

### Cards
- **Background:** White
- **Border radius:** 12px
- **Shadow:** `0 1px 3px rgba(0,0,0,0.08)`
- **Hover shadow:** `0 4px 12px rgba(0,0,0,0.12)`
- **Padding:** 20px

---

## Components

### Buttons
| Variant | Background | Text | Border |
|---|---|---|---|
| Primary | Electric Blue | White | None |
| Secondary | White | Slate 700 | Slate 300 |
| Danger | Rose Pink | White | None |
| Ghost | Transparent | Slate 600 | None |

- Border radius: 8px
- Padding: 8px 16px (sm), 10px 20px (md), 12px 24px (lg)
- Hover: Slightly darker (darken 10%)
- Active: Scale 0.98
- Transition: 150ms all

### Tags / Badges
- Pill-shaped (border-radius: 999px)
- Colored background at 15% opacity + full color text
- Padding: 2px 10px
- Font: 11px semi-bold, uppercase

### Sprint Board Cards (Drag & Drop)
- White background with left color border (4px) matching priority
- Show: title, story points (circle badge), type icon, assignee avatar
- Hover: Lift with shadow
- Dragging: Slight rotation (2deg), elevated shadow, reduced opacity (0.9)

### Progress Bars
- Track: Slate 200 with rounded ends
- Fill: Gradient from Electric Blue to Vivid Purple
- Height: 8px
- Animated fill on load

### Avatars
- Circular, 32px default
- Colorful background with white initials when no image
- Overlap in groups (stack with -8px margin)

---

## Iconography

Use **Lucide React** icons throughout.
- Size: 18px default, 16px in compact areas, 20px in headers
- Stroke width: 1.75px
- Color: Inherit from text color

---

## Motion & Animations

- **Page transitions:** Fade in + slide up (200ms)
- **Card hover:** translateY(-2px) + shadow increase (150ms)
- **Sidebar toggle:** Width transition (200ms ease-in-out)
- **Drag & drop:** Smooth reorder with spring animation
- **Progress bars:** Width animation on mount (600ms ease-out)
- **Modals/Panels:** Slide in from right (250ms) with backdrop fade
- **Skeleton loaders:** Pulse animation while loading

---

## Responsive Breakpoints

| Breakpoint | Width | Sidebar behavior |
|---|---|---|
| Desktop | > 1024px | Expanded by default |
| Tablet | 768-1024px | Collapsed by default |
| Mobile | < 768px | Hidden, hamburger toggle |

---

## Dark Mode (Future)

- Sidebar: Stays dark (already dark)
- Background: Slate 900
- Cards: Slate 800
- Text: Slate 100
- Accent colors: Stay the same (already vibrant)

---

## Accessibility

- All interactive elements: visible focus ring (2px Electric Blue outline, 2px offset)
- Color contrast: All text meets WCAG AA minimum (4.5:1)
- Drag & drop: Keyboard accessible with arrow keys
- Screen reader: ARIA labels on all icons and interactive elements
- Reduced motion: Respect prefers-reduced-motion media query