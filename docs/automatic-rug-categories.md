# Automatic rug categories

New showroom rug listings default to “Choose category automatically”. Enter exact dimensions in feet and inches. The publishing form previews the category and inferred shape before saving. Standard sizes use a half-foot tolerance; unusual sizes use Small, Medium, Large or Oversized. Narrow rugs up to 4.5 feet wide with length at least 2.5 times width are classified as runners. Explicit Round, Square, Oval and Runner shapes are respected.

Examples: 8′2″ × 10′3″ → 8x10; 2 × 8 → Runner; a 6-foot Round → 6 ft Round. Exact dimensions are never replaced with nominal dimensions. Classification does not change product price, weight, inventory status, images or payment records. Existing shipping-price calculation continues to use the saved size category and dimensions; its preview uses the same newly selected category.

To override a suggestion, clear the automatic checkbox and choose a category. The override is saved as manual. Existing records without a mode are treated as manual when opened, so they are not silently reclassified. Enabling automatic selection opts that listing into recalculation when its measurements or shape change. Unknown measurements require manual review; style, origin, age and material are not invented from photographs or vague descriptions.

Categories are stored in Firebase with each listing. Server edits recompute automatic classifications against the current record and include derived changes in the inventory audit while preserving existing checkout protections. No database migration or bulk rewrite is included.
