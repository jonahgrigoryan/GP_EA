# Ship Apps Guide — Mobile App Design

## App Concept

An educational mobile app that walks users through the complete process of shipping (deploying and publishing) mobile applications. The app is structured as a step-by-step guide with rich content organized into chapters, presented in a clean, modern reading experience optimized for mobile portrait orientation and one-handed usage.

---

## Screen List

1. **Home** — Overview dashboard with a hero section, progress tracker, and chapter list
2. **Chapter Detail** — Full-content reading screen for each shipping topic/chapter
3. **Checklist** — Interactive pre-launch checklist that users can mark off as they go
4. **Bookmarks** — Saved chapters/sections for quick reference

---

## Primary Content and Functionality

### Home Screen
- Hero card with app title and motivational tagline ("Your guide to shipping apps like a pro")
- Progress indicator showing how many chapters the user has read
- Scrollable list of chapter cards, each with:
  - Chapter number and title
  - Brief description (1-2 lines)
  - Read status indicator (unread / in-progress / completed)
  - Estimated read time
- Quick-access button to the Checklist tab

### Chapter Detail Screen
- Full-width header with chapter number and title
- Rich text content with:
  - Section headings
  - Body paragraphs
  - Tip/warning callout boxes
  - Numbered step lists
  - Key term highlights
- "Mark as Read" button at the bottom
- Bookmark toggle in the top-right
- Smooth scroll with a floating "Back to Top" button

### Checklist Screen
- Pre-launch checklist grouped by category (Development, Testing, Store Prep, Submission, Post-Launch)
- Each item is a tappable checkbox with a label and optional note
- Progress bar at the top showing completion percentage
- Persisted locally via AsyncStorage

### Bookmarks Screen
- List of bookmarked chapters
- Tap to navigate directly to the chapter detail
- Swipe or tap to remove bookmark
- Empty state with illustration and prompt

---

## Key User Flows

### Reading Flow
1. User opens app → Home screen with chapter list
2. User taps a chapter card → Chapter Detail screen
3. User reads content, scrolls through sections
4. User taps "Mark as Read" → Chapter marked complete, progress updates on Home
5. User returns to Home → Progress bar updated

### Checklist Flow
1. User taps Checklist tab → Sees grouped checklist items
2. User taps checkbox → Item marked as done, progress bar updates
3. Progress persists across sessions via AsyncStorage

### Bookmark Flow
1. User taps bookmark icon on Chapter Detail → Chapter saved
2. User navigates to Bookmarks tab → Sees saved chapters
3. User taps a bookmark → Navigates to Chapter Detail

---

## Color Choices

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| primary | `#6366F1` (Indigo 500) | `#818CF8` (Indigo 400) | Accent, buttons, progress bars, active states |
| background | `#FFFFFF` | `#0F172A` (Slate 900) | Screen backgrounds |
| surface | `#F8FAFC` (Slate 50) | `#1E293B` (Slate 800) | Cards, elevated surfaces |
| foreground | `#0F172A` (Slate 900) | `#F1F5F9` (Slate 100) | Primary text |
| muted | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Secondary text, descriptions |
| border | `#E2E8F0` (Slate 200) | `#334155` (Slate 700) | Dividers, card borders |
| success | `#22C55E` | `#4ADE80` | Completed states, checkmarks |
| warning | `#F59E0B` | `#FBBF24` | Tips, caution callouts |
| error | `#EF4444` | `#F87171` | Warning callouts |

---

## Typography

- **Title**: 28px bold — Screen titles
- **Heading**: 22px semibold — Section headings within chapters
- **Subheading**: 18px semibold — Card titles, group headers
- **Body**: 16px regular — Reading content, descriptions
- **Caption**: 14px regular — Metadata, timestamps, read times

---

## Tab Bar

| Tab | Icon (SF Symbol) | Label |
|-----|-------------------|-------|
| Home | `house.fill` | Home |
| Checklist | `checklist` | Checklist |
| Bookmarks | `bookmark.fill` | Bookmarks |

---

## Content Chapters

1. **Planning Your App** — Defining scope, target audience, MVP features
2. **Development Workflow** — Version control, branching, code reviews
3. **Testing Strategies** — Unit tests, integration tests, beta testing
4. **App Store Preparation** — Screenshots, descriptions, metadata, icons
5. **iOS App Store Submission** — Certificates, provisioning, App Store Connect
6. **Google Play Submission** — Signing, Play Console, release tracks
7. **CI/CD Pipelines** — Automated builds, EAS Build, Fastlane
8. **Beta Distribution** — TestFlight, Internal Testing, Firebase Distribution
9. **Release Management** — Versioning, staged rollouts, hotfixes
10. **Post-Launch Monitoring** — Crash reporting, analytics, user feedback

---

## Interaction Design

- Chapter cards: opacity feedback on press (0.7)
- Buttons: scale 0.97 + haptic light on press
- Checkbox items: haptic medium on toggle
- Mark as Read: haptic success notification
- Smooth transitions between screens using Expo Router
