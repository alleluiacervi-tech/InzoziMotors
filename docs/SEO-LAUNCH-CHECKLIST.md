# Sawa Cars search launch checklist

The site supplies the technical SEO foundation. Search position is earned over
time from indexation, useful inventory, local authority, links, reviews and
engagement; it cannot be guaranteed by markup or keywords alone.

## Implemented in the product

- [x] Server-rendered home, sale, rental, seller and tool pages
- [x] Unique titles, descriptions and canonical URLs
- [x] Indexable car and rental detail URLs
- [x] Dynamic XML sitemap containing live inventory
- [x] Honest sitemap `lastmod` values only for records with real timestamps
- [x] Robots policy that protects account/API surfaces without blocking public pages
- [x] Vehicle, Product/Offer, ItemList, Breadcrumb, Organization and local-center schema
- [x] Service schema for rentals, selling and Rwandan vehicle tools
- [x] RWF prices in visible content, metadata and structured data
- [x] Search-friendly internal links across Buy, Rent, Sell and Tools
- [x] Responsive images, semantic headings and accessible navigation

## Owner actions required after deployment

- [ ] Add the Google Search Console HTML-tag token to
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in the VPS production environment.
- [ ] Redeploy and verify the token appears in the home-page `<head>`.
- [ ] Submit `https://sawacars.com/sitemap.xml` in Google Search Console.
- [ ] Request indexing for `/`, `/cars`, `/rentals`, `/sell` and `/tools`.
- [ ] Connect Bing Webmaster Tools and submit the same sitemap.
- [ ] Create or claim the real Google Business Profile for each operating center;
  use the exact names, addresses, phone and opening hours printed on the website.
- [ ] Ask genuine customers for Google reviews after completed rentals and handovers.
- [ ] Publish real inventory consistently. Do not create doorway pages for locations
  where Sawa Cars does not operate.
- [ ] Earn locally relevant links from tourism partners, hotels, travel publications,
  insurers, banks and Rwandan business directories. Never buy bulk backlinks.

## Search-intent priorities

1. `car rental Kigali`, `car rental Kigali airport`, `rent a car Kigali Rwanda`
2. `cars for sale Kigali`, `cars for sale Rwanda`, `used cars Kigali`
3. `sell my car Kigali`, `car valuation Rwanda`
4. `Rwanda import duty calculator`, `car finance calculator Rwanda`
5. Inventory-specific searches: make + model + year + Kigali/Rwanda

Measure impressions, indexed pages, click-through rate and qualified enquiries
monthly. Improve pages from real query data instead of repeatedly changing titles
based on guesses.
