# Greater Chennai Corporation GIS reuse request

## Purpose

MITO is an evidence-led land-intelligence product for Tamil Nadu. It separates municipal, revenue, registration, planning and parcel evidence, keeps unreliable locations unplotted, and does not treat a boundary as title or legal certification.

MITO requests written permission from Greater Chennai Corporation to use the public `EDPMobile2025` ArcGIS Feature Service for Chennai map context and jurisdiction resolution.

## Requested layers

- `EDP_Roads_2025` (layer 0): 37,225 live features observed on 17 July 2026
- `EDP_zoneBoundary_2025` (layer 1): 15 live polygon features observed on 17 July 2026
- `EDP_wardBoundary_2025` (layer 2): 200 live polygon features observed on 17 July 2026

Official service:
`https://gisgcc.chennaicorporation.gov.in/server/rest/services/GCCDepts/EDPMobile2025/FeatureServer/layers`

The service declares EPSG:32644 and supports JSON, GeoJSON and PBF queries. MITO has recorded only this source metadata and live feature counts. It has not copied, stored, embedded or republished any source geometry.

## Permission requested

Please confirm whether MITO may:

1. Retrieve and store versioned snapshots of the three layers.
2. Transform geometry from EPSG:32644 to EPSG:4326 and vector-tile formats.
3. Display the geometry in a public, commercial web application.
4. Publish derived joins between GCC road or ward IDs and separately sourced revenue or registration jurisdictions.
5. Provide geometry through MITO APIs or downloadable evidence reports.
6. Retain prior snapshots for provenance, corrections and audit history.

Please also specify:

- required attribution wording and logo use;
- refresh-frequency or rate-limit requirements;
- whether raw geometry redistribution is permitted or map display only;
- whether derived geometry or simplified vector tiles may be cached;
- whether a written data-sharing agreement, fee or additional approval is required;
- the authoritative owner and technical contact for each layer;
- the intended update cadence and whether stable feature IDs are guaranteed.

## Safeguards MITO will apply

- Prominent GCC source attribution and source links.
- Source date, retrieval date, verification date and snapshot checksum.
- Clear “municipal geometry, not parcel or title evidence” labels.
- No inferred parcel boundaries, city-centre coordinates or administrative centroids.
- Separate storage for municipal ward, revenue village, registration village, road and parcel entities.
- Immediate correction or takedown workflow for verified errors or withdrawn permissions.
- No personal information from GCC property or utility systems.

## Requested response

A written response should identify the permitted uses, attribution, duration, restrictions, technical contact and whether MITO may redistribute raw or derived geometry. Until that response is received, MITO will keep all affected geometry unplotted.

Relevant GCC copyright policy:
`https://chennaicorporation.gov.in/gcc/common/privacy-policy/`
