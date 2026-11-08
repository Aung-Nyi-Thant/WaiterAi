# Public landing page

The Next.js homepage at `/` introduces Shop AI and opens the existing diner menu. `page.tsx` reads SQLite on the server and sends a small dish preview to `MenuPreview.tsx`, the language-switching client component.

The public restaurant selection is unchanged: show the known sample restaurants when present, otherwise only the first restaurant. Preview dishes must be available; known sample photos are served from `public/landing/` using the exact source-URL map in `photos.ts`. Source attribution and file hashes are recorded in `public/landing/provenance.json`. Failed photos use the shared dish placeholder, including failures that happen before hydration.

Styles are scoped to this module and inherit the app's neutral palette and rounded font. The page uses native FAQ disclosures, keyboard focus styles and a reduced-motion fallback. Menu, owner, staff and registration links use the real application routes.

The AI explanation distinguishes database-backed factual answers, checks on model replies, and staff confirmation. It does not claim a measured accuracy percentage. Recipe and allergen data can be incomplete or estimated.

The feedback section identifies team MFU 888. Its email link opens a visitor's mail composer addressed to `thantaungnyi@gmail.com` with the subject “Shop AI feedback”; the GitHub link opens the supplied personal profile. There is no feedback storage or automatic email submission.
