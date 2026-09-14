# GeoClass Design System
> **Scientific Mapping Workstation Specification**  
> *Cartographic · Scientific · Editorial · Precise · Quiet · Professional*

---

## 00. Core Philosophy

GeoClass is designed as a **scientific mapping workstation**, not an AI dashboard or consumer SaaS tool. The visual language takes inspiration from geological surveys, cartographic publishing, field instrumentation, and remote sensing laboratories.

```
       ▲  Scientific, Cartographic, Editorial
      / \
     /   \  Precise & Quiet (No neon, No glassmorphism)
    /  ▲  \
   /  / \  \  Terracotta Accent (#C96B3C) + Warm Paper (#FAF9F5)
  /__/___\__\
```

### The 5 Foundational Rules

1. **Map First**: The map is the primary workspace and dominates the viewport. All sidebars, toolbars, and inspection drawers exist solely to support spatial interaction.
2. **No AI Aesthetic**: Strictly avoid neon greens (`#00FF88`), glassmorphism, glossy rounded cards, bouncing animations, glowing borders, and AI buzzword chips (*"Powered by AI"*, *"Model Online"*).
3. **Scientific & Instrumental**: Visual references come from cartography, surveying, geology, and remote sensing. Controls resemble precision instruments.
4. **Information Density over Decoration**: Every icon, line, and readout communicates geospatial data. White space is calibrated for high information density without unnecessary padding.
5. **Terracotta is GeoClass**: `#C96B3C` is the primary brand accent (active states, selected AOI, primary action). Green is reserved exclusively for ecological/environmental data (vegetation, NDVI).

---

## 01. Color System

The default interface is **warm light paper**, allowing satellite imagery, false-color composites, and raster overlays to provide visual richness.

### Primary Palette (Paper & Ink)

| Token | Hex | Role | Usage |
| :--- | :--- | :--- | :--- |
| `paper-50` | `#FAF9F5` | Main Surface | Workstation background, primary card surfaces |
| `paper-100` | `#F4F1E8` | Canvas & Backdrops | Secondary panel background, subtle hovers |
| `paper-200` | `#E9E6DC` | Elevated / Interactive | Active selections, input fills, dropdown hover |
| `line` | `#D8D5CA` | Structural Divider | 1px clean borders, panel dividers |
| `line-subtle` | `#E3E0D5` | Minor Gridline | Table row dividers, subtle separations |
| `line-strong` | `#BCB8AA` | Emphasized Border | Active input stroke, focus states |
| `ink-900` | `#202522` | Primary Text | Headings, active values, high-contrast labels |
| `ink-700` | `#454B46` | Secondary Text | Section headers, form labels |
| `ink-500` | `#69706A` | Supporting Text | Body copy, secondary metadata, unit labels |
| `ink-400` | `#8A908A` | Subtle / Placeholder | Disabled states, empty placeholder text |

### Primary Brand & Functional Accents

| Token | Hex | Role | Usage |
| :--- | :--- | :--- | :--- |
| `survey-500` | `#C96B3C` | Primary Brand | Primary action buttons, active tab underline, AOI vector border |
| `survey-600` | `#AD5630` | Hover Accent | Primary button hover, pressed states |
| `survey-100` | `#F3DFD3` | Accent Wash | Active selection background, highlighted tag fill |
| `topo-500` | `#416B73` | Secondary Accent | Secondary metrics, analytical charts, elevation tools |
| `topo-600` | `#355A61` | Secondary Hover | Hover state on secondary interactive tools |
| `vegetation-500` | `#6F8060` | Environmental Data | NDVI values, forest/canopy data, ecological readouts |
| `vegetation-100` | `#E4E9DF` | Vegetation Wash | Background badge for environmental metrics |
| `warning-500` | `#B68A3A` | Warning / Advisory | High cloud cover warnings, incomplete data bounds |
| `danger-500` | `#A84E42` | Error / Alert | Boundary invalidity, acquisition failure |

### Semantic Color Rule: Orange vs Green

* **Terracotta (`#C96B3C`)**: Current active workflow, AOI boundary, selected layers, primary button triggers.
* **Vegetation Green (`#6F8060`)**: Plant biomass, NDVI, crop health, ecological land cover.

---

## 02. Dark Mode (Secondary Workspace)

Dark mode is a secondary, low-glare option for long nighttime analysis sessions—never the primary brand identity.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `dark-bg` | `#171A17` | Canvas and background |
| `dark-surface` | `#20241F` | Panels and sidebars |
| `dark-surface-2` | `#292D28` | Cards and inputs |
| `dark-line` | `#3A3E38` | Structural 1px borders |
| `dark-text` | `#F1EFE7` | Primary text |
| `dark-muted` | `#A4AAA2` | Muted labels and coordinates |
| `dark-accent` | `#D47747` | Active indicator / survey accent |

*Prohibited in dark mode*: Electric green (`#00FF88`), neon cyan, glowing borders.

---

## 03. Typography

The typography reinforces precision and scientific publishing.

### Typefaces

* **Primary UI (`IBM Plex Sans`)**: Used for all standard interface text, buttons, labels, and headers.
* **Monospace (`IBM Plex Mono`)**: Reserved strictly for coordinates, EPSG codes, dates, resolutions, numerical sensor telemetry, and spectral values.

### Type Scale

| Level | Size / Line Height | Weight | Font | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `32px / 38px` | `600` (SemiBold) | IBM Plex Sans | Project titles, prominent analysis metrics |
| **Page Heading** | `24px / 30px` | `600` (SemiBold) | IBM Plex Sans | Main modal titles, dashboard headings |
| **Section Heading** | `15px / 20px` | `600` (SemiBold) | IBM Plex Sans | Sidebar section titles (`Area of Interest`, `Layers`) |
| **Body** | `14px / 21px` | `400` (Regular) | IBM Plex Sans | Descriptive copy, parameter explanations |
| **Small UI** | `12px / 17px` | `500` (Medium) | IBM Plex Sans | Layer titles, dropdown items, tooltips |
| **Technical Metadata** | `11px / 16px` | `400` / `500` | IBM Plex Mono | Lat/Long, date ranges, sensor bands, EPSG:4326 |

### Casing Convention

* **Sentence case by default**: Use `Satellite imagery`, `True color composite`, `Area of interest`.
* **Uppercase reserved for technical abbreviations**: `SENSOR`, `RESOLUTION`, `CLOUD COVER`, `COORDINATES`, `EPSG:4326`, `NDVI`, `SAR`.

---

## 04. Spacing & Geometry

GeoClass adheres to a strict **4px base grid** with compact, information-dense spacing.

### Spacing Scale

* `4px`: Micro gap (badge padding, icon-to-label spacing)
* `8px`: Compact control padding, item row gaps
* `12px`: Field spacing, group margins
* `16px`: Standard panel padding, card content padding
* `20px`: Topbar horizontal padding
* `24px`: Major section separation
* `32px`: Workspace gutter

### Corner Radii

Restrained and architectural. Avoid pill shapes.

| Component | Radius |
| :--- | :--- |
| Inputs & Selects | `4px` |
| Buttons | `4px` |
| Cards & Popovers | `6px` |
| Panels & Drawers | `0px` (flush with screen borders) |
| Map Viewport | `0px` (seamless edge-to-edge) |
| Floating Map Toolbars | `4px` |
| Badges & Status Tags | `3px` |

### Borders vs Shadows

* **Primary separation**: `1px solid #D8D5CA` (`var(--gc-line)`).
* **Shadows**: Minimal.
  * Default: `none`
  * Floating map controls: `0 2px 8px rgba(32, 37, 34, 0.12)`
  * Dropdowns & Modals: `0 4px 16px rgba(32, 37, 34, 0.14)`

---

## 05. Component Specifications

### Buttons

