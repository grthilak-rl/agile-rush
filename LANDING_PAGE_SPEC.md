# AgileRush — Landing Page Specification

---

## 0. Landing Page (/)

The landing page is the public-facing marketing page. It is the first thing anyone sees. It must be bold, energetic, and conversion-focused.

### 0.1 Design Direction

- **Typography:** Sora (800/700) for headings + Inter (400/500/600) for body. Load from Google Fonts.
- **Tone:** Bold, energetic, confident — not corporate. Think Linear meets Monday.com.
- **Animations:** Staggered fade-up on page load, floating gradient blobs in background, gradient text animation on hero heading, hover effects on all interactive elements.
- **Color:** Use the full AgileRush palette — hero has a multi-color gradient background (blue → purple → orange), dark sections (#0F172A), white sections, light gray sections (#F8FAFC).

### 0.2 Page Structure (Scrollable Sections)

**Navbar (fixed, transparent → white on scroll)**
```
[Logo: AgileRush] ........... [Features] [How It Works] [Pricing] [About] ... [Log In] [Get Started Free (blue button)]

Behavior:
- Transparent background at top of page
- On scroll > 50px → white background + blur backdrop + bottom border
- Smooth transition (300ms)
- Logo click → scroll to top
- Nav links → smooth scroll to section anchors
- "Log In" → /login
- "Get Started Free" → /register
```

**Hero Section (full viewport height)**
```
Background: Multi-color gradient (F8FAFC → EFF6FF → F5F3FF → FFF7ED) with floating blurred circles

[NEW badge] "Scrum done right. Finally."

# Ship Faster.
# Sprint Smarter.  ← gradient animated text (blue → purple → orange)

The agile project management tool that's fast, focused, and free of bloat.
Backlog, sprints, boards, and retros — everything your team needs, nothing it doesn't.

[Email input] [Start Free → button]
"Free forever for solo users. No credit card required."

[App preview in dark browser mockup frame]
  - Shows a mini sprint board with 4 columns
  - Real-looking task titles
  - Browser chrome with traffic light dots + URL bar showing "app.agilerush.com"
  - Drop shadow for depth
```

**Email capture behavior:**
```
User enters email → clicks "Start Free"
→ Navigate to /register?email={entered_email}
→ Email field pre-filled on registration page
```

**Features Section (white background)**
```
Section label: "FEATURES" (blue, uppercase, spaced)
Heading: "Everything you need. Nothing you don't."
Subheading: "Built for developers and product teams who want to move fast without fighting their tools."

6 feature cards in 3x2 grid:
| Feature | Icon | Color |
|---|---|---|
| Product Backlog | 📋 | Blue |
| Sprint Board | 🏃 | Purple |
| Sprint Planning | 📅 | Orange |
| Retrospectives | 🔄 | Green |
| Reports & Analytics | 📈 | Rose |
| Lightning Fast | ⚡ | Yellow |

Each card: icon in colored container + title + description
Hover: card gets colored background tint + colored border
```

**How It Works Section (dark background #0F172A)**
```
Section label: "HOW IT WORKS" (light blue, uppercase)
Heading: "From zero to shipping in four steps"

4 step cards in a row with arrows between them:
01 → Create a Project (blue)
02 → Build Your Backlog (purple)
03 → Plan & Sprint (orange)
04 → Ship & Reflect (green)

Each card: large faded step number + title + description
Dark semi-transparent card background with subtle border
Floating gradient blobs in background for atmosphere
```

**Testimonials Section (light gray #F8FAFC)**
```
Section label: "TESTIMONIALS" (purple, uppercase)
Heading: "Loved by teams who ship fast"

3 testimonial cards:
- 5 star rating
- Quote text (italic)
- Avatar (colored circle with initials) + name + role/company

Cards: white background, subtle border, minimal shadow
```

**Pricing Section (white background)**
```
Section label: "PRICING" (orange, uppercase)
Heading: "Start free. Scale when ready."

3 pricing tiers side by side:

FREE ($0/forever)
- 2 projects
- Unlimited backlog items
- Sprint board
- Basic reports
[Get Started] button (outlined)

PRO ($8/user/mo) ← "MOST POPULAR" badge, scaled up 1.05x, blue border, shadow
- Unlimited projects
- Team collaboration
- Sprint retrospectives
- Advanced reports
- Priority support
[Start Free Trial] button (blue gradient, filled)

ENTERPRISE (Custom)
- Everything in Pro
- SSO & SAML
- Audit logs
- Custom integrations
- Dedicated support
[Contact Sales] button (outlined)
```

**Final CTA Section (dark background)**
```
Heading: "Ready to ship faster?"
Subheading: "Join thousands of teams who've ditched bloated tools for something that actually works."
[Get Started Free →] large blue button
"No credit card required · Free forever for solo users"
Floating blurred gradient circles for atmosphere
```

**Footer (dark #0F172A)**
```
4-column layout:

Column 1: Logo + tagline
Column 2: Product — Features, Pricing, Changelog, Roadmap
Column 3: Resources — Documentation, Blog, Support, API
Column 4: Company — About, Careers, Contact, Privacy

Bottom bar: "© 2026 AgileRush. All rights reserved." ... "Built by Rajthilak"
```

### 0.3 Responsive Behavior

```
Desktop (>1024px): Full layout as described
Tablet (768-1024px):
  - Features grid: 2 columns
  - How It Works: 2x2 grid (no arrows)
  - Pricing: stack vertically, Pro card on top
  - Footer: 2x2 grid

Mobile (<768px):
  - Navbar: hamburger menu → slide-down nav
  - Hero heading: 42px font size
  - Features: single column
  - Steps: single column, vertical timeline
  - Testimonials: horizontal scroll
  - Pricing: single column stack
  - Footer: single column
```

### 0.4 Routes

```
/ → Landing page (public, no auth required)
/login → Login page
/register → Registration page (accepts ?email= query param)
/dashboard → Redirects to login if not authenticated
```

### 0.5 Performance

- Lazy load sections below the fold
- Hero animations use CSS only (no JS animation library needed)
- Images: use CSS-rendered app preview (no actual screenshots)
- Font loading: display=swap to prevent FOIT