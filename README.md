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
