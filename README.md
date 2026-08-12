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

Navalur now has two document-backed historical residential-land auction-floor checkpoints for the same 1,043 sq-ft Park Enclave plot: ₹57.365 lakh (₹5,500/sq ft) on 22 July 2025 and ₹45 lakh (₹4,314.48/sq ft) on 17 October 2025. MITO verified newspaper copies of Tata Capital Housing Finance statutory notices and separately audited Tata Capital's current public property-disposal export, which had no matching record on 12 August 2026. That absence is not treated as proof of sale, withdrawal or current availability. Five aggregator-only auction claims are retained as uncaptured-source gaps and excluded from all normalized totals, so the two points are never presented as a complete reserve history. No winning bid, sale certificate, registered transfer, current status or verified parcel geometry is published, and the asset remains unplotted. The privacy-safe source ledger is `data/evidence/tata-navalur-residential-land-auctions-2025.json`.

Sholinganallur 1 now has MITO's first exact-village official land reserve-price record. An IBBI liquidation notice dated 9 July 2025 offered one 9.80-acre vacant-land lot at a ₹192.33 crore reserve for auction on 12 August 2025. The notice reports 9.80 document acres and approximately 9.7808 summed patta acres, producing a transparent derived reserve range of ₹4,505.40–₹4,514.24 per square foot. A later NCLT order says the auction and auction process had concluded, but it does not publish the winning bid, bidder, sale certificate or registered transfer. MITO therefore labels the figure only as a liquidation reserve price—not a completed transaction, guideline value, asking price, market estimate, current availability or village-wide rate—and leaves the survey-referenced asset unplotted. The privacy-safe ledger is `data/evidence/ibbi-sholinganallur-land-auction-2025.json`.

Siruseri now also has an official commercial-asset reserve timeline. IBBI schedules offered Tecpro Systems' Plot A-17 commercial building at SIPCOT IT Park—one acre of land with 143,020 sq ft of building area—at ₹32.00 crore for an 8 September 2022 auction and ₹28.10 crore for a 3 November 2022 re-auction. The same-asset match is supported by the plot number, park, road, land area, building area and corporate debtor; the reserve fell 12.19%. Both figures include land and building, so MITO derives only a clearly labelled comparison denominator of ₹2,237.45 and ₹1,964.76 per building sq ft and publishes no land rate. No winning bid, sale certificate or registered transfer is available. Plot A-17 stays unplotted, and the evidence is associated with Siruseri by the named SIPCOT park rather than claimed as a verified parcel-to-registration-village match. The privacy-safe ledger is `data/evidence/ibbi-tecpro-siruseri-commercial-auctions-2022.json`.

The same TNHB snapshot was deterministically checked against every OMR coverage name using only normalized `schemePlace`, `village` and `taluk` fields. Sholinganallur was the only place-name match; project `schemeName` was deliberately excluded because numeric project names can collide with numbered registration subdivisions. MITO now publishes a 24-area source-by-source evidence matrix through `/api/coverage` and the village inspector. A source non-match is recorded as a dated audit gap, never as proof that no property or scheme exists.

MITO has recovered one unredacted TNREGINET row from a dated public project-file archive: Chidambaram Nagar 1st Street in Sholinganallur 1, shown at ₹4,400/sq ft, Residential Special Type V, effective 1 July 2024. The source screen is dated 16 April 2025. The row remains pending and unplotted because the live current-register audit verified only inventory metadata and the official street code is not visible. It remains excluded from current verified totals. The archive reports 17 items for that dated result, but only row 11 is visible; rows 12–17 are redacted and rows 1–10 are absent.

MITO also maintains a separate official planning ledger. The ledger now contains 30 source-backed records from 12 official sources: the final 2022 Chennai Metropolitan Planning Area expansion order, CMDA rules, planning resolutions, current planning-permission evidence, approved plans, regularisation indexes and the Grid of Roads programme. Twenty-two of the 24 target villages have at least one directly linked planning record. A 2024 CMDA high-rise index row explicitly identifies Sholinganallur I Village and records P.P. No.15612 for a site-specific 1,818-dwelling-unit development; MITO maps that Roman-numeral label only to Sholinganallur 1 and does not infer current construction status, a building permit, title, geometry or value. A 30-page CMDA index audit covering 2019–2026 found no exact Sholinganallur II or Kazhipattur/Kalipattur label; that non-match remains a dated coverage gap, not evidence that no planning record exists. Three other planning records remain unresolved across the Sholinganallur registration split or the Kalipattur/Kazhipattur name variant. Planning-area membership and site-specific approvals never become price, title or village-wide zoning evidence.

