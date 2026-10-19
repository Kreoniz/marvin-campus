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
