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

This is a collection boundary, not a completeness claim. Jurisdictions have been identified, but street-register totals, official guideline values and registered transactions remain incomplete. `data/coverage/omr-corridor.json` is the auditable release ledger. The app cannot call OMR complete until every target unit has a known street total, 100% street-register capture and at least one verified official guideline record.

MITO also maintains a separate official planning ledger. The ledger now contains 27 source-backed records from nine official sources: the final 2022 Chennai Metropolitan Planning Area expansion order, CMDA rules, planning resolutions, a current Seevaram planning-permission letter, regularisation indexes and the Grid of Roads programme. Twenty-one of the 24 target villages have at least one directly linked planning record; three records remain unresolved across the Sholinganallur registration split or the Kalipattur/Kazhipattur name variant. Planning-area membership and site-specific approvals never become price, title or village-wide zoning evidence.

Official guideline-value imports must follow `data/evidence/guideline-value-import.schema.json`. The contract requires source snapshots, official jurisdiction and street identifiers, original units, normalized ₹/sq ft values, effective dates, location evidence and verification status. A blocked capture run is published as missing evidence rather than as a zero-price result.

Machine-readable endpoints:

- `/api/coverage` — OMR coverage, release gate and jurisdiction ledger
- `/api/evidence` — official planning records, source provenance, crosswalk gaps and the guideline-value import contract

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
