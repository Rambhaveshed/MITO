# MITO

MITO is a map-first land intelligence product for Tamil Nadu. It keeps government guideline values, registered transactions, asking prices and model estimates as distinct evidence types, and withholds a value when the evidence is too weak.

## Current pilot

The first release establishes the production interface and provenance model with a Chennai-first pilot:

- Interactive MapLibre map with Tamil and English place search
- Asking-price evidence for Sholinganallur, clearly separated from completed sales
- Comparable selection with live recalculation
- Official-source registry for TNREGINET, Tamil Nadu land e-Services, CMDA and TNRERA
- Evidence grades, exact-versus-unplotted counts and known-gap reporting
- Normalized D1 schema for sources, places, geometries, price evidence and verification events
- Desktop and 390px mobile layouts

## OMR evidence programme

The first complete-coverage target is the OMR corridor from Adyar and Taramani to Mamallapuram. MITO now tracks 24 candidate corridor registration villages across six official sub-registrar offices using public TNREGINET identifiers.

This is a collection boundary, not a price-completeness claim. All 24 jurisdictions and current street-register inventory totals are now verified, but row-level current guideline values and registered transactions remain unavailable. `data/coverage/omr-corridor.json` is the auditable release ledger. The app cannot call OMR complete until every target unit has 100% authorized street-register capture and at least one verified official guideline record.

On 16 July 2026, MITO used the normal public TNREGINET village-wise current-register screen to query every target village separately. The 24 displayed inventories total 2,715 items effective from 1 July 2024. Sholinganallur 1 has 758 items, resolving the earlier 17-versus-758 conflict for its current release target. The older 17-item result remains preserved as historical evidence because the reason for the different query state is unknown.

The official copyright policy requires Registration Department permission before website contents are reproduced. MITO therefore publishes the 24 inventory counts, source dates, query path and coverage status, but stores and republishes zero live row-level values. The corridor audit is in `data/evidence/tnreginet-omr-inventory-audit-2026-07-16.json`; the detailed Sholinganallur reconciliation remains in `data/evidence/tnreginet-live-register-audit-2026-07-16.json`. A draft written-permission and authorized-export request is in `docs/data-licensing/tnreginet-guideline-reuse-request.md`.

MITO now also captures two price-adjacent official records for Siruseri IT Park from SIPCOT's public land-availability schedule: ₹780 lakh/acre for industrial land (normalized to ₹1,790.63/sq ft) and ₹1,560 lakh/acre for commercial land (₹3,581.27/sq ft). These are 99-year leasehold government allotment plot costs—not freehold sale transactions, guideline values, asking prices, market estimates or a village-wide Siruseri rate. The source displays no publication or effective date. MITO preserves SIPCOT's land-table `Kancheepuram` district label alongside the `Chengalpattu` label in SIPCOT's current GIS index and MITO's registration association rather than silently rewriting the conflict. The audited rate ledger is `data/evidence/sipcot-siruseri-land-rates-2026-07-17.json`.

Siruseri is MITO's first publishable evidence geometry. The map uses OpenStreetMap way 98358103 under ODbL 1.0, with attribution, as a dashed approximate named footprint. MITO also audited SIPCOT's public GIS boundary layer and confirmed that the OSM centroid falls inside it, but the open polygon covers only about 88.4% of the official geometry's computed area and differs materially in outline. No SIPCOT coordinates are stored or republished because no explicit reuse policy or licence was found. The OSM polygon is therefore never described as official, exact, cadastral, legal or complete, and it does not identify either available parcel. The publishable GeoJSON is `data/geometry/sipcot-siruseri-osm-footprint-2026-07-17.json`; the comparison and rights decision are recorded in `data/evidence/sipcot-siruseri-geometry-audit-2026-07-17.json`.

MITO also preserves eight official TNHB Sholinganallur residential price records from the public Property Sales portal. They are closed historical original apartment offers with displayed total prices from ₹10.43 lakh to ₹66.52 lakh. MITO derives only the combined apartment price per plinth square foot (₹2,349.10–₹6,110.59); it does not divide by the undivided land share because that would incorrectly assign the building component to land. The source does not distinguish TNREGINET's Sholinganallur 1 and 2 registration villages, so all eight records stay unplotted, appear to both candidates as unresolved locality evidence and count toward neither direct village nor land-price coverage. Personal contacts, portal media, Google geotags and the full 183-record response are excluded. The targeted source ledger is `data/evidence/tnhb-sholinganallur-housing-offers-2026-07-17.json`.

MITO has recovered one unredacted TNREGINET row from a dated public project-file archive: Chidambaram Nagar 1st Street in Sholinganallur 1, shown at ₹4,400/sq ft, Residential Special Type V, effective 1 July 2024. The source screen is dated 16 April 2025. The row remains pending and unplotted because the live current-register audit verified only inventory metadata and the official street code is not visible. It remains excluded from current verified totals. The archive reports 17 items for that dated result, but only row 11 is visible; rows 12–17 are redacted and rows 1–10 are absent.