Semmancheri now has MITO's first structured approved-plan site metrics. CMDA's digitally signed 2025 drawing for S.No.127/16A1 (part), T.S.No.6, Block 8, Ward D records a 1,027.50 sq m patta area, 1,010.70 sq m area considered for FSI, 1,937.02 sq m total FSI area, FSI 1.917, 16.80 sq m left for OMR road widening and a 17.97 m stilt-plus-three-floor commercial-office proposal. The drawing says a local-body building permit is still required. MITO does not infer construction, completion, occupancy, title, parcel geometry or value; the not-to-scale user-input key plan is not geocoded. Owner names, signatures, professional names and QR data are excluded.

Semmancheri also has MITO's first source-pointed industrial-land reserve history. Five official Tamilnad Mercantile Bank auction notices describe the same three-parcel, 8,017 sq-ft asset and repeat the coordinate `12.874384, 80.229881`. The verified auction floor moved from ₹1.96 crore (₹2,444.80 per land sq ft) in September 2024 to ₹1.7955 crore (₹2,239.62 per land sq ft) in December 2025, an 8.39% reduction. TMB's secured-assets register still lists the land as security possessed at 30 June 2026. MITO treats the point only as a source-published asset reference and the register only as lifecycle evidence: neither establishes a parcel boundary, winning bid, completed sale, current auction availability, registered consideration, guideline value, market estimate or village-wide Semmancheri rate. The Mayana Salai/Pondicherry Salai label conflict and historical taluk labels remain explicit.

Semmancheri now also has MITO's first accepted auction-bid observation. A DRT-III Chennai order dated 15 May 2026 states that Union Bank offered one 2,108 sq-ft vacant residential plot at a ₹68 lakh reserve on 27 March 2024 and accepted a ₹68.70 lakh bid—₹3,259.01 per land sq ft, 1.03% above reserve. Only the 25% deposit was paid; after the balance remained unpaid, the bank cancelled the sale and forfeited the deposit on 31 August 2024. MITO therefore publishes the accepted bid as real auction-demand evidence but never as a completed sale, registered consideration, current offer or market value. The official DRT docket corroborates the case identity, while the full order is available through a non-official public mirror; their conflicting IA 447 labels remain explicit. The plot stays unplotted, and personal party, address, loan and contact data are excluded. The ledger is `data/evidence/drt-semmancheri-residential-land-bid-outcome-2024-2026.json`.

Thaiyur now has one privacy-safe official land-auction reserve observation from a Repco Home Finance notice dated 23 February 2026. The notice offered a 693 sq-ft land parcel at Plot 15, Kandasamy Nagar Phase 1 for a ₹11.23 lakh reserve on 31 March 2026, producing a transparent derived floor of ₹1,620.49 per land sq ft. No winning bid, sale certificate, registered transfer, current availability or parcel geometry was verified. More importantly, the notice says only “Thaiyur Village” and historically names Thiruporur sub-registration district, while the current TNREGINET inventory splits Thaiyur A and B under Kelampakkam SRO. MITO therefore displays the single record to both candidate villages but counts it once globally, zero times as direct-village evidence, and never as a sale, guideline value, asking price, market estimate or Thaiyur-wide rate. Borrower, guarantor, loan and contact details are excluded. The ledger is `data/evidence/repco-thaiyur-land-auction-2026.json`.

Okkiyam Thoraipakkam now has the same structured approved-plan treatment. CMDA's 2023 drawing for Plot Nos.9A and 9B, S.No.350/1A1B and 2B records a 1,400.00 sq m patta area, 1,383.64 sq m area considered for FSI, 3,427.51 sq m total FSI area, FSI 2.477 and an 18.30 m stilt-plus-five-floor commercial-office proposal. The drawing records 30 car spaces against 29 required and 113 two-wheeler spaces against 113 required. A local-body building permit is still required. The site stays unplotted because the key plan is not to scale and is identified as user input; MITO makes no construction, title, completion, occupancy or value claim and excludes personal fields.

Official guideline-value imports must follow `data/evidence/guideline-value-import.schema.json`. Version 1.1 requires source snapshots, official jurisdiction identifiers, street name, original units, normalized ₹/sq ft values, effective dates, location evidence and verification status. An archived row may temporarily preserve a missing official street code only while its status is pending; the validator prevents that row from becoming verified until the code is recovered. A blocked live capture is published as missing evidence rather than as a zero-price result.

Machine-readable endpoints:

- `/api/coverage` — OMR coverage, release gate and jurisdiction ledger
- `/api/resolve?query=Tharamani` — deterministic OMR registration-jurisdiction resolver using verified English, Tamil, TNREGINET and official-ID aliases
- `/api/evidence` — official planning records, current-register metadata, SIPCOT leasehold allotment rates, the Sholinganallur 1 land reserve, the Siruseri combined commercial-asset reserve timeline, the Semmancheri secured-creditor industrial-land reserve timeline and source point, two document-backed Navalur residential-land reserve checkpoints plus their source gaps and current-feed audit, closed TNHB Sholinganallur apartment offers, the attributed approximate Siruseri footprint, the official-versus-open geometry audit, the archived Sholinganallur row, rights status, source provenance, crosswalk gaps and the guideline-value import contract

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
