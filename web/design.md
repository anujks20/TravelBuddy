# Summary

A minimalist, high-end cinematic hero design featuring Instrument Serif typography, a deep navy-and-white color palette, and fluid entrance animations over a full-bleed video background.

# Style

The style is 'Minimalist Editorial'. It pairs the elegant, high-contrast 'Instrument Serif' for headings with the functional 'Inter' for body and navigation. The color scheme revolves around a deep navy foreground (#0f172a) and black components (#000000) set against immersive backgrounds. Animations are reserved for entrance states using a 'fade-and-rise' transition to create a sense of unfolding luxury.

## Spec

Create a design with an 'Editorial Cinematic' aesthetic. 

### Video link
https://designerstephen.github.io/public-assets/videos/serene-art-hero.mp4

### Typography
- **Display Font:** 'Instrument Serif', serif. Use font-weight: 400. For H1, use font-size: 80px (mobile 48px), line-height: 0.95, and tight letter-spacing: -2.46px.
- **Body Font:** 'Inter', sans-serif. Use font-weight: 400 for copy and 500 for UI elements. Size: 18px for sub-headers, 14px for navigation/buttons.

### Color Palette
- **Primary Text:** #0f172a (Deep Slate/Navy)
- **Muted Text:** HSL(215, 25%, 32%)
- **Primary Actions:** #000000 (Black) background with #ffffff (White) text.
- **Background Basis:** HSL(201, 100%, 13%) for loading/fallback.

### Animations & Micro-interactions
- **Entrance:** Apply a 'fade-rise' keyframe (from {opacity: 0, transform: translateY(24px)} to {opacity: 1, transform: translateY(0)}) with a duration of 0.8s and ease-out timing.
- **Delays:** Stagger elements by 200ms increments (0.2s for subtext, 0.4s for CTA buttons).
- **Hover States:** Buttons should use a subtle scale-up transform (scale: 1.03) with a transition duration of 0.3s.

# Layout & Structure

The layout follows a centered hero hierarchy with a three-column distributed navigation bar. Content is layered over a full-width background video.

## Navigation Bar

A 3-column grid container (Max-width: 1280px, px: 32px, py: 24px). 
- Left Col: Brand logo using 'Instrument Serif' at 30px size with a registered trademark symbol in superscript.
- Center Col: Hidden on mobile. Horizontal flex list of 4 links using 'Inter' 14px Medium, spacing: 40px.
- Right Col: Pill-shaped CTA button ('Find my dream') in solid black with white text.

## Hero Section

Full-screen flex container (min-h-screen) with a background video layer. 
- Content Area: Centered vertically and horizontally. Max-width: 1280px.
- Heading: 'Instrument Serif' H1, 80px size, negative tracking. Use <em> tags for stylistic emphasis (non-italic variant).
- Paragraph: Max-width 670px, centered. Line-height: 1.625. Color: HSL(215, 25%, 32%).
- Main CTA: Large pill-shaped button (padding: 20px 56px) with 16px Medium font weight, placed 48px below text.

# Special Components

## Pill Action Button

A high-contrast, rounded-full button used for primary conversions.

Style a button with 'border-radius: 9999px', 'background-color: #000000', and 'color: #ffffff'. Use 'padding: 10px 24px' for small versions and '20px 56px' for hero versions. On hover, trigger a 'transform: scale(1.03)' with an 'ease-in-out' transition of 200ms.

## Staggered Entrance Container

Sequential loading animation for the landing page hero content.

Group hero elements (H1, P, Button) into a sequence. H1 triggers at 0s, P triggers at 0.2s, and Button triggers at 0.4s. All use a 24px upward slide combined with an opacity fade-in over 0.8 seconds.

# Special Notes

Text must be perfectly legible against the background video; if the video is bright, apply a subtle dark overlay (alpha 0.2). MUST maintain the -2.46px letter-spacing on the H1 to achieve the high-fashion editorial look.