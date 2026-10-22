# Assets and licensing

The owner has not selected an open source license for application code. No
blanket license is granted for the illustrations or source code by this document.

- `public/fonts/InterVariable.woff2` is Inter, copyright the Inter Project
  Authors, under SIL Open Font License 1.1. Its complete license is retained in
  `public/fonts/Inter-LICENSE.txt` and shipped with the application assets.
- Marvin-themed illustrations, logos, icons and social preview variants were
  generated with image generation tools from owner-supplied character references.
  This records their provenance; it does not establish rights to the reference
  character or grant third-party redistribution rights. Review those separately
  before licensing or redistributing the images.
- unlikely-ui code and styles are MIT licensed; its complete license is shipped at
  `public/licenses/unlikely-ui-LICENSE.txt` and retained in the offline shell. The application uses the published
  `unlikely-ui@0.1.0-alpha.2` rather than copying its component source.
- Lucide icons and other installed dependencies retain their own package
  licenses. Dependency licenses are independent of the owner's code decision.

The retained raster assets were inspected for EXIF and embedded textual
metadata during the repository cleanup. No author, GPS or private infrastructure
metadata was found. Technical PNG creation timestamps were removed without
changing pixels. Operational screenshots and original reference materials are
kept outside the source repository.

## Dark installation icon — 2026-10-19

The built-in image generation tool edited the existing
`public/icons/icon-512.png` with a dark background, thicker dark character
outline and a thin ivory keyline. The exact [edit prompt](assets/pwa-icon-v2-prompt.txt)
is retained for provenance. The generated result was resized with ImageMagick
to opaque RGB PNGs with metadata stripped:

- `public/icons/icon-dark-v2-192.png`: 192×192 install icon.
- `public/icons/icon-dark-v2-512.png`: 512×512 install and maskable icon.
- `public/icons/apple-touch-icon-dark-v2.png`: 180×180 Apple touch icon.

The head stays inside the central safe circle described by the
[Web Application Manifest specification](https://www.w3.org/TR/appmanifest/#icon-masks).
The manifest and Apple touch link use the new filenames, and the PWA build
includes them in its required offline assets and content hash. The previous
files remain available to older application shells. Updating an existing
installed icon is controlled by the browser/OS; an application-shell update
does not itself guarantee immediate replacement of the launcher icon.

## Mint mascot — 2026-10-20

The owner selected a round ivory head with a sleepy diagonal eyelid and mint
eyes. The requested eye color, `#87f19d`, was sampled from the owner's
`--u-accent` design-token reference. The built-in image generation tool produced
the selected head, its transparent cutout, a matching thinking pose and an
updated social card. The exact [generation and edit prompts](assets/mint-mascot-v1-prompts.txt)
record the input roles and preserved features. The existing provenance and
licensing limitations above still apply.

ImageMagick trimmed transparent margins, resized and encoded the generated
results, and stripped embedded metadata. The initial mint asset set contains:

- `public/assets/mascot-mint-head-v1.webp`: transparent 192×192 header avatar.
- `public/assets/mascot-mint-thinking-v1.webp`: transparent thinking illustration
  for the welcome screen and comparison summary.
- `public/favicon-mint-v1.png`: transparent 64×64 browser icon.
- `public/icons/icon-mint-v1-192.png`: opaque 192×192 installation icon.
- `public/icons/icon-mint-v1-512.png`: opaque 512×512 installation and maskable icon.
- `public/icons/apple-touch-icon-mint-v1.png`: opaque 180×180 Apple touch icon.
- `public/social/og-mint-v1.jpg`: 1200×630 social preview with the existing wording.

Installation icons use a `#2d312c` background; the complete head fits within
75% of the image width and height, inside the maskable safe circle. The manifest
launch colors use the same background. The header, favicon and thinking pose
keep genuine transparency for both page themes and the yellow summary card.
New asset filenames are included in the PWA's required offline assets and build
hash. Older assets remain available for older application shells.

## Selected M2 illustration — 2026-10-20

The owner selected M2 with its original connected diagonal brow, compact
charcoal torso, mint yoke, low ivory shoulder caps and short ivory neck.
Both arms and both hands are retained: one hand supports the cheek while the
other forearm crosses the front and its hand supports the raised elbow.

`public/assets/mascot-m2-thinking-v1.webp` is an export of the selected M2
generation, with transparent margins trimmed and a small safety border added
before resizing. The drawing was not regenerated for the application export.
It replaces the thinking illustration on the welcome screen and comparison
summary. The existing mint head avatar, favicon and installation icons use the
same selected connected-brow face.

`public/social/og-m2-v1.jpg` is a 1200×630 imagegen edit of the preceding social
preview, using the full selected M2 illustration and retaining the existing
wording. The exact [selection and edit prompts](assets/m2-selection-prompts.txt)
record the provenance. Raster exports have embedded metadata stripped.

The new filenames are referenced by the app shell, social metadata and PWA
asset list; older image files remain available to older shells. The earlier
licensing notes and dated design-risk reviews remain applicable.

## Кампус name — 2026-10-20

The public application name is now «Кампус». The built-in image generation tool
replaced the title on the M2 social preview while preserving its illustration,
subtitle, badge and sticker. The exact [text edit prompt](assets/campus-name-prompt.txt)
is retained. `public/social/og-campus-v1.jpg` is the resized 1200×630 JPEG export
with embedded metadata stripped. Existing mascot and installation artwork is
retained; earlier preview files remain available at their existing URLs.