MITO also maintains a separate official planning ledger. The ledger now contains 27 source-backed records from nine official sources: the final 2022 Chennai Metropolitan Planning Area expansion order, CMDA rules, planning resolutions, a current Seevaram planning-permission letter, regularisation indexes and the Grid of Roads programme. Twenty-one of the 24 target villages have at least one directly linked planning record; three records remain unresolved across the Sholinganallur registration split or the Kalipattur/Kazhipattur name variant. Planning-area membership and site-specific approvals never become price, title or village-wide zoning evidence.

Official guideline-value imports must follow `data/evidence/guideline-value-import.schema.json`. Version 1.1 requires source snapshots, official jurisdiction identifiers, street name, original units, normalized ₹/sq ft values, effective dates, location evidence and verification status. An archived row may temporarily preserve a missing official street code only while its status is pending; the validator prevents that row from becoming verified until the code is recovered. A blocked live capture is published as missing evidence rather than as a zero-price result.

Machine-readable endpoints:

- `/api/coverage` — OMR coverage, release gate and jurisdiction ledger
- `/api/resolve?query=Tharamani` — deterministic OMR registration-jurisdiction resolver using verified English, Tamil, TNREGINET and official-ID aliases
- `/api/evidence` — official planning records, current-register metadata, SIPCOT leasehold allotment rates, closed TNHB Sholinganallur apartment offers, the attributed approximate Siruseri footprint, the official-versus-open geometry audit, the archived Sholinganallur row, rights status, source provenance, crosswalk gaps and the guideline-value import contract

The resolver never geocodes an address or assigns a parcel. It exposes ambiguity where the official register has multiple villages such as Sholinganallur 1/2 and Thaiyur A/B, and preserves unresolved source conflicts such as Kalipattur versus Kazhipattur instead of silently merging them. Selecting a resolved village in the Coverage view opens its current inventory metadata, official identifiers, directly linked evidence, reproduction steps and explicit price-release gate.

## Chennai District expansion

MITO's next coverage scope is the 426 sq km Chennai District / Greater Chennai Corporation area, kept separate from the much larger Chennai Metropolitan Area. The preferred current Chennai District Revenue Administration table contains 17 taluk groups, 49 firkas and 144 village rows. Every source spelling is searchable and remains unplotted and unpriced.

Nine source rows now have independently verified registration-village links inherited from the completed OMR jurisdiction audit: Taramani and Kanagam in Velachery taluk, plus Sholinganallur-I, Sholinganallur-II, Semmancheri, Perungudi, Karapakkam, Okkiyam Thoraipakkam and Seevaram in Sholinganallur taluk. Together, their current official inventories contain 2,117 items. These are inventory counts, not guideline values: MITO still stores and publishes zero current row-level values for the Chennai expansion.

Three Guindy taluk source rows—Adayar Part I, Adayar Government Farm and Adayar Part II—remain explicitly unresolved against the single verified Adyar registration village. MITO does not assign one registration ID to all three merely because the names overlap. The crosswalk ledger is in `data/evidence/chennai-registration-crosswalk-2026-07-17.json`.

The official sources conflict: the Chennai District homepage reports 16 taluks and 122 villages; the detailed Revenue Administration page says 17 taluks in one summary, labels a section as 16, lists 17 groups and totals 144 villages; the separate Village page lists only 10 taluk groups and 68 rows. MITO preserves this conflict and cannot call Chennai complete until it is reconciled. The ledger is in `data/coverage/chennai-district-revenue-2026-07-16.json`.

MITO has also audited three authoritative geometry sources. Greater Chennai Corporation's 2025 ArcGIS service exposes 37,225 road features, 15 zone polygons and 200 ward polygons in EPSG:32644 with GeoJSON support. TNGIS exposes relevant administrative and revenue-village layers, and Chennai District publishes an official district map. These discoveries do not create a right to republish: all three authorities' published policies require prior permission for MITO's intended reuse. MITO therefore stores and plots zero source geometries. The technical and rights audit is in `data/evidence/chennai-geometry-source-audit-2026-07-17.json`, with a ready-to-send request in `docs/data-licensing/gcc-gis-reuse-request.md`.

The Chennai scope adds `/api/chennai-coverage`, with optional deterministic source-table search such as `/api/chennai-coverage?query=Taramani`. The endpoint exposes verified registration metadata, the geometry source audit, unresolved splits and zero-value publication status. A source-name match without independent evidence never becomes a TNREGINET ID, ward, parcel, geometry, guideline value or market estimate.

The map markers in this pilot are approximate locality anchors. They are not parcel, property or transaction coordinates. Individual listing evidence stays unplotted until the location can be independently verified.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
npm test
```

## Data principles

1. Never label a guideline value or asking price as a confirmed market price.
2. Never invent coordinates, parcels or survey boundaries.
3. Preserve source, retrieval date, uncertainty and conflicts.
4. Calculate published aggregates from normalized evidence.
5. Publish “insufficient evidence” when a defensible estimate cannot be made.
