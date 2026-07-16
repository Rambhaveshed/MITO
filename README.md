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

This is a collection boundary, not a completeness claim. Jurisdictions have been identified, but street-register totals, current official guideline values and registered transactions remain incomplete. `data/coverage/omr-corridor.json` is the auditable release ledger. The app cannot call OMR complete until every target unit has a known street total, 100% street-register capture and at least one verified official guideline record.

MITO has recovered one unredacted TNREGINET row from a dated public project-file archive: Chidambaram Nagar 1st Street in Sholinganallur 1, shown at ₹4,400/sq ft, Residential Special Type V, effective 1 July 2024. The source screen is dated 16 April 2025. The row is preserved as pending, unplotted archived evidence because the live TNREGINET service could not be rechecked and the official street code is not visible. It remains excluded from current verified totals. The archive reports 17 streets for that dated village result, but only row 11 is visible; rows 12–17 are redacted and rows 1–10 are absent.

MITO also maintains a separate official planning ledger. The ledger now contains 27 source-backed records from nine official sources: the final 2022 Chennai Metropolitan Planning Area expansion order, CMDA rules, planning resolutions, a current Seevaram planning-permission letter, regularisation indexes and the Grid of Roads programme. Twenty-one of the 24 target villages have at least one directly linked planning record; three records remain unresolved across the Sholinganallur registration split or the Kalipattur/Kazhipattur name variant. Planning-area membership and site-specific approvals never become price, title or village-wide zoning evidence.

Official guideline-value imports must follow `data/evidence/guideline-value-import.schema.json`. Version 1.1 requires source snapshots, official jurisdiction identifiers, street name, original units, normalized ₹/sq ft values, effective dates, location evidence and verification status. An archived row may temporarily preserve a missing official street code only while its status is pending; the validator prevents that row from becoming verified until the code is recovered. A blocked live capture is published as missing evidence rather than as a zero-price result.

Machine-readable endpoints:

- `/api/coverage` — OMR coverage, release gate and jurisdiction ledger
- `/api/evidence` — official planning records, the archived Sholinganallur row, source provenance, crosswalk gaps and the guideline-value import contract

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
