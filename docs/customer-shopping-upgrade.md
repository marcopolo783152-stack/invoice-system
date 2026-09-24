# Marco Polo Rugs customer shopping upgrade

Review branch: improve/customer-shopping-20260918
Based on: 9778aab6ba4c195591e6a34476e973e0523db884

## What customers can use
- Homepage with Since 1988, real inventory, size shortcuts and showroom information.
- Shop: search several words or a SKU; filter size, color, material, origin, construction and maximum price.
- Heart buttons save rugs using the existing favorites feature.
- Select Compare on up to three cards, then Compare rugs. Copy shortlist link shares those items.
- Size guide provides placement diagrams. Help me choose narrows the collection.
- Product links and catalog clicks open the same gallery, exact specifications and shopping controls.
- Runner pages offer coordinating runners; recently viewed rugs appear on product pages.
- See it in the showroom carries selected rugs into appointment notes.
- Reviews display approved records only; submission success waits for the database save.

## Staff editing
Enter Edit Mode on the homepage. Edit the headline and introductory text, or scroll to Homepage photos.
Set a cover image URL. Each customer room photo requires its URL, caption and confirmation of permission.
Use Publish Changes to save these website settings. Without approved photos, no customer room section is displayed.
An existing published custom CMS homepage still takes precedence over the fallback homepage; it has not been overwritten.

## Data and payment boundaries
No migrations, inventory deletions, price edits, customer updates or invoice changes are included.
No Stripe credentials, payment routes, webhook settings or eligibility holds are changed.
Existing record collections and appointment reservation rules remain in use.
The old homepage implementation remains in LegacyHero.tsx as a source reference; existing CMS content is preserved.

## Review before production
Check homepage and shop at desktop and phone widths. Open a rug directly and from a card.
Check saving, three-item comparison, shortlist sharing, filters and browser Back.
Check appointment selections without submitting a real booking.
Confirm delivery estimates and actual business policy copy.
Review a Vercel preview before promoting this branch. A successful build is not a live production deployment.
