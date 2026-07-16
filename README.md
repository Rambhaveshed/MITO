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

MITO has recovered one unredacted TNREGINET row from a dated public project-file archive: Chidambaram Nagar 1st Street in Sholinganallur 1, shown at ₹4,400/sq ft, Residential Special Type V, effective 1 July 2024. The source screen is dated 16 April 2025. The row remains pending and unplotted because the live current-register audit verified only inventory metadata and the official street code is not visible. It remains excluded from current verified totals. The archive reports 17 items for that dated result, but only row 11 is visible; rows 12–17 are redacted and rows 1–10 are absent.

MITO also maintains a separate official planning ledger. The ledger now contains 27 source-backed records from nine official sources: the final 2022 Chennai Metropolitan Planning Area expansion order, CMDA rules, planning resolutions, a current Seevaram planning-permission letter, regularisation indexes and the Grid of Roads programme. Twenty-one of the 24 target villages have at least one directly linked planning record; three records remain unresolved across the Sholinganallur registration split or the Kalipattur/Kazhipattur name variant. Planning-area membership and site-specific approvals never become price, title or village-wide zoning evidence.

Official guideline-value imports must follow `data/evidence/guideline-value-import.schema.json`. Version 1.1 requires source snapshots, official jurisdiction identifiers, street name, original units, normalized ₹/sq ft values, effective dates, location evidence and verification status. An archived row may temporarily preserve a missing official street code only while its status is pending; the validator prevents that row from becoming verified until the code is recovered. A blocked live capture is published as missing evidence rather than as a zero-price result.

Machine-readable endpoints:

- `/api/coverage` — OMR coverage, release gate and jurisdiction ledger
- `/api/resolve?query=Tharamani` — deterministic OMR registration-jurisdiction resolver using verified English, Tamil, TNREGINET and official-ID aliases
- `/api/evidence` — official planning records, current-register metadata, the archived Sholinganallur row, rights status, source provenance, crosswalk gaps and the guideline-value import contract

The resolver never geocodes an address or assigns a parcel. It exposes ambiguity where the official register has multiple villages such as Sholinganallur 1/2 and Thaiyur A/B, and preserves unresolved source conflicts such as Kalipattur versus Kazhipattur instead of silently merging them. Selecting a resolved village in the Coverage view opens its current inventory metadata, official identifiers, directly linked evidence, reproduction steps and explicit price-release gate.

## Chennai District expansion

MITO's next coverage scope is the 426 sq km Chennai District / Greater Chennai Corporation area, kept separate from the much larger Chennai Metropolitan Area. The preferred current Chennai District Revenue Administration table contains 17 taluk groups, 49 firkas and 144 village rows. Every source spelling is searchable and remains unplotted and unpriced until a registration crosswalk is verified.

The official sources conflict: the Chennai District homepage reports 16 taluks and 122 villages; the detailed Revenue Administration page says 17 taluks in one summary, labels a section as 16, lists 17 groups and totals 144 villages; the separate Village page lists only 10 taluk groups and 68 rows. MITO preserves this conflict and cannot call Chennai complete until it is reconciled. The ledger is in `data/coverage/chennai-district-revenue-2026-07-16.json`.

The Chennai scope adds `/api/chennai-coverage`, with optional deterministic source-table search such as `/api/chennai-coverage?query=Alandur`. A source-name match never becomes a TNREGINET ID, ward, parcel, geometry, guideline value or market estimate.

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