* **Primary Button**:
  * Background: `#C96B3C` (`var(--gc-survey-500)`)
  * Text: `#FFFFFF`, weight 500, size 13px
  * Height: `36px`, padding `0 14px`
  * Radius: `4px`
  * Hover: `#AD5630`
* **Secondary / Outline Button**:
  * Background: Transparent
  * Border: `1px solid #D8D5CA`
  * Text: `#202522`, size 13px
  * Hover: Background `#F4F1E8`
* **Ghost Action**:
  * Background: Transparent
  * Text: `#454B46`
  * Hover: Background `#E9E6DC`, radius 4px

### Inputs & Form Controls

* Background: `#FAF9F5` (`paper-50`)
* Border: `1px solid #D8D5CA`
* Radius: `4px`
* Height: `34px`
* Text: `#202522`, placeholder `#8A908A`
* Focus: Border `#C96B3C`, ring `0 0 0 1px #C96B3C`

### Map Toolbars & Instrument Controls

Floating map instruments must feel like optical surveying gear:
* Background: `#FAF9F5`
* Border: `1px solid #D8D5CA`
* Radius: `4px`
* Item size: `32px x 32px`
* Active item: Background `#F3DFD3`, icon `#C96B3C`

---

## 06. Application Layout

The layout is built as a three-column workstation with a persistent bottom analysis drawer.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo] GeoClass   Projects   Imagery   Classification   Analytics  [NI]│
├─────────────────┬──────────────────────────────────────┬───────────────┤
│ WORKSPACE       │                                      │ LAYERS        │
│ (280px - 304px) │                                      │ (300px - 330px)
│                 │                                      │               │
│ • Area of       │                 MAP                  │ • Sentinel-2  │
│   Interest      │              WORKSPACE               │ • Elevation   │
│ • Satellite     │                                      │ • Land Cover  │
│   Imagery       │                                      │ • Analytics   │
│ • Model Setup   │                                      │               │
├─────────────────┴──────────────────────────────────────┴───────────────┤
│ Sentinel-2 · 10m · 2024-10-01 → 2024-12-31 · 37.7749° N · EPSG:4326   │
├────────────────────────────────────────────────────────────────────────┤
│ Classification Analysis | Statistics | Metadata                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Proportions

* **Left Panel**: `280px` – `304px` (fixed width, collapsible)
* **Right Panel**: `300px` – `330px` (fixed width, collapsible)
* **Map Canvas**: Takes all remaining viewport space.
* **Bottom Status Bar**: Persistent `28px` telemetry bar in `IBM Plex Mono`.
* **Bottom Analysis Drawer**: Resizable/collapsible drawer for class breakdowns, histograms, and transition matrices.

---

## 07. Cartographic Iconography

Icons support technical precision rather than decorative flourish:
* 16px standard size, 1.5px stroke weight.
* Clean geometrical contours (polygon boundaries, contour lines, radar wave pulses, leaf chloroplasts).
* No rounded multi-colored background circles.

---

## 08. CSS Variables & Tailwind Configuration

```css
:root {
  --gc-paper-50: #FAF9F5;
  --gc-paper-100: #F4F1E8;
  --gc-paper-200: #E9E6DC;

  --gc-line: #D8D5CA;
  --gc-line-subtle: #E3E0D5;
  --gc-line-strong: #BCB8AA;

  --gc-ink-900: #202522;
  --gc-ink-700: #454B46;
  --gc-ink-500: #69706A;
  --gc-ink-400: #8A908A;

  --gc-survey-500: #C96B3C;
  --gc-survey-600: #AD5630;
  --gc-survey-100: #F3DFD3;

  --gc-topo-500: #416B73;
  --gc-topo-600: #355A61;

  --gc-vegetation-500: #6F8060;
  --gc-vegetation-100: #E4E9DF;

  --gc-warning-500: #B68A3A;
  --gc-danger-500: #A84E42;

  --gc-radius-sm: 2px;
  --gc-radius-md: 4px;
  --gc-radius-lg: 6px;
}
```
