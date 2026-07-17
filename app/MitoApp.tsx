"use client";

import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  ExternalLink,
  Filter,
  Info,
  Layers3,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Menu,
  Minus,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  chennaiGeometrySourceAudit,
  chennaiRevenueCoverage,
  chennaiRevenueSummary,
  chennaiRevenueUnits,
  chennaiRegistrationCrosswalk,
  chennaiTalukCrosswalkProgress,
  resolveChennaiRevenuePlace,
} from "../data/chennai";
import {
  archivedGuidelineRecordsForVillage,
  officialAllotmentRatesForVillage,
  officialAuctionReservePricesForVillage,
  officialCommercialAuctionReservesForVillage,
  omrGuidelineCaptureRun,
  omrGuidelineLiveRegisterSummary,
  omrGuidelineOmrInventoryAudit,
  omrGuidelineSecondaryCorroborationLedger,
  omrGuidelineSnapshotLedger,
  omrGuidelineSnapshotSummary,
  omrOfficialAllotmentRateLedger,
  omrOfficialAllotmentRateSummary,
  omrOfficialAuctionReservePriceLedger,
  omrOfficialAuctionReservePriceSummary,
  omrOfficialCommercialAuctionReserveLedger,
  omrOfficialCommercialAuctionReserveSummary,
  omrPlanningLedger,
  omrPlanningSummary,
  omrSiruseriFootprint,
  omrSiruseriFootprintCenter,
  omrSiruseriGeometryAudit,
  omrTnhbHousingOfferLedger,
  omrTnhbHousingOfferSummary,
  planningRecordsForVillage,
  tnhbHousingOffersForCandidateVillage,
  type PlanningEvidenceRecord,
} from "../data/evidence";
import {
  aliasesForVillage,
  omrCoverage,
  omrCoverageByOffice,
  omrCoveragePercent,
  omrCoverageSummary,
  omrReleaseReady,
  omrVillageEvidenceMatrix,
  resolveOmrPlace,
} from "../data/omr";
import { marketAreas, sourceById, type MarketArea } from "../data/pilot";

const views = ["Market", "Guideline", "Transactions", "Planning", "Risk", "Coverage"] as const;
type View = (typeof views)[number];
type CoverageScope = "omr" | "chennai";
const SIRUSERI_VILLAGE_KEY = "22604:800000275";
const SIRUSERI_SOURCE_ID = "sipcot-siruseri-footprint";
const SIRUSERI_FILL_LAYER_ID = "sipcot-siruseri-footprint-fill";
const SIRUSERI_LINE_LAYER_ID = "sipcot-siruseri-footprint-line";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const auditDateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const planningSourceById = Object.fromEntries(omrPlanningLedger.sources.map((source) => [source.id, source]));

function formatRate(value: number) {
  return `₹${inr.format(value)}`;
}

function formatAuditTimestamp(value: string) {
  return auditDateTime.format(new Date(value));
}

function PlanningSiteMetrics({ record }: { record: PlanningEvidenceRecord }) {
  if (!("siteMetrics" in record)) return null;
  const metrics = record.siteMetrics;
  return (
    <div className="planning-site-evidence">
      <div className="planning-metric-strip">
        <span><strong>{metrics.siteAreaAsPerPattaSqm.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>m² patta area</span>
        <span><strong>{metrics.fsiFactor}</strong>approved FSI</span>
        <span><strong>{metrics.landLeftForRoadWideningSqm}</strong>m² road widening</span>
        <span><strong>{metrics.buildingHeightM}</strong>m height</span>
      </div>
      <small className="planning-permit-note">Local-body building permit required · current construction unknown</small>
    </div>
  );
}

function resolverStatusLabel(status: ReturnType<typeof resolveOmrPlace>["status"]) {
  return {
    empty: "Enter a verified place name",
    matched: "Exact jurisdiction match",
    ambiguous: "Choose the registration village",
    office: "Sub Registrar Office match",
    partial: "Partial verified-name match",
    scope: "OMR pilot scope",
    unresolved: "Crosswalk unresolved",
    none: "No verified match",
  }[status];
}

function chennaiResolverStatusLabel(status: ReturnType<typeof resolveChennaiRevenuePlace>["status"]) {
  return {
    empty: "Search the source inventory",
    matched: "Exact source-table match",
    taluk: "Official taluk listing",
    ambiguous: "Choose the taluk and village",
    partial: "Partial source-table match",
    none: "No verified source match",
  }[status];
}

function gradeCopy(grade: MarketArea["grade"]) {
  return {
    A: "Multiple recent official transactions with verified geometry",
    B: "Official evidence with moderate recency or location uncertainty",
    C: "Mixed official and market evidence",
    D: "Predominantly listing or broker evidence",
    E: "Insufficient price evidence",
  }[grade];
}

export default function MitoApp() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [selectedId, setSelectedId] = useState("sholinganallur");
  const [selectedCoverageKey, setSelectedCoverageKey] = useState<string | null>(null);
  const [selectedChennaiKey, setSelectedChennaiKey] = useState<string | null>(null);
  const [coverageScope, setCoverageScope] = useState<CoverageScope>("omr");
  const [activeView, setActiveView] = useState<View>("Coverage");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [evidenceMapReady, setEvidenceMapReady] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"Overview" | "Evidence" | "Context">("Overview");
  const [selectedComparables, setSelectedComparables] = useState<string[]>([
    "shol-nb-9600",
    "shol-nb-raman-thangal",
    "shol-housing-elcot",
  ]);

  const selected = marketAreas.find((area) => area.id === selectedId) ?? marketAreas[0];

  const filteredAreas = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return marketAreas;
    return marketAreas.filter((area) =>
      [area.name, area.tamilName, area.district, area.registrationOffice]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [query]);

  const coverageResolution = useMemo(() => resolveOmrPlace(query), [query]);
  const chennaiResolution = useMemo(() => resolveChennaiRevenuePlace(query), [query]);

  const filteredCoverageUnits = useMemo(() => {
    if (!query.trim()) return omrCoverage.units;
    return coverageResolution.matches.map((match) => match.unit);
  }, [coverageResolution, query]);

  const coverageMatchByKey = useMemo(
    () => new Map(coverageResolution.matches.map((match) => [match.key, match])),
    [coverageResolution],
  );

  const filteredChennaiUnits = useMemo(() => {
    if (!query.trim()) return chennaiRevenueUnits;
    return chennaiResolution.matches;
  }, [chennaiResolution, query]);

  const selectedChennaiUnit = selectedChennaiKey
    ? chennaiRevenueUnits.find((unit) => unit.key === selectedChennaiKey) ?? null
    : null;

  const selectedCoverageUnit = selectedCoverageKey
    ? omrCoverage.units.find((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}` === selectedCoverageKey) ?? null
    : null;
  const selectedCoverageEvidenceMatrix = selectedCoverageKey
    ? omrVillageEvidenceMatrix.find((entry) => entry.key === selectedCoverageKey) ?? null
    : null;
  const selectedCoverageOffice = selectedCoverageUnit
    ? omrCoverage.registrationOffices.find((office) => office.officialSroCode === selectedCoverageUnit.officialSroCode) ?? null
    : null;
  const selectedCoveragePlanningRecords = selectedCoverageUnit
    ? planningRecordsForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageArchivedRecords = selectedCoverageUnit
    ? archivedGuidelineRecordsForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageAllotmentRates = selectedCoverageUnit
    ? officialAllotmentRatesForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageAuctionReservePrices = selectedCoverageUnit
    ? officialAuctionReservePricesForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageCommercialAuctionReserves = selectedCoverageUnit
    ? officialCommercialAuctionReservesForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageHousingOffers = selectedCoverageUnit
    ? tnhbHousingOffersForCandidateVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageInventory = selectedCoverageUnit
    ? omrGuidelineOmrInventoryAudit.queries.find(
        (inventory) => inventory.officialSroCode === selectedCoverageUnit.officialSroCode && inventory.officialVillageCode === selectedCoverageUnit.officialVillageCode,
      ) ?? null
    : null;
  const selectedCoverageAliases = selectedCoverageUnit
    ? aliasesForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];

  const coverageInspectorName = coverageScope === "omr"
    ? selectedCoverageUnit?.nameEn ?? "OMR evidence programme"
    : selectedChennaiUnit?.name ?? "Chennai District expansion";
  const coverageInspectorSubtitle = coverageScope === "omr"
    ? selectedCoverageUnit ? `${selectedCoverageUnit.nameTa} · ${selectedCoverageOffice?.nameEn} SRO` : "Adyar → Mamallapuram · official jurisdiction ledger"
    : selectedChennaiUnit
      ? `${selectedChennaiUnit.talukName} taluk · ${selectedChennaiUnit.registrationCrosswalkStatus === "verified" ? "verified registration link" : "revenue source row"}`
      : `426 sq km · ${chennaiRevenueSummary.registrationCrosswalkCount} of ${chennaiRevenueSummary.sourceVillageCount} registration links verified`;
  const coverageInspectorEyebrow = coverageScope === "omr"
    ? selectedCoverageUnit ? "Verified registration village" : "Auditable coverage programme"
    : selectedChennaiUnit ? selectedChennaiUnit.registrationCrosswalkStatus === "verified" ? "Verified registration crosswalk" : "Official revenue source entry" : "Chennai expansion programme";

  const activeComparableRates = selected.comparables
    .filter((comparable) => selectedComparables.includes(comparable.id))
    .map((comparable) => comparable.pricePerSqft)
    .sort((a, b) => a - b);

  const selectArea = (area: MarketArea) => {
    setSelectedId(area.id);
    setInspectorTab("Overview");
    setSelectedComparables(area.comparables.map((item) => item.id));
    mapRef.current?.flyTo({ center: area.coordinate, zoom: area.id === "rs-puram" || area.id === "kk-nagar-madurai" ? 12.5 : 13.4, duration: 900 });
  };

  const selectCoverageUnit = (officialSroCode: string, officialVillageCode: string) => {
    const key = `${officialSroCode}:${officialVillageCode}`;
    setSelectedCoverageKey(key);
    setActiveView("Coverage");
    setInspectorTab("Overview");
    setQuery("");
    if (key === SIRUSERI_VILLAGE_KEY) {
      mapRef.current?.flyTo({ center: omrSiruseriFootprintCenter, zoom: 13.7, duration: 900 });
    }
  };

  const selectChennaiUnit = (key: string) => {
    setSelectedChennaiKey(key);
    setCoverageScope("chennai");
    setActiveView("Coverage");
    setInspectorTab("Overview");
    setQuery("");
  };

  const selectCoverageScope = (scope: CoverageScope) => {
    setCoverageScope(scope);
    setSelectedCoverageKey(null);
    setSelectedChennaiKey(null);
    setActiveView("Coverage");
    setInspectorTab("Overview");
    setQuery("");
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !mapContainer.current) return;
      const isMobileViewport = window.matchMedia("(max-width: 600px)").matches;
      const map = new maplibre.Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: isMobileViewport ? [80.226, 12.91] : [80.226, 12.974],
        zoom: isMobileViewport ? 10.8 : 10.35,
        minZoom: 5.4,
        maxZoom: 18,
        attributionControl: false,
      });
      map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
      mapRef.current = map;

      map.on("load", () => {
        map.addSource(SIRUSERI_SOURCE_ID, {
          type: "geojson",
          data: omrSiruseriFootprint,
          attribution: "© OpenStreetMap contributors",
        });
        map.addLayer({
          id: SIRUSERI_FILL_LAYER_ID,
          type: "fill",
          source: SIRUSERI_SOURCE_ID,
          paint: {
            "fill-color": "#4179a6",
            "fill-opacity": 0.16,
          },
        });
        map.addLayer({
          id: SIRUSERI_LINE_LAYER_ID,
          type: "line",
          source: SIRUSERI_SOURCE_ID,
          paint: {
            "line-color": "#275e8d",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
        map.on("click", SIRUSERI_FILL_LAYER_ID, () => selectCoverageUnit("22604", "800000275"));
        map.on("mouseenter", SIRUSERI_FILL_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", SIRUSERI_FILL_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        setEvidenceMapReady(true);
      });

      markersRef.current = marketAreas.map((area) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = area.price ? "map-price-marker" : "map-area-marker";
        button.setAttribute("aria-label", `Open ${area.name} evidence`);
        button.dataset.areaId = area.id;
        button.hidden = true;
        button.innerHTML = area.price
          ? `<span>${formatRate(area.price.midpoint)}</span><small>/sq ft</small>`
          : `<span>${area.grade}</span>`;
        button.addEventListener("click", () => selectArea(area));
        return new maplibre.Marker({ element: button, anchor: "bottom" }).setLngLat(area.coordinate).addTo(map);
      });
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-area-id]").forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.areaId === selectedId);
    });
  }, [selectedId]);

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      marker.getElement().hidden = activeView === "Coverage";
    });
  }, [activeView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !evidenceMapReady) return;
    const isVisible = activeView === "Coverage" && coverageScope === "omr";
    const isSelected = selectedCoverageKey === SIRUSERI_VILLAGE_KEY;
    for (const layerId of [SIRUSERI_FILL_LAYER_ID, SIRUSERI_LINE_LAYER_ID]) {
      map.setLayoutProperty(layerId, "visibility", isVisible ? "visible" : "none");
    }
    map.setPaintProperty(SIRUSERI_FILL_LAYER_ID, "fill-opacity", isSelected ? 0.25 : 0.16);
    map.setPaintProperty(SIRUSERI_LINE_LAYER_ID, "line-width", isSelected ? 3 : 2);
  }, [activeView, coverageScope, evidenceMapReady, selectedCoverageKey]);

  return (
    <main className="mito-shell">
      <div ref={mapContainer} className="map-canvas" aria-label="Interactive land evidence map of Tamil Nadu" />
      <div className="map-wash" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="brand-name">MITO</div>
            <div className="brand-subtitle">Tamil Nadu land intelligence</div>
          </div>
        </div>
        <div className="topbar-center">
          <button
            className="geography-button"
            type="button"
            aria-label={`Coverage scope: ${coverageScope === "omr" ? "OMR pilot" : "Chennai District"}. Switch scope.`}
            onClick={() => selectCoverageScope(coverageScope === "omr" ? "chennai" : "omr")}
          >
            <MapPin size={15} /> {coverageScope === "omr" ? "OMR pilot" : "Chennai District"} <ChevronDown size={14} />
          </button>
          <div className="release-pill"><span /> {coverageScope === "omr" ? "24 current inventories" : `${chennaiRevenueSummary.registrationCrosswalkCount} verified links · conflict open`}</div>
        </div>
        <div className="topbar-actions">
          <button className="text-button" type="button">தமிழ்</button>
          <button className="icon-button" type="button" aria-label="Help"><CircleHelp size={18} /></button>
          <button className="save-button" type="button">Save view</button>
        </div>
        <button className="mobile-menu-button" type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <section className="search-panel" aria-label="Search and filters">
        <div className="search-row">
          <Search size={18} />
          <input
            aria-label="Search locality, street, survey number or pincode"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={activeView === "Coverage"
              ? coverageScope === "omr" ? "Search village, Tamil name, SRO or ID" : "Search Chennai revenue village or taluk"
              : "Search street, locality, survey no."}
          />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}
          <kbd>⌘ K</kbd>
        </div>
        <div className="view-tabs" role="tablist" aria-label="Map view">
          {views.map((view) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={activeView === view}
              className={activeView === view ? "active" : ""}
              onClick={() => setActiveView(view)}
            >
              {view}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <button className="filter-chip active" type="button"><Building2 size={14} /> Residential plot <X size={13} /></button>
          <button className="filter-chip" type="button" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} /> More filters <span className="filter-count">2</span></button>
          <span className="filter-separator" />
          <span className="result-count">
            {activeView === "Coverage"
              ? coverageScope === "omr"
                ? coverageResolution.status === "unresolved" ? "crosswalk unresolved" : `${filteredCoverageUnits.length} ${filteredCoverageUnits.length === 1 ? "jurisdiction" : "jurisdictions"}`
                : `${filteredChennaiUnits.length} ${filteredChennaiUnits.length === 1 ? "source row" : "source rows"}`
              : `${filteredAreas.length} areas`}
          </span>
        </div>
        {filtersOpen && (
          <div className="filter-popover">
            <div><span>Price evidence</span><strong>Asking + official gaps</strong></div>
            <div><span>Confidence</span><strong>All grades</strong></div>
            <button type="button" onClick={() => setFiltersOpen(false)}>Done</button>
          </div>
        )}
      </section>

      <section className="coverage-strip" aria-label="Coverage summary">
        {coverageScope === "omr" ? (
          <>
            <div><strong>{omrCoverageSummary.jurisdictionVerifiedCount}/{omrCoverageSummary.unitCount}</strong><span>jurisdictions</span></div>
            <div><strong>{omrCoverageSummary.currentStreetInventoryVerifiedCount}/{omrCoverageSummary.unitCount}</strong><span>current inventories</span></div>
            <div><strong>{omrCoverageSummary.officialGuidelineRecordCount}</strong><span>publishable values</span></div>
            <div><strong>{omrCoverageSummary.officialPlanningRecordCount}</strong><span>planning records</span></div>
            <button type="button" onClick={() => selectCoverageScope("chennai")}><Database size={14} /> Expand to Chennai <ArrowUpRight size={13} /></button>
          </>
        ) : (
          <>
            <div><strong>{chennaiRevenueSummary.sourceVillageCount}</strong><span>source village rows</span></div>
            <div><strong>{chennaiRevenueSummary.talukGroupCount}</strong><span>listed taluk groups</span></div>
            <div><strong>{chennaiRevenueSummary.registrationCrosswalkCount}</strong><span>registration links</span></div>
            <div><strong>{chennaiRevenueSummary.publishableAuthoritativeGeometryCount}</strong><span>licensed geometries</span></div>
            <button type="button" onClick={() => selectCoverageScope("omr")}><Route size={14} /> Return to OMR pilot <ArrowUpRight size={13} /></button>
          </>
        )}
      </section>

      <section className={`area-list ${activeView === "Coverage" && query.trim() ? "mobile-resolver-open" : ""}`} aria-label="Matching areas">
        <div className="area-list-heading">
          <span>{activeView === "Coverage"
            ? query ? "Coverage matches" : coverageScope === "omr" ? "OMR target villages" : "Chennai source inventory"
            : query ? "Search results" : "Pilot markets"}</span>
          <button type="button" aria-label="Sort areas"><Filter size={14} /></button>
        </div>
        {activeView === "Coverage" && query.trim() && (
          <div className={`resolver-notice ${coverageScope === "omr" ? coverageResolution.status : chennaiResolution.status}`} role="status">
            <strong>{coverageScope === "omr" ? resolverStatusLabel(coverageResolution.status) : chennaiResolverStatusLabel(chennaiResolution.status)}</strong>
            <span>{coverageScope === "omr" ? coverageResolution.explanation : chennaiResolution.explanation}</span>
          </div>
        )}
        <div className="area-list-scroll">
          {activeView === "Coverage" ? (
            coverageScope === "omr" ? <>
              {filteredCoverageUnits.map((unit) => {
                const office = omrCoverage.registrationOffices.find((candidate) => candidate.officialSroCode === unit.officialSroCode);
                const planningRecordCount = planningRecordsForVillage(unit.officialSroCode, unit.officialVillageCode).length;
                const archivedRateCount = archivedGuidelineRecordsForVillage(unit.officialSroCode, unit.officialVillageCode).length;
                const auctionReserveRecordCount = officialAuctionReservePricesForVillage(unit.officialSroCode, unit.officialVillageCode).length;
                const commercialAuctionReserveRecordCount = officialCommercialAuctionReservesForVillage(unit.officialSroCode, unit.officialVillageCode).length;
                const totalAuctionReserveRecordCount = auctionReserveRecordCount + commercialAuctionReserveRecordCount;
                const hasCurrentInventory = "streetTargetEvidenceStatus" in unit && unit.streetTargetEvidenceStatus === "live_official_metadata";
                const unitKey = `${unit.officialSroCode}:${unit.officialVillageCode}`;
                const match = coverageMatchByKey.get(unitKey);
                return (
                  <button
                    key={unitKey}
                    type="button"
                    aria-pressed={selectedCoverageKey === unitKey}
                    className={`coverage-unit-card ${planningRecordCount ? "has-planning-evidence" : ""} ${archivedRateCount ? "has-guideline-snapshot" : ""} ${totalAuctionReserveRecordCount ? "has-auction-reserve" : ""} ${selectedCoverageKey === unitKey ? "selected" : ""}`}
                    onClick={() => selectCoverageUnit(unit.officialSroCode, unit.officialVillageCode)}
                  >
                    <div className="coverage-unit-index">{unit.sequence}</div>
                    <div>
                      <strong>{unit.nameEn}</strong>
                      <span>{unit.nameTa}</span>
                      <small>{query && match ? `Matched “${match.matchedAlias}” · ` : ""}{office?.nameEn} SRO · ID {unit.officialVillageCode}</small>
                    </div>
                    <div className="coverage-unit-state"><i /> jurisdiction<br /><b>{auctionReserveRecordCount ? `${auctionReserveRecordCount} direct land reserve · not sale` : commercialAuctionReserveRecordCount ? `${commercialAuctionReserveRecordCount} combined-asset reserve events · not sale` : hasCurrentInventory ? `${unit.streetTargetCount} current official ${unit.streetTargetCount === 1 ? "street" : "streets"} · values withheld` : archivedRateCount ? `${archivedRateCount} archived rate · recheck` : planningRecordCount ? `${planningRecordCount} CMDA ${planningRecordCount === 1 ? "record" : "records"}` : "street data pending"}</b></div>
                  </button>
                );
              })}
              {!filteredCoverageUnits.length && <div className="empty-list"><Search size={19} /><strong>{coverageResolution.status === "unresolved" ? "Crosswalk unresolved" : "No verified match"}</strong><span>{coverageResolution.explanation}</span></div>}
            </> : <>
              {filteredChennaiUnits.map((unit) => (
                <button
                  key={unit.key}
                  type="button"
                  aria-pressed={selectedChennaiKey === unit.key}
                  className={`coverage-unit-card chennai-source-card ${unit.registrationCrosswalkStatus === "verified" ? "crosswalk-verified" : unit.registrationCrosswalkStatus === "ambiguous" ? "crosswalk-ambiguous" : ""} ${selectedChennaiKey === unit.key ? "selected" : ""}`}
                  onClick={() => selectChennaiUnit(unit.key)}
                >
                  <div className="coverage-unit-index">{unit.talukSequence}.{unit.sequence}</div>
                  <div>
                    <strong>{unit.name}</strong>
                    <span>{unit.talukName} taluk · official source spelling</span>
                    <small>{unit.registrationCrosswalk
                      ? `${unit.registrationCrosswalk.officialSroName} SRO · village ID ${unit.registrationCrosswalk.officialVillageCode}`
                      : unit.crosswalkAmbiguity
                        ? `Candidate ${unit.crosswalkAmbiguity.candidateRegistrationVillageName} split unresolved`
                        : "Registration ID, Tamil alias and geometry pending"}</small>
                  </div>
                  <div className={`coverage-unit-state ${unit.registrationCrosswalkStatus === "verified" ? "crosswalk-linked" : unit.registrationCrosswalkStatus === "ambiguous" ? "crosswalk-pending" : "source-only"}`}>
                    <i /> {unit.registrationCrosswalkStatus === "verified" ? "verified link" : unit.registrationCrosswalkStatus === "ambiguous" ? "ambiguous" : "source row"}<br />
                    <b>{unit.registrationCrosswalk ? `${inr.format(unit.registrationCrosswalk.currentInventoryItemCount)} inventory items · values withheld` : "0 current values"}</b>
                  </div>
                </button>
              ))}
              {!filteredChennaiUnits.length && <div className="empty-list"><Search size={19} /><strong>No verified source match</strong><span>{chennaiResolution.explanation}</span></div>}
            </>
          ) : (
            <>
              {filteredAreas.map((area) => (
                <button key={area.id} className={`area-card ${selected.id === area.id ? "selected" : ""}`} type="button" onClick={() => selectArea(area)}>
                  <div className="area-card-top">
                    <div><strong>{area.name}</strong><span>{area.tamilName}</span></div>
                    <span className={`grade grade-${area.grade.toLowerCase()}`}>Grade {area.grade}</span>
                  </div>
                  <div className="area-card-price">
                    {area.price ? <><strong>{formatRate(area.price.low)}–{formatRate(area.price.high)}</strong><span>/ sq ft · asking</span></> : <><strong>Not enough evidence</strong><span>Price withheld</span></>}
                  </div>
                  <div className="area-card-meta"><span>{area.district}</span><span>{area.evidenceCount} evidence</span><span>{area.plottedEvidenceCount} exact</span></div>
                </button>
              ))}
              {!filteredAreas.length && <div className="empty-list"><Search size={19} /><strong>No exact match</strong><span>Try a locality, district, SRO or Tamil place name.</span></div>}
            </>
          )}
        </div>
      </section>

      <div className="map-legend">
        {activeView === "Coverage" ? (
          <>
            {coverageScope === "omr"
              ? <span><i className="legend-approx" /> 1 approximate OSM footprint · village geometry unplotted</span>
              : <span><i className="legend-gap" /> Village geometry unplotted</span>}
            <span>{coverageScope === "omr" ? "Search the verified jurisdiction ledger" : `${chennaiRevenueSummary.registrationCrosswalkCount} verified links · ${chennaiRevenueSummary.ambiguousRegistrationCrosswalkCount} ambiguities`}</span>
          </>
        ) : (
          <>
            <span><i className="legend-price" /> Asking-price evidence</span>
            <span><i className="legend-gap" /> Coverage gap</span>
          </>
        )}
        <button type="button"><Layers3 size={15} /> Layers</button>
      </div>

      {activeView !== "Coverage" && <button className="locate-button" type="button" aria-label="Return to selected area" onClick={() => selectArea(selected)}><LocateFixed size={18} /></button>}

      <aside className="inspector" aria-label={activeView === "Coverage" ? `${coverageInspectorName} coverage inspector` : `${selected.name} evidence inspector`}>
        <div className="inspector-handle" />
        <div className="inspector-head">
          <div className="eyebrow"><span className="live-dot" /> {activeView === "Coverage" ? coverageInspectorEyebrow : selected.propertyType}</div>
          <button
            type="button"
            className="inspector-close"
            aria-label={coverageScope === "omr" && selectedCoverageUnit ? "Back to OMR overview" : coverageScope === "chennai" && selectedChennaiUnit ? "Back to Chennai overview" : "Close inspector"}
            onClick={() => coverageScope === "omr" ? setSelectedCoverageKey(null) : setSelectedChennaiKey(null)}
          ><Minus size={18} /></button>
          <h1>{activeView === "Coverage" ? coverageInspectorName : selected.name}</h1>
          <p>{activeView === "Coverage" ? coverageInspectorSubtitle : `${selected.tamilName} · ${selected.district}`}</p>
          <div className="inspector-price">
            {activeView === "Coverage" ? (
              coverageScope === "omr"
                ? selectedCoverageUnit
                  ? selectedCoverageAuctionReservePrices.length
                    ? <><strong>{formatRate(selectedCoverageAuctionReservePrices[0].derivedReservePriceRangeInrPerSqft.low)}–{formatRate(selectedCoverageAuctionReservePrices[0].derivedReservePriceRangeInrPerSqft.high)}</strong><span>per sq ft · liquidation reserve</span></>
                    : <><strong>{inr.format(selectedCoverageUnit.streetTargetCount)}</strong><span>current official inventory items</span></>
                  : <><strong>{omrCoveragePercent.streetRegister}%</strong><span>verified street registers</span></>
                : selectedChennaiUnit
                  ? selectedChennaiUnit.registrationCrosswalk
                    ? <><strong>{inr.format(selectedChennaiUnit.registrationCrosswalk.currentInventoryItemCount)}</strong><span>current official inventory items</span></>
                    : <><strong>0</strong><span>current official values</span></>
                  : <><strong>{chennaiRevenueSummary.registrationCrosswalkCount}</strong><span>verified registration links</span></>
            ) : selected.price ? (
              <><strong>{formatRate(selected.price.low)}–{formatRate(selected.price.high)}</strong><span>per sq ft</span></>
            ) : (
              <><strong>Insufficient evidence</strong><span>No value published</span></>
            )}
          </div>
          <div className="price-type"><Info size={14} /> {activeView === "Coverage"
            ? coverageScope === "omr"
              ? selectedCoverageUnit
                ? selectedCoverageAuctionReservePrices.length
                  ? "Official 2025 liquidation reserve · auction outcome price unknown"
                  : selectedCoverageCommercialAuctionReserves.length
                    ? "Two official combined-asset reserves · auction outcome price unknown"
                    : selectedCoverageAllotmentRates.length
                    ? `${selectedCoverageAllotmentRates.length} official leasehold allotment rates · not market prices`
                    : selectedCoverageHousingOffers.length
                      ? `${selectedCoverageHousingOffers.length} closed TNHB apartment price records · locality crosswalk unresolved`
                      : "0 current values published · row access pending"
                : "Jurisdictions are mapped; price evidence is not complete"
              : selectedChennaiUnit
                ? selectedChennaiUnit.registrationCrosswalkStatus === "verified"
                  ? "Registration identity verified · 0 current values published"
                  : selectedChennaiUnit.registrationCrosswalkStatus === "ambiguous"
                    ? "Registration split unresolved · 0 current values published"
                    : "Registration crosswalk and price evidence pending"
                : "Nine registration links verified · Chennai is not complete"
            : selected.price?.type ?? "MITO will not manufacture a price"}</div>
        </div>

        <div className="inspector-tabs" role="tablist">
          {(["Overview", "Evidence", "Context"] as const).map((tabName) => (
            <button key={tabName} type="button" role="tab" aria-selected={inspectorTab === tabName} className={inspectorTab === tabName ? "active" : ""} onClick={() => setInspectorTab(tabName)}>{tabName}</button>
          ))}
        </div>

        <div className="inspector-scroll">
          {activeView === "Coverage" && coverageScope === "omr" && inspectorTab === "Overview" && (
            selectedCoverageUnit && selectedCoverageInventory ? (
              <>
                <section className="confidence-card coverage-confidence">
                  <div className="confidence-badge"><MapPin size={17} /></div>
                  <div><strong>Official registration jurisdiction resolved</strong><span>SRO {selectedCoverageUnit.officialSroCode} · village {selectedCoverageUnit.officialVillageCode} · exact source-backed crosswalk</span></div>
                  <ShieldCheck size={20} />
                </section>

                <section className="live-register-card">
                  <div><Database size={17} /></div>
                  <p><strong>{inr.format(selectedCoverageInventory.displayedItemCount)} current official inventory items</strong><span>TNREGINET label: {selectedCoverageInventory.guidelineVillageName} · checked {formatAuditTimestamp(selectedCoverageInventory.displayedResultTimestamp)}</span></p>
                  <em>Metadata</em>
                </section>

                {selectedCoverageAuctionReservePrices.length > 0 && (
                  <section className="auction-evidence-card">
                    <div><Database size={17} /></div>
                    <p><strong>1 official liquidation reserve record</strong><span>₹192.33 crore · 9.80 document acres · auction concluded, outcome price unpublished</span></p>
                    <em>Reserve price, not sale</em>
                  </section>
                )}

                {selectedCoverageCommercialAuctionReserves.length > 0 && (
                  <section className="auction-evidence-card">
                    <div><Building2 size={17} /></div>
                    <p><strong>{selectedCoverageCommercialAuctionReserves.length} official combined-asset reserve events</strong><span>₹32.00 crore → ₹28.10 crore · Plot A-17, Siruseri · outcomes unpublished</span></p>
                    <em>Land + building, not land rate</em>
                  </section>
                )}

                {selectedCoverageAllotmentRates.length > 0 && (
                  <section className="allotment-evidence-card">
                    <div><Building2 size={17} /></div>
                    <p><strong>{selectedCoverageAllotmentRates.length} official SIPCOT allotment rates</strong><span>Siruseri IT Park · 99-year leasehold plot cost · retrieved 17 Jul 2026</span></p>
                    <em>Not market price</em>
                  </section>
                )}

                {selectedCoverageHousingOffers.length > 0 && (
                  <section className="housing-evidence-card">
                    <div><Building2 size={17} /></div>
                    <p><strong>{selectedCoverageHousingOffers.length} official TNHB residential price records</strong><span>Closed original apartment offers · unresolved between Sholinganallur 1 and 2</span></p>
                    <em>Not land price</em>
                  </section>
                )}

                {selectedCoverageAllotmentRates.length > 0 && (
                  <section className="geometry-evidence-card">
                    <div><Layers3 size={17} /></div>
                    <p><strong>Approximate open-data footprint published</strong><span>OSM way {omrSiruseriGeometryAudit.openSource.objectId} · partial versus official SIPCOT GIS boundary</span></p>
                    <em>Not official</em>
                  </section>
                )}

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Official identity</span><h2>Registration crosswalk</h2></div><Route size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>Sub Registrar Office</dt><dd>{selectedCoverageOffice?.nameEn}</dd></div>
                    <div><dt>Official SRO ID</dt><dd>{selectedCoverageUnit.officialSroCode}</dd></div>
                    <div><dt>Official village ID</dt><dd>{selectedCoverageUnit.officialVillageCode}</dd></div>
                    <div><dt>Portal village label</dt><dd>{selectedCoverageInventory.guidelineVillageName}</dd></div>
                  </dl>
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Evidence status</span><h2>What MITO can prove here</h2></div><ShieldCheck size={17} /></div>
                  <div className="planning-evidence-summary village-evidence-summary">
                    <div><strong>{selectedCoveragePlanningRecords.length}</strong><span>planning records</span></div>
                    <div><strong>{selectedCoverageArchivedRecords.length}</strong><span>archived values</span></div>
                    <div><strong>{selectedCoverageAuctionReservePrices.length + selectedCoverageCommercialAuctionReserves.length}</strong><span>auction reserves</span></div>
                    <div><strong>{selectedCoverageHousingOffers.length}</strong><span>unresolved housing prices</span></div>
                    <div><strong>0</strong><span>current values</span></div>
                  </div>
                  <p className="coverage-method">The official inventory size and jurisdiction are verified. {selectedCoverageAuctionReservePrices.length ? "One exact-village liquidation reserve is published, but the winning bid, registered transfer and parcel geometry remain unavailable." : selectedCoverageCommercialAuctionReserves.length ? "Two reserve observations are published for one Siruseri commercial asset, but they combine land and building, have no verified auction outcome and use only a named park association." : selectedCoverageAllotmentRates.length ? "Siruseri has one approximate park footprint; individual streets, transactions, parcels and legal boundaries remain unpublished." : selectedCoverageHousingOffers.length ? "TNHB names Sholinganallur but does not identify which registration subdivision applies, so these closed apartment prices are excluded from direct village and land-price totals." : "Individual streets, prices, transactions, parcels and legal boundaries remain unpublished."}</p>
                </section>

                {selectedCoverageEvidenceMatrix && (
                  <section className="inspector-section source-audit-section">
                    <div className="section-heading"><div><span>Area evidence matrix</span><h2>Source-by-source audit</h2></div><Database size={17} /></div>
                    <div className="source-audit-list">
                      <div><span>Current official register</span><strong>{inr.format(selectedCoverageEvidenceMatrix.currentGuidelineRegister.displayedItemCount)} inventory items · values withheld</strong></div>
                      <div><span>TNHB public sales</span><strong>{selectedCoverageEvidenceMatrix.tnhbPublicSales.status === "unresolved_locality_match" ? `${selectedCoverageEvidenceMatrix.tnhbPublicSales.unresolvedRecordCount} unresolved locality records` : "No normalized place-name match in 17 Jul snapshot"}</strong></div>
                      <div><span>SIPCOT land schedule</span><strong>{selectedCoverageEvidenceMatrix.governmentAllotment.recordCount ? `${selectedCoverageEvidenceMatrix.governmentAllotment.recordCount} named park rates` : "No named park association"}</strong></div>
                      <div><span>IBBI liquidation auction</span><strong>{selectedCoverageEvidenceMatrix.officialAuctionReservePrices.recordCount ? "1 direct land reserve · outcome price unknown" : selectedCoverageEvidenceMatrix.officialCommercialAuctionReserves.recordCount ? `${selectedCoverageEvidenceMatrix.officialCommercialAuctionReserves.recordCount} named-park combined reserves · outcomes unknown` : "No record in current ledger"}</strong></div>
                      <div><span>CMDA planning</span><strong>{selectedCoverageEvidenceMatrix.planning.directRecordCount ? `${selectedCoverageEvidenceMatrix.planning.directRecordCount} direct ${selectedCoverageEvidenceMatrix.planning.directRecordCount === 1 ? "record" : "records"}` : "No direct record in current ledger"}</strong></div>
                      <div className="blocked"><span>Registered land transactions</span><strong>0 verified records</strong></div>
                      <div className="blocked"><span>Market land value</span><strong>Not released · insufficient evidence</strong></div>
                    </div>
                    <p className="coverage-method">A source non-match is a dated audit result, not evidence that no property, approval or scheme exists. Every missing source stays visible until MITO obtains direct, reusable evidence.</p>
                  </section>
                )}

                {selectedCoverageAllotmentRates.length > 0 && (
                  <section className="inspector-section">
                    <div className="section-heading"><div><span>Government allotment schedule</span><h2>Siruseri IT Park plot cost</h2></div><Building2 size={17} /></div>
                    <div className="allotment-rate-list">
                      {selectedCoverageAllotmentRates.map((record) => (
                        <article key={record.id} className="allotment-rate-card">
                          <div><span>{record.propertyClass.replaceAll("_", " ")}</span><em>{record.availableAreaAcres} acre available</em></div>
                          <strong>{formatRate(record.normalizedInrPerSqft)}<small>/sq ft</small></strong>
                          <p>₹{inr.format(record.rawPlotCostLakhsPerAcre)} lakh/acre · 99-year leasehold</p>
                        </article>
                      ))}
                    </div>
                    <p className="coverage-method">Normalized from SIPCOT&apos;s displayed lakh/acre schedule using 43,560 sq ft per acre. It is not a guideline value, registered sale, asking price, market estimate or village-wide rate.</p>
                  </section>
                )}

                {selectedCoverageAuctionReservePrices.length > 0 && (
                  <section className="inspector-section auction-reserve-section">
                    <div className="section-heading"><div><span>Official liquidation auction</span><h2>Sholinganallur 1 land reserve</h2></div><Database size={17} /></div>
                    {selectedCoverageAuctionReservePrices.map((record) => (
                      <article key={record.id} className="auction-reserve-card">
                        <div><span>{record.propertyClass.replaceAll("_", " ")}</span><em>Auction concluded</em></div>
                        <strong>{formatRate(record.derivedReservePriceRangeInrPerSqft.low)}–{formatRate(record.derivedReservePriceRangeInrPerSqft.high)}<small>/sq ft</small></strong>
                        <p>₹192.33 crore reserve · 9.80 document acres versus 9.7808 patta acres</p>
                        <footer><span>Auction 12 Aug 2025</span><b>Unplotted</b></footer>
                      </article>
                    ))}
                    <p className="coverage-method">The range uses both area totals printed in the official notice. The later order confirms the auction process concluded, but no winning bid, sale certificate or registered consideration is published.</p>
                  </section>
                )}

                {selectedCoverageCommercialAuctionReserves.length > 0 && (
                  <section className="inspector-section auction-reserve-section">
                    <div className="section-heading"><div><span>Official liquidation auction</span><h2>Siruseri commercial reserve timeline</h2></div><Building2 size={17} /></div>
                    {selectedCoverageCommercialAuctionReserves.map((record) => (
                      <article key={record.id} className="auction-reserve-card">
                        <div><span>combined land + building</span><em>{record.auctionDate === "2022-11-03" ? "re-auction" : "auction"}</em></div>
                        <strong>{formatRate(record.derivedCombinedReserveInrPerBuildingSqft)}<small>/building sq ft</small></strong>
                        <p>₹{(record.totalReservePriceInr / 10_000_000).toFixed(2)} crore reserve · 1 acre land + {inr.format(record.buildingAreaSqft)} sq ft building</p>
                        <footer><span>Auction {new Date(`${record.auctionDate}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span><b>Unplotted</b></footer>
                      </article>
                    ))}
                    <p className="coverage-method">The normalized figure divides each combined reserve by building area only so the two notices can be compared. It is not a land rate or building-only valuation. The later reserve is 12.19% lower; neither auction&apos;s winning bid or transfer is published.</p>
                  </section>
                )}

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Village release gate</span><h2>Price evidence is not complete</h2></div><LockKeyhole size={17} /></div>
                  <div className="gate-row passed"><Check size={14} /><span>Official SRO and village identifiers verified</span></div>
                  <div className="gate-row passed"><Check size={14} /><span>Current official inventory total verified</span></div>
                  {selectedCoverageAllotmentRates.length > 0 && <div className="gate-row passed"><Check size={14} /><span>Two official SIPCOT leasehold allotment rates captured separately</span></div>}
                  {selectedCoverageAllotmentRates.length > 0 && <div className="gate-row passed"><Check size={14} /><span>One ODbL approximate park footprint published with attribution</span></div>}
                  {selectedCoverageHousingOffers.length > 0 && <div className="gate-row passed"><Check size={14} /><span>Eight official TNHB historical apartment prices captured separately</span></div>}
                  {selectedCoverageHousingOffers.length > 0 && <div className="gate-row"><X size={14} /><span>TNHB locality not resolved to Sholinganallur registration village 1 or 2</span></div>}
                  {selectedCoverageAuctionReservePrices.length > 0 && <div className="gate-row passed"><Check size={14} /><span>Official liquidation reserve and document/patta areas captured</span></div>}
                  {selectedCoverageAuctionReservePrices.length > 0 && <div className="gate-row"><X size={14} /><span>Auction winning bid and registered transfer are not published</span></div>}
                  {selectedCoverageCommercialAuctionReserves.length > 0 && <div className="gate-row passed"><Check size={14} /><span>Two official Siruseri combined-asset reserve observations reconciled</span></div>}
                  {selectedCoverageCommercialAuctionReserves.length > 0 && <div className="gate-row"><X size={14} /><span>Land-only value, winning bids, registered transfer and exact asset geometry are not published</span></div>}
                  <div className="gate-row"><X size={14} /><span>Authorized row-level guideline values not captured</span></div>
                  <div className="gate-row"><X size={14} /><span>No verified registered transactions in MITO yet</span></div>
                </section>

                <section className="gap-card"><AlertTriangle size={18} /><div><strong>{selectedCoverageAuctionReservePrices.length || selectedCoverageCommercialAuctionReserves.length ? "Do not treat an auction reserve as a completed sale" : "Do not treat the inventory count as a price"}</strong><p>{selectedCoverageAuctionReservePrices.length ? "₹4,505–₹4,514 per sq ft is the normalized floor set for one 2025 liquidation auction. It does not establish the winning bid, current market value or a village-wide rate." : selectedCoverageCommercialAuctionReserves.length ? "₹1,965–₹2,237 per building sq ft is a comparison of two floors for one combined land-and-building asset. It is not a land price, winning bid, registered consideration or village-wide Siruseri value." : `${selectedCoverageInventory.displayedItemCount} is the number of official register items returned for this village. MITO publishes no current ₹/sq ft figure until authorized row data or independently verified transaction evidence is available.`}</p></div></section>
              </>
            ) : (
            <>
              <section className="confidence-card coverage-confidence">
                <div className="confidence-badge"><Route size={17} /></div>
                <div><strong>{omrPlanningSummary.recordCount} official planning records captured</strong><span>{omrPlanningSummary.villageCount} villages linked · {omrPlanningSummary.unresolvedRecordCount} records awaiting crosswalk</span></div>
                <ShieldCheck size={20} />
              </section>

              <section className="snapshot-evidence-card">
                <div><Database size={17} /></div>
                <p><strong>{omrGuidelineSnapshotSummary.recordCount} archived TNREGINET street row recovered</strong><span>Sholinganallur 1 · ₹4,400/sq ft · live official recheck pending</span></p>
                <em>Not current</em>
              </section>

              <section className="live-register-card">
                <div><ShieldCheck size={17} /></div>
                <p><strong>All current village inventories verified</strong><span>{inr.format(omrGuidelineLiveRegisterSummary.currentInventoryCount)} items across {omrGuidelineLiveRegisterSummary.auditedVillageCount} OMR villages · checked 16 Jul 2026</span></p>
                <em>Rows withheld</em>
              </section>

              <section className="allotment-evidence-card">
                <div><Building2 size={17} /></div>
                <p><strong>{omrOfficialAllotmentRateSummary.recordCount} official SIPCOT allotment rates captured</strong><span>Siruseri IT Park · industrial and commercial · 99-year leasehold plot cost</span></p>
                <em>Not market price</em>
              </section>

              <section className="housing-evidence-card">
                <div><Building2 size={17} /></div>
                <p><strong>{omrTnhbHousingOfferSummary.recordCount} official TNHB residential price records</strong><span>Sholinganallur · closed original apartment offers · combined price, not land price</span></p>
                <em>Crosswalk unresolved</em>
              </section>

              <section className="auction-evidence-card">
                <div><Database size={17} /></div>
                <p><strong>{omrOfficialAuctionReservePriceSummary.recordCount} official liquidation reserve record</strong><span>Sholinganallur 1 · ₹4,505–₹4,514/sq ft derived reserve · auction outcome price unknown</span></p>
                <em>Reserve price, not sale</em>
              </section>

              <section className="auction-evidence-card">
                <div><Building2 size={17} /></div>
                <p><strong>{omrOfficialCommercialAuctionReserveSummary.recordCount} Siruseri commercial reserve events</strong><span>One Plot A-17 combined asset · ₹32.00 crore → ₹28.10 crore · outcomes unknown</span></p>
                <em>Land + building, not land rate</em>
              </section>

              <section className="geometry-evidence-card">
                <div><Layers3 size={17} /></div>
                <p><strong>{omrOfficialAllotmentRateSummary.sharedPublishableGeometryCount} approximate footprint published</strong><span>SIPCOT Siruseri · OpenStreetMap ODbL · official GIS used for comparison only</span></p>
                <em>Partial</em>
              </section>

              <section className="inspector-section">
                <div className="section-heading"><div><span>Collection progress</span><h2>What is actually complete</h2></div><Database size={17} /></div>
                <div className="coverage-progress-row"><div><span>Jurisdiction IDs</span><strong>{omrCoveragePercent.jurisdiction}%</strong></div><div className="coverage-progress"><i style={{ width: `${omrCoveragePercent.jurisdiction}%` }} /></div><small>{omrCoverageSummary.jurisdictionVerifiedCount} of {omrCoverageSummary.unitCount} verified against TNREGINET</small></div>
                <div className="coverage-progress-row"><div><span>Current inventories</span><strong>{omrCoveragePercent.currentInventory}%</strong></div><div className="coverage-progress current-inventory"><i style={{ width: `${omrCoveragePercent.currentInventory}%` }} /></div><small>{omrCoverageSummary.currentStreetInventoryVerifiedCount} of {omrCoverageSummary.unitCount} village totals verified from the current official register</small></div>
                <div className="coverage-progress-row"><div><span>Captured street registers</span><strong>{omrCoveragePercent.streetRegister}%</strong></div><div className="coverage-progress"><i style={{ width: `${omrCoveragePercent.streetRegister}%` }} /></div><small>{inr.format(omrGuidelineLiveRegisterSummary.currentInventoryCount)} current items are inventoried, but zero row-level values are captured or republished</small></div>
                <div className="coverage-progress-row"><div><span>Current verified values</span><strong>{omrCoverageSummary.officialGuidelineRecordCount}</strong></div><div className="coverage-progress"><i style={{ width: "0%" }} /></div><small>{omrGuidelineSnapshotSummary.recordCount} archived row is shown separately and excluded from this total</small></div>
                <div className="coverage-progress-row"><div><span>Official allotment rates</span><strong>{omrCoverageSummary.officialAllotmentRateCount}</strong></div><div className="coverage-progress allotment"><i style={{ width: `${Math.round((omrCoverageSummary.officialAllotmentRateVillageCount / omrCoverageSummary.unitCount) * 100)}%` }} /></div><small>One named park association; these leasehold plot costs do not count as guideline or transaction coverage</small></div>
                <div className="coverage-progress-row"><div><span>Official housing price records</span><strong>{omrCoverageSummary.officialHousingOfferCount}</strong></div><div className="coverage-progress housing"><i style={{ width: "0%" }} /></div><small>{omrCoverageSummary.closedOfficialHousingOfferCount} closed TNHB apartment offers · zero direct village links and zero land-price records</small></div>
                <div className="coverage-progress-row"><div><span>Official auction reserve prices</span><strong>{omrCoverageSummary.officialAuctionReservePriceCount}</strong></div><div className="coverage-progress auction"><i style={{ width: `${Math.round((omrCoverageSummary.officialAuctionReservePriceVillageCount / omrCoverageSummary.unitCount) * 100)}%` }} /></div><small>One exact-village liquidation reserve · zero winning-bid or registered-transaction records</small></div>
                <div className="coverage-progress-row"><div><span>Commercial auction reserve history</span><strong>{omrCoverageSummary.officialCommercialAuctionReserveCount}</strong></div><div className="coverage-progress auction"><i style={{ width: `${Math.round((omrCoverageSummary.officialCommercialAuctionNamedParkAssociationCount / omrCoverageSummary.unitCount) * 100)}%` }} /></div><small>One Siruseri combined land-and-building asset · named park association · zero winning-bid or land-rate records</small></div>
                <div className="coverage-progress-row"><div><span>Publishable approximate geometries</span><strong>{omrCoverageSummary.publishableApproximateGeometryCount}</strong></div><div className="coverage-progress geometry"><i style={{ width: `${Math.round((omrCoverageSummary.publishableApproximateGeometryCount / omrCoverageSummary.unitCount) * 100)}%` }} /></div><small>One named OSM park footprint · zero exact, official or cadastral geometries published</small></div>
                <div className="coverage-progress-row"><div><span>Planning evidence</span><strong>{omrCoveragePercent.planning}%</strong></div><div className="coverage-progress planning"><i style={{ width: `${omrCoveragePercent.planning}%` }} /></div><small>{omrPlanningSummary.villageCount} of {omrCoverageSummary.unitCount} villages have directly linked CMDA records</small></div>
              </section>

              <section className="inspector-section">
                <div className="section-heading"><div><span>Release gate</span><h2>OMR cannot pass yet</h2></div><LockKeyhole size={17} /></div>
                <div className="gate-row passed"><Check size={14} /><span>24 corridor jurisdictions carry official IDs</span></div>
                <div className="gate-row passed"><Check size={14} /><span>All 24 jurisdictions have a current official inventory total</span></div>
                <div className="gate-row"><X size={14} /><span>100% of official street records must be captured</span></div>
                <div className="gate-row"><X size={14} /><span>Each record needs source and verification dates</span></div>
              </section>

              <section className="gap-card"><AlertTriangle size={18} /><div><strong>Row-level publication needs permission</strong><p>All 24 current village inventories are verified, but their item counts are coverage metadata—not permission to copy the register. {omrGuidelineOmrInventoryAudit.publication.nextAction}</p></div></section>
            </>
            )
          )}

          {activeView === "Coverage" && coverageScope === "omr" && inspectorTab === "Evidence" && (
            selectedCoverageUnit && selectedCoverageInventory ? (
              <>
                {selectedCoverageAuctionReservePrices.length > 0 && (
                  <section className="inspector-section evidence-section auction-source-section">
                    <div className="section-heading"><div><span>Official reserve-price evidence</span><h2>IBBI and NCLT source chain</h2></div><Database size={17} /></div>
                    {omrOfficialAuctionReservePriceLedger.sources.map((source) => (
                      <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-card auction-source">
                        <span className="source-kind official">{source.sourceType.startsWith("judicial") ? "order" : "official"}</span>
                        <div><strong>{source.title}</strong><p>{source.organization}</p><small>{source.publicationDate} · pages {source.pagesInspected.join(", ")} · factual excerpt only</small></div>
                        <ExternalLink size={15} />
                      </a>
                    ))}
                    {selectedCoverageAuctionReservePrices.map((record) => (
                      <article key={record.id} className="auction-reserve-card detailed">
                        <div><span>{record.priceTypeLabel}</span><em>{record.lifecycleStatus.replaceAll("_", " ")}</em></div>
                        <strong>{formatRate(record.derivedReservePriceRangeInrPerSqft.low)}–{formatRate(record.derivedReservePriceRangeInrPerSqft.high)}<small>/sq ft</small></strong>
                        <p>₹192.33 crore reserve divided by 426,888 document sq ft and 426,051.648 patta sq ft.</p>
                        <footer><span>Winning bid: unpublished</span><b>Direct village link</b></footer>
                      </article>
                    ))}
                    <p className="coverage-method">{omrOfficialAuctionReservePriceLedger.publication.caveat} The source&apos;s current Chennai and historical Kancheepuram district labels, plus its deed-count ambiguity, are preserved rather than silently reconciled.</p>
                  </section>
                )}

                {selectedCoverageCommercialAuctionReserves.length > 0 && (
                  <section className="inspector-section evidence-section auction-source-section">
                    <div className="section-heading"><div><span>Official combined-asset reserve evidence</span><h2>IBBI Siruseri source chain</h2></div><Building2 size={17} /></div>
                    {omrOfficialCommercialAuctionReserveLedger.sources.map((source) => (
                      <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-card auction-source">
                        <span className="source-kind official">official</span>
                        <div><strong>{source.title}</strong><p>{source.organization}</p><small>{("publicationDate" in source ? source.publicationDate : source.indexPublicationDate)} · pages {source.pagesInspected.join(", ")} · factual excerpt only</small></div>
                        <ExternalLink size={15} />
                      </a>
                    ))}
                    {selectedCoverageCommercialAuctionReserves.map((record) => (
                      <article key={record.id} className="auction-reserve-card detailed">
                        <div><span>{record.priceTypeLabel}</span><em>{record.lifecycleStatus.replaceAll("_", " ")}</em></div>
                        <strong>{formatRate(record.derivedCombinedReserveInrPerBuildingSqft)}<small>/building sq ft</small></strong>
                        <p>₹{(record.totalReservePriceInr / 10_000_000).toFixed(2)} crore combined reserve divided by {inr.format(record.buildingAreaSqft)} building sq ft.</p>
                        <footer><span>Winning bid: unpublished</span><b>Named park association</b></footer>
                      </article>
                    ))}
                    <p className="coverage-method">{omrOfficialCommercialAuctionReserveLedger.publication.caveat} The asset stays unplotted; MITO does not reuse the approximate Siruseri park footprint as Plot A-17 geometry.</p>
                  </section>
                )}

                {selectedCoverageAllotmentRates.length > 0 && (
                  <section className="inspector-section evidence-section">
                    <div className="section-heading"><div><span>Official allotment evidence</span><h2>SIPCOT Siruseri schedule</h2></div><Building2 size={17} /></div>
                    <a href={omrOfficialAllotmentRateLedger.source.url} target="_blank" rel="noreferrer" className="source-card allotment-source">
                      <span className="source-kind official">official</span>
                      <div><strong>{omrOfficialAllotmentRateLedger.source.title}</strong><p>{omrOfficialAllotmentRateLedger.source.organization}</p><small>Retrieved {omrOfficialAllotmentRateLedger.source.retrievedAt} · no effective date displayed · factual excerpt only</small></div>
                      <ExternalLink size={15} />
                    </a>
                    <a href={omrSiruseriGeometryAudit.openSource.sourceUrl} target="_blank" rel="noreferrer" className="source-card geometry-publishable-source">
                      <span className="source-kind open-data">open data</span>
                      <div><strong>{omrSiruseriGeometryAudit.openSource.title} approximate footprint</strong><p>{omrSiruseriGeometryAudit.openSource.organization}</p><small>Way {omrSiruseriGeometryAudit.openSource.objectId} · version {omrSiruseriGeometryAudit.openSource.version} · ODbL · partial footprint</small></div>
                      <ExternalLink size={15} />
                    </a>
                    <a href={omrSiruseriGeometryAudit.officialSource.landingPageUrl} target="_blank" rel="noreferrer" className="source-card geometry-verification-source">
                      <span className="source-kind snapshot">verify only</span>
                      <div><strong>{omrSiruseriGeometryAudit.officialSource.title}</strong><p>{omrSiruseriGeometryAudit.officialSource.organization}</p><small>{omrSiruseriGeometryAudit.officialSource.rightsStatus.replaceAll("_", " ")} · coordinates excluded from MITO</small></div>
                      <ExternalLink size={15} />
                    </a>
                    <div className="allotment-rate-list">
                      {selectedCoverageAllotmentRates.map((record) => (
                        <article key={record.id} className="allotment-rate-card detailed">
                          <div><span>{record.priceTypeLabel}</span><em>{record.verificationStatus.replaceAll("_", " ")}</em></div>
                          <strong>{formatRate(record.normalizedInrPerSqft)}<small>/sq ft</small></strong>
                          <p>Source: ₹{inr.format(record.rawPlotCostLakhsPerAcre)} lakh/acre · {record.availableAreaAcres} acre shown available</p>
                          <footer><span>99-year leasehold</span><b>Approximate shared footprint</b></footer>
                        </article>
                      ))}
                    </div>
                    <p className="coverage-method">{omrOfficialAllotmentRateLedger.publication.caveat}</p>
                  </section>
                )}

                {selectedCoverageHousingOffers.length > 0 && (
                  <section className="inspector-section evidence-section housing-offer-section">
                    <div className="section-heading"><div><span>Unresolved locality evidence</span><h2>TNHB Sholinganallur offers</h2></div><Building2 size={17} /></div>
                    <a href={omrTnhbHousingOfferLedger.source.url} target="_blank" rel="noreferrer" className="source-card housing-source">
                      <span className="source-kind official">official</span>
                      <div><strong>{omrTnhbHousingOfferLedger.source.title}</strong><p>{omrTnhbHousingOfferLedger.source.organization}</p><small>{omrTnhbHousingOfferSummary.recordCount} targeted factual records from a {omrTnhbHousingOfferLedger.source.sourceResponseRecordCount}-record public response · contacts, media and geotags excluded</small></div>
                      <ExternalLink size={15} />
                    </a>
                    <div className="housing-offer-warning"><AlertTriangle size={16} /><div><strong>Not assigned to this village</strong><p>TNHB names Sholinganallur but does not distinguish registration village 1 from 2. MITO shows the same unresolved evidence to both candidates and excludes it from direct village totals.</p></div></div>
                    <div className="housing-offer-list">
                      {selectedCoverageHousingOffers.map((record) => (
                        <article key={record.id} className="housing-offer-card">
                          <div><span>{record.schemeType} · {record.unitType}</span><em>{record.offerStatusAtAudit}</em></div>
                          <h3>{record.schemeName}</h3>
                          <strong>{formatRate(record.derivedCombinedPriceInrPerPlinthSqft)}<small>/plinth sq ft</small></strong>
                          <p>₹{inr.format(record.originalSellingPriceInr)} combined original price · {inr.format(record.plinthAreaSqft)} sq ft plinth · {inr.format(record.undividedShareAreaSqft)} sq ft UDS</p>
                          <footer><span>Price date {record.priceDate}</span><b>Code {record.schemeCode}</b></footer>
                        </article>
                      ))}
                    </div>
                    <p className="coverage-method">The per-square-foot figure is total original apartment price divided by plinth area. MITO does not divide by UDS because that would falsely present the building component as land value. Every booking window is closed and the portal marks each record unpublished.</p>
                  </section>
                )}

                <section className="inspector-section evidence-section">
                  <div className="section-heading"><div><span>Current register</span><h2>Official inventory query</h2></div><Database size={17} /></div>
                  <a href={omrGuidelineOmrInventoryAudit.source.url} target="_blank" rel="noreferrer" className="source-card live-source">
                    <span className="source-kind official">official</span>
                    <div><strong>{omrGuidelineOmrInventoryAudit.source.title}</strong><p>{omrGuidelineOmrInventoryAudit.source.organization}</p><small>Source updated {omrGuidelineOmrInventoryAudit.source.sourceLastUpdatedAt} · rates effective {omrGuidelineOmrInventoryAudit.source.ratesEffectiveFrom}</small></div>
                    <ExternalLink size={15} />
                  </a>
                  <dl className="detail-grid">
                    <div><dt>TNREGINET label</dt><dd>{selectedCoverageInventory.guidelineVillageName}</dd></div>
                    <div><dt>Result timestamp</dt><dd>{formatAuditTimestamp(selectedCoverageInventory.displayedResultTimestamp)}</dd></div>
                    <div><dt>Displayed inventory</dt><dd>{inr.format(selectedCoverageInventory.displayedItemCount)} items</dd></div>
                    <div><dt>Implied result pages</dt><dd>{selectedCoverageInventory.impliedPageCount}</dd></div>
                    <div><dt>Rows stored by MITO</dt><dd>0</dd></div>
                    <div><dt>Current values published</dt><dd>0</dd></div>
                  </dl>
                  <div className="capture-blocker">
                    <span>permission</span>
                    <div><strong>Row-level reuse is not authorized</strong><p>The public count is preserved as coverage metadata. Street names and values from the live result are not stored or republished.</p><small>{omrGuidelineOmrInventoryAudit.publication.blockerCode}</small></div>
                  </div>
                </section>

                {selectedCoverageArchivedRecords.length > 0 && (
                  <section className="inspector-section evidence-section">
                    <div className="section-heading"><div><span>Historical evidence</span><h2>Archived row awaiting current verification</h2></div><AlertTriangle size={17} /></div>
                    <div className="guideline-snapshot-list">
                      {selectedCoverageArchivedRecords.map((record) => (
                        <article key={record.sourceRecordId} className="guideline-snapshot-card">
                          <div><span>Archived official screen</span><em>{record.verificationStatus} recheck</em></div>
                          <h3>{record.sourceStreetName}</h3>
                          <strong>{formatRate(record.valueInrPerSqft)}<small>/sq ft</small></strong>
                          <p>{record.classification} · effective 1 Jul 2024</p>
                          <footer><span>{selectedCoverageUnit.nameEn}</span><b>Unplotted</b></footer>
                        </article>
                      ))}
                    </div>
                    <p className="coverage-method">Historical evidence is shown separately and remains excluded from current verified totals.</p>
                  </section>
                )}

                <section className="inspector-section evidence-section">
                  <div className="section-heading"><div><span>Planning ledger</span><h2>{selectedCoveragePlanningRecords.length} directly linked {selectedCoveragePlanningRecords.length === 1 ? "record" : "records"}</h2></div><ShieldCheck size={17} /></div>
                  {selectedCoveragePlanningRecords.length ? (
                    <div className="planning-record-list">
                      {selectedCoveragePlanningRecords.map((record) => {
                        const source = planningSourceById[record.sourceId];
                        const recordUrl = "documentUrl" in record && record.documentUrl ? record.documentUrl : source?.url;
                        return (
                          <a key={record.id} href={recordUrl} target="_blank" rel="noreferrer" className="planning-record-card">
                            <div className="planning-record-head"><strong>{record.sourceVillageName}</strong><span>{record.sourceRecordId}</span></div>
                            <p>{record.summary}</p>
                            <PlanningSiteMetrics record={record} />
                            <small>{record.decisionStatus.replaceAll("_", " ")} · village linked</small>
                            <em>{record.scopeCaveat}</em>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-evidence-state"><AlertTriangle size={16} /><strong>No directly linked planning record</strong><span>Absence in MITO is a coverage gap, not proof that no planning rule or approval applies.</span></div>
                  )}
                </section>
              </>
            ) : (
            <>
              <section className="inspector-section evidence-section">
                <div className="section-heading"><div><span>Price source ledger</span><h2>Official collection and rights status</h2></div><Database size={17} /></div>
                <a href={omrOfficialAuctionReservePriceLedger.sources[1].url} target="_blank" rel="noreferrer" className="source-card auction-source">
                  <span className="source-kind official">official</span>
                  <div><strong>{omrOfficialAuctionReservePriceLedger.sources[1].title}</strong><p>{omrOfficialAuctionReservePriceLedger.sources[1].organization}</p><small>1 Sholinganallur 1 reserve record · auction outcome price unknown · unplotted</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrOfficialCommercialAuctionReserveLedger.sources[1].url} target="_blank" rel="noreferrer" className="source-card auction-source">
                  <span className="source-kind official">official</span>
                  <div><strong>{omrOfficialCommercialAuctionReserveLedger.sources[1].title}</strong><p>{omrOfficialCommercialAuctionReserveLedger.sources[1].organization}</p><small>2 Siruseri combined-asset reserves · auction outcomes unknown · asset unplotted</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrOfficialAllotmentRateLedger.source.url} target="_blank" rel="noreferrer" className="source-card allotment-source">
                  <span className="source-kind official">official</span>
                  <div><strong>{omrOfficialAllotmentRateLedger.source.title}</strong><p>{omrOfficialAllotmentRateLedger.source.organization}</p><small>{omrOfficialAllotmentRateSummary.recordCount} Siruseri leasehold allotment rates · not guideline or market evidence</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrSiruseriGeometryAudit.openSource.sourceUrl} target="_blank" rel="noreferrer" className="source-card geometry-publishable-source">
                  <span className="source-kind open-data">open data</span>
                  <div><strong>SIPCOT Siruseri approximate footprint</strong><p>{omrSiruseriGeometryAudit.openSource.organization}</p><small>OSM way {omrSiruseriGeometryAudit.openSource.objectId} · version {omrSiruseriGeometryAudit.openSource.version} · {omrSiruseriGeometryAudit.openSource.license}</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrSiruseriGeometryAudit.officialSource.landingPageUrl} target="_blank" rel="noreferrer" className="source-card geometry-verification-source">
                  <span className="source-kind snapshot">verify only</span>
                  <div><strong>SIPCOT Siruseri official GIS comparison</strong><p>{omrSiruseriGeometryAudit.officialSource.organization}</p><small>1 boundary feature inspected · 0 official coordinates stored or published</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrCoverage.source.url} target="_blank" rel="noreferrer" className="source-card">
                  <span className="source-kind official">official</span>
                  <div><strong>{omrCoverage.source.title}</strong><p>{omrCoverage.source.organization}</p><small>Retrieved {omrCoverage.source.retrievedAt} · source updated {omrCoverage.source.lastUpdatedBySource}</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrGuidelineOmrInventoryAudit.source.url} target="_blank" rel="noreferrer" className="source-card live-source">
                  <span className="source-kind official">official</span>
                  <div><strong>{omrGuidelineOmrInventoryAudit.source.title}</strong><p>{omrGuidelineOmrInventoryAudit.source.organization}</p><small>{inr.format(omrGuidelineLiveRegisterSummary.currentInventoryCount)} items across {omrGuidelineLiveRegisterSummary.auditedVillageCount} current village queries · metadata only</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrGuidelineSnapshotLedger.source.url} target="_blank" rel="noreferrer" className="source-card archived-source">
                  <span className="source-kind snapshot">archive</span>
                  <div><strong>TNREGINET result embedded in a public project file</strong><p>Official portal screen archived by {omrGuidelineSnapshotLedger.source.archivedBy}</p><small>Screen dated 16 Apr 2025 · historical row remains pending</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrGuidelineSecondaryCorroborationLedger.audit.url} target="_blank" rel="noreferrer" className="source-card secondary-source">
                  <span className="source-kind discovery">secondary</span>
                  <div><strong>Proquiro targeted source audit</strong><p>{omrGuidelineSecondaryCorroborationLedger.audit.organization}</p><small>One archived row matched · the 758 count is now confirmed by the official current register</small></div>
                  <ExternalLink size={15} />
                </a>
                <div className="guideline-snapshot-list">
                  {omrGuidelineSnapshotLedger.rows.map((record) => (
                    <article key={record.sourceRecordId} className="guideline-snapshot-card">
                      <div><span>Archived official screen</span><em>{record.verificationStatus} recheck</em></div>
                      <h3>{record.sourceStreetName}</h3>
                      <strong>{formatRate(record.valueInrPerSqft)}<small>/sq ft</small></strong>
                      <p>{record.classification} · effective 1 Jul 2024</p>
                      <footer><span>Sholinganallur 1 · Neelangarai SRO</span><b>Unplotted</b></footer>
                    </article>
                  ))}
                </div>
                <p className="coverage-method">Only row 11 is visible. Rows 12–17 are redacted and rows 1–10 are absent from the filing. MITO does not infer or reconstruct them.</p>
                <div className="secondary-match-card">
                  <span>{omrGuidelineLiveRegisterSummary.sholinganallur1InventoryCount} current items</span>
                  <div><strong>Official current inventory supersedes the archived 17-item target</strong><p>The normal TNREGINET village-wise query returned {omrGuidelineLiveRegisterSummary.sholinganallur1InventoryCount} items for Sholinganallur 1, effective from 1 Jul 2024.</p><small>Visible rows inspected: {omrGuidelineLiveRegisterSummary.visibleRowsInspected} · values republished: {omrGuidelineLiveRegisterSummary.currentOfficialValuesPublished}</small></div>
                </div>
                <div className="inventory-conflict-card resolved">
                  <ShieldCheck size={16} />
                  <div><strong>Street-count conflict resolved for the current target</strong><p>Live official Sholinganallur-1 register: {omrGuidelineLiveRegisterSummary.sholinganallur1InventoryCount} items. Archived screen: 17. MITO uses the live count and preserves the older count as historical evidence.</p></div>
                </div>
                <div className="capture-blocker">
                  <span>permission</span>
                  <div><strong>{omrGuidelineCaptureRun.publicMessage}</strong><p>{omrGuidelineCaptureRun.notes}</p><small>Rows withheld: {omrGuidelineCaptureRun.recordsWithheld} · {omrGuidelineCaptureRun.blockerCode}</small></div>
                </div>
                <p className="coverage-method">{omrGuidelineCaptureRun.nextAction}</p>
              </section>

              <section className="inspector-section evidence-section">
                <div className="section-heading"><div><span>Planning source ledger</span><h2>{omrPlanningSummary.recordCount} official CMDA records</h2></div><ShieldCheck size={17} /></div>
                <div className="planning-evidence-summary">
                  <div><strong>{omrPlanningSummary.linkedRecordCount}</strong><span>linked records</span></div>
                  <div><strong>{omrPlanningSummary.villageCount}</strong><span>villages</span></div>
                  <div><strong>{omrPlanningSummary.unresolvedRecordCount}</strong><span>crosswalk gaps</span></div>
                </div>
                <p className="coverage-method">{omrPlanningLedger.coverageCaveat}</p>
                <div className="planning-record-list">
                  {omrPlanningLedger.records.map((record) => {
                    const source = planningSourceById[record.sourceId];
                    const recordUrl = "documentUrl" in record && record.documentUrl ? record.documentUrl : source?.url;
                    return (
                      <a key={record.id} href={recordUrl} target="_blank" rel="noreferrer" className="planning-record-card">
                        <div className="planning-record-head"><strong>{record.sourceVillageName}</strong><span>{record.sourceRecordId}</span></div>
                        <p>{record.summary}</p>
                        <PlanningSiteMetrics record={record} />
                        <small>{record.decisionStatus.replaceAll("_", " ")} · {record.mappingStatus === "verified" ? "village linked" : "crosswalk unresolved"}</small>
                        <em>{record.scopeCaveat}</em>
                      </a>
                    );
                  })}
                </div>
              </section>

              <section className="inspector-section">
                <div className="section-heading"><div><span>Jurisdiction ledger</span><h2>Six official offices</h2></div><MapPin size={17} /></div>
                <div className="office-ledger">
                  {omrCoverageByOffice.map((office) => (
                    <div key={office.officialSroCode}><span>{office.nameEn}<small>{office.nameTa}</small></span><strong>{office.units.length} villages</strong><b>ID {office.officialSroCode}</b></div>
                  ))}
                </div>
              </section>
            </>
            )
          )}

          {activeView === "Coverage" && coverageScope === "omr" && inspectorTab === "Context" && (
            selectedCoverageUnit && selectedCoverageInventory ? (
              <>
                {selectedCoverageAuctionReservePrices.length > 0 && (
                  <section className="inspector-section context-section">
                    <div className="section-heading"><div><span>Price interpretation</span><h2>What the liquidation reserve means</h2></div><CircleHelp size={17} /></div>
                    <dl className="detail-grid">
                      <div><dt>Evidence</dt><dd>Official auction reserve</dd></div>
                      <div><dt>Auction date</dt><dd>12 Aug 2025</dd></div>
                      <div><dt>Asset</dt><dd>9.80-acre vacant-land lot</dd></div>
                      <div><dt>Lifecycle</dt><dd>Auction process concluded</dd></div>
                      <div><dt>Winning bid</dt><dd>Not published</dd></div>
                      <div><dt>Geometry</dt><dd>Unplotted</dd></div>
                    </dl>
                    <p className="coverage-method">A reserve price is the seller&apos;s auction floor, not proof of what a buyer paid. MITO publishes both document-area and patta-area calculations because the official schedule differs by 0.0192 acre. It does not infer a parcel polygon from survey references.</p>
                    <a className="resolver-api-link" href={omrOfficialAuctionReservePriceLedger.sources[1].url} target="_blank" rel="noreferrer">Open the official detailed auction notice <ArrowUpRight size={13} /></a>
                    <a className="resolver-api-link" href={omrOfficialAuctionReservePriceLedger.sources[2].url} target="_blank" rel="noreferrer">Open the later NCLT order <ArrowUpRight size={13} /></a>
                  </section>
                )}

                {selectedCoverageCommercialAuctionReserves.length > 0 && (
                  <section className="inspector-section context-section">
                    <div className="section-heading"><div><span>Price interpretation</span><h2>What the Siruseri auction history means</h2></div><CircleHelp size={17} /></div>
                    <dl className="detail-grid">
                      <div><dt>Evidence</dt><dd>Combined-asset reserves</dd></div>
                      <div><dt>Auction dates</dt><dd>8 Sep & 3 Nov 2022</dd></div>
                      <div><dt>Asset</dt><dd>1 acre + 143,020 sq ft building</dd></div>
                      <div><dt>Reserve change</dt><dd>−12.19%</dd></div>
                      <div><dt>Winning bids</dt><dd>Not published</dd></div>
                      <div><dt>Geometry</dt><dd>Unplotted</dd></div>
                    </dl>
                    <p className="coverage-method">The reserve moved from ₹32.00 crore to ₹28.10 crore for the same Plot A-17 asset. Because each figure includes both land and building, MITO does not derive a land rate. The Siruseri link is name-based and the approximate park polygon is not used as asset geometry.</p>
                    <a className="resolver-api-link" href={omrOfficialCommercialAuctionReserveLedger.sources[0].url} target="_blank" rel="noreferrer">Open the official ₹32.00 crore schedule <ArrowUpRight size={13} /></a>
                    <a className="resolver-api-link" href={omrOfficialCommercialAuctionReserveLedger.sources[1].url} target="_blank" rel="noreferrer">Open the official ₹28.10 crore re-auction notice <ArrowUpRight size={13} /></a>
                  </section>
                )}

                {selectedCoverageAllotmentRates.length > 0 && (
                  <section className="inspector-section context-section">
                    <div className="section-heading"><div><span>Price interpretation</span><h2>What the Siruseri figures mean</h2></div><CircleHelp size={17} /></div>
                    <dl className="detail-grid">
                      <div><dt>Evidence type</dt><dd>Government allotment plot cost</dd></div>
                      <div><dt>Tenure</dt><dd>99-year SIPCOT leasehold</dd></div>
                      <div><dt>Effective date</dt><dd>Not displayed</dd></div>
                      <div><dt>Geometry</dt><dd>Approximate OSM footprint</dd></div>
                    </dl>
                    <p className="coverage-method">The OSM polygon is a named partial footprint, not an official or legal boundary. It covers about {omrSiruseriGeometryAudit.comparison.openAreaAsPercentOfOfficialComputedArea.toFixed(1)}% of SIPCOT&apos;s computed GIS area and differs materially in outline. SIPCOT&apos;s land table says Kancheepuram while its current GIS index and MITO&apos;s registration crosswalk say Chengalpattu; the conflict is preserved. The potential 10% backend subsidy is not deducted because eligibility is project-specific.</p>
                    <a className="resolver-api-link" href={omrSiruseriGeometryAudit.openSource.sourceUrl} target="_blank" rel="noreferrer">Open the attributed OSM footprint <ArrowUpRight size={13} /></a>
                    <a className="resolver-api-link" href={omrOfficialAllotmentRateLedger.tenureEvidence.url} target="_blank" rel="noreferrer">Open the official standard lease evidence <ArrowUpRight size={13} /></a>
                  </section>
                )}

                {selectedCoverageHousingOffers.length > 0 && (
                  <section className="inspector-section context-section">
                    <div className="section-heading"><div><span>Price interpretation</span><h2>What the TNHB figures mean</h2></div><CircleHelp size={17} /></div>
                    <dl className="detail-grid">
                      <div><dt>Evidence</dt><dd>Original apartment selling price</dd></div>
                      <div><dt>Status</dt><dd>Closed historical offer</dd></div>
                      <div><dt>Displayed rate</dt><dd>Total ÷ plinth area</dd></div>
                      <div><dt>Location</dt><dd>Sholinganallur split unresolved</dd></div>
                      <div><dt>Geometry</dt><dd>Unplotted</dd></div>
                      <div><dt>Land rate</dt><dd>Not derived</dd></div>
                    </dl>
                    <p className="coverage-method">These records strengthen residential price provenance, but they do not prove current availability, a completed transaction, land value or a rate for either Sholinganallur registration village. TNHB project costs from policy documents are also excluded because a project budget is not a property price.</p>
                    <a className="resolver-api-link" href={omrTnhbHousingOfferLedger.source.url} target="_blank" rel="noreferrer">Open the official TNHB property portal <ArrowUpRight size={13} /></a>
                  </section>
                )}

                <section className="inspector-section context-section">
                  <div className="section-heading"><div><span>Address resolver</span><h2>Verified names for this jurisdiction</h2></div><Route size={17} /></div>
                  <div className="alias-list">
                    {selectedCoverageAliases.map((alias) => <span key={`${alias.type}-${alias.value}`}>{alias.value}<small>{alias.type.replaceAll("_", " ")}</small></span>)}
                  </div>
                  <p className="coverage-method">MITO matches only these source-backed names and official IDs. A match identifies the registration jurisdiction, not a parcel, street or survey boundary.</p>
                  <a className="resolver-api-link" href={`/api/resolve?query=${encodeURIComponent(selectedCoverageUnit.nameEn)}`} target="_blank" rel="noreferrer">Open the machine-readable resolver result <ArrowUpRight size={13} /></a>
                </section>

                <section className="inspector-section context-section">
                  <div className="section-heading"><div><span>Official lookup path</span><h2>Reproduce this inventory check</h2></div><Database size={17} /></div>
                  <ol className="lookup-steps">
                    <li>Open TNREGINET and choose “Guideline value search from 2002”.</li>
                    <li>Choose the current register from 1 July 2024 and keep Street + Village Wise selected.</li>
                    <li>Select {selectedCoverageInventory.zoneName} → {selectedCoverageInventory.sroName} → {selectedCoverageInventory.guidelineVillageName}.</li>
                    <li>Confirm the displayed timestamp and {inr.format(selectedCoverageInventory.displayedItemCount)}-item result before using it.</li>
                  </ol>
                </section>

                <section className="inspector-section context-section">
                  <div className="section-heading"><div><span>Due diligence</span><h2>Still verify before relying</h2></div><ShieldCheck size={17} /></div>
                  {["Exact street and survey subdivision", "Current guideline value and land classification", "Title, EC and ownership chain", "Planning use, approval and access road", "Flood, waterbody and acquisition constraints"].map((item) => <div className="check-row" key={item}><span /><p>{item}</p></div>)}
                  <p className="legal-note">MITO resolves a registration jurisdiction; it does not certify a title, parcel boundary, legal status or market value.</p>
                </section>
              </>
            ) : (
              <section className="inspector-section context-section">
                <div className="section-heading"><div><span>Boundary method</span><h2>Transparent by design</h2></div><ShieldCheck size={17} /></div>
                <p className="coverage-definition">{omrCoverage.definition}</p>
                <div className="evidence-contract">
                  <span>Import contract · v1.1.0</span>
                  <strong>Every official value must arrive with provenance</strong>
                  <p>Source record ID, SRO and village codes, street name, classification, raw unit, normalized ₹/sq ft, effective date, snapshot hash, location evidence and verification status are mandatory. An absent official street code is allowed only for a pending archived row and blocks verification. A live inventory count is coverage metadata, not a row import; authorized reuse is required before current values are stored or published.</p>
                  <a href="/api/evidence" target="_blank" rel="noreferrer">Inspect the machine-readable evidence ledger <ArrowUpRight size={13} /></a>
                </div>
                {["Obtain authorized row-level access for every target village", "Capture guideline value, classification and effective date", "Reconcile Tamil and English street names without merging conflicts", "Add registered transactions only when legally accessible", "Audit the 100% release gate before publishing OMR complete"].map((item) => <div className="check-row" key={item}><span /><p>{item}</p></div>)}
                <p className="legal-note">Release ready: <strong>{omrReleaseReady ? "yes" : "no"}</strong>. A missing street total is treated as missing evidence, not zero coverage. Planning records remain separate from price evidence.</p>
              </section>
            )
          )}

          {activeView === "Coverage" && coverageScope === "chennai" && inspectorTab === "Overview" && (
            selectedChennaiUnit ? (
              <>
                <section className={`confidence-card coverage-confidence ${selectedChennaiUnit.registrationCrosswalkStatus === "verified" ? "" : "source-inventory-confidence"}`}>
                  <div className="confidence-badge">{selectedChennaiUnit.registrationCrosswalkStatus === "verified" ? <MapPin size={17} /> : selectedChennaiUnit.registrationCrosswalkStatus === "ambiguous" ? <AlertTriangle size={17} /> : <Database size={17} />}</div>
                  <div>
                    <strong>{selectedChennaiUnit.registrationCrosswalkStatus === "verified" ? "Official registration identity resolved" : selectedChennaiUnit.registrationCrosswalkStatus === "ambiguous" ? "Source split preserved as unresolved" : "Official revenue source row captured"}</strong>
                    <span>Taluk {selectedChennaiUnit.talukSequence} · row {selectedChennaiUnit.sequence} · source spelling preserved</span>
                  </div>
                  <ShieldCheck size={20} />
                </section>

                {selectedChennaiUnit.registrationCrosswalk && (
                  <section className="live-register-card">
                    <div><Database size={17} /></div>
                    <p><strong>{inr.format(selectedChennaiUnit.registrationCrosswalk.currentInventoryItemCount)} current official inventory items</strong><span>{selectedChennaiUnit.registrationCrosswalk.officialSroName} SRO · registration village {selectedChennaiUnit.registrationCrosswalk.officialVillageCode} · audited {selectedChennaiUnit.registrationCrosswalk.currentInventoryAsOf}</span></p>
                    <em>Metadata</em>
                  </section>
                )}

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Source identity</span><h2>What this row establishes</h2></div><MapPin size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>Revenue village name</dt><dd>{selectedChennaiUnit.name}</dd></div>
                    <div><dt>Source taluk</dt><dd>{selectedChennaiUnit.talukName}</dd></div>
                    <div><dt>MITO source key</dt><dd>{selectedChennaiUnit.key}</dd></div>
                    <div><dt>Source status</dt><dd>Official page listed</dd></div>
                    <div><dt>Registration crosswalk</dt><dd>{selectedChennaiUnit.registrationCrosswalkStatus === "verified" ? "Verified" : selectedChennaiUnit.registrationCrosswalkStatus === "ambiguous" ? "Unresolved split" : "Not started"}</dd></div>
                    <div><dt>Geometry</dt><dd>Unplotted</dd></div>
                    {selectedChennaiUnit.registrationCrosswalk && <div><dt>Sub Registrar Office</dt><dd>{selectedChennaiUnit.registrationCrosswalk.officialSroName} · {selectedChennaiUnit.registrationCrosswalk.officialSroCode}</dd></div>}
                    {selectedChennaiUnit.registrationCrosswalk && <div><dt>Official village ID</dt><dd>{selectedChennaiUnit.registrationCrosswalk.officialVillageCode}</dd></div>}
                  </dl>
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Evidence status</span><h2>No price claim yet</h2></div><LockKeyhole size={17} /></div>
                  <div className="planning-evidence-summary village-evidence-summary">
                    <div><strong>{selectedChennaiUnit.registrationCrosswalk ? 1 : 0}</strong><span>registration IDs</span></div>
                    <div><strong>0</strong><span>guideline values</span></div>
                    <div><strong>0</strong><span>transactions</span></div>
                  </div>
                  <p className="coverage-method">{selectedChennaiUnit.registrationCrosswalk
                    ? `The revenue row is linked to ${selectedChennaiUnit.registrationCrosswalk.registrationVillageName} in ${selectedChennaiUnit.registrationCrosswalk.officialSroName} SRO. That proves a registration identity and inventory size—not a parcel, street geometry, guideline value, transaction or market price.`
                    : selectedChennaiUnit.crosswalkAmbiguity
                      ? selectedChennaiUnit.crosswalkAmbiguity.reason
                      : `The official page proves only that this name appears under ${selectedChennaiUnit.talukName}. It does not prove a registration village, parcel, ward, street, boundary or price.`}</p>
                </section>

                <section className="gap-card"><AlertTriangle size={18} /><div>
                  <strong>{selectedChennaiUnit.registrationCrosswalk ? "Price rows remain permission-gated" : selectedChennaiUnit.crosswalkAmbiguity ? "Do not collapse the revenue split" : "Registration identity must be resolved next"}</strong>
                  <p>{selectedChennaiUnit.registrationCrosswalk
                    ? `${selectedChennaiUnit.registrationCrosswalk.currentInventoryItemCount} is a register item count, not a price. MITO stores zero current row-level values for this crosswalk.`
                    : selectedChennaiUnit.crosswalkAmbiguity
                      ? `The candidate registration village ${selectedChennaiUnit.crosswalkAmbiguity.candidateRegistrationVillageName} cannot be assigned until an authoritative subdivision crosswalk is found.`
                      : "MITO will not reuse a matching place name as a registration crosswalk. The exact registration district, SRO, village code and current inventory must be independently verified."}</p>
                </div></section>
              </>
            ) : (
              <>
                <section className="confidence-card coverage-confidence source-inventory-confidence">
                  <div className="confidence-badge"><Database size={17} /></div>
                  <div><strong>{chennaiRevenueSummary.sourceVillageCount} official source rows captured</strong><span>{chennaiRevenueSummary.registrationCrosswalkCount} verified registration links · {chennaiRevenueSummary.ambiguousRegistrationCrosswalkCount} source splits unresolved</span></div>
                  <ShieldCheck size={20} />
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Expansion boundary</span><h2>Chennai District, not the whole CMA</h2></div><Route size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>District / GCC area</dt><dd>{chennaiRevenueCoverage.officialClaims.districtHomepage.areaSqKm} sq km</dd></div>
                    <div><dt>GCC zones</dt><dd>{chennaiRevenueCoverage.officialClaims.greaterChennaiCorporation.zones}</dd></div>
                    <div><dt>GCC wards</dt><dd>{chennaiRevenueCoverage.officialClaims.greaterChennaiCorporation.wards}</dd></div>
                    <div><dt>Preferred table rows</dt><dd>{chennaiRevenueSummary.sourceVillageCount}</dd></div>
                    <div><dt>Registration crosswalks</dt><dd>{chennaiRevenueSummary.registrationCrosswalkCount}</dd></div>
                    <div><dt>Inventory metadata</dt><dd>{inr.format(chennaiRevenueSummary.currentInventoryItemCount)} items</dd></div>
                    <div><dt>Current price values</dt><dd>0</dd></div>
                  </dl>
                  <p className="coverage-method">{chennaiRevenueCoverage.scopeDefinition}</p>
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Expansion progress</span><h2>What is actually complete</h2></div><Database size={17} /></div>
                  <div className="coverage-progress-row"><div><span>Preferred official source table captured</span><strong>144/144</strong></div><div className="coverage-progress"><i style={{ width: "100%" }} /></div><small>This proves source capture only; the official page conflict remains open.</small></div>
                  <div className="coverage-progress-row"><div><span>Registration crosswalks</span><strong>{chennaiRevenueSummary.registrationCrosswalkCount}/144</strong></div><div className="coverage-progress"><i style={{ width: `${chennaiRevenueSummary.crosswalkCoveragePercent}%` }} /></div><small>{chennaiRevenueSummary.taluksWithVerifiedCrosswalks} taluks have verified OMR overlaps · {chennaiRevenueSummary.ambiguousRegistrationCrosswalkCount} split rows remain unresolved</small></div>
                  <div className="coverage-progress-row"><div><span>Current inventory metadata</span><strong>{inr.format(chennaiRevenueSummary.currentInventoryItemCount)}</strong></div><div className="coverage-progress current-inventory"><i style={{ width: `${chennaiRevenueSummary.crosswalkCoveragePercent}%` }} /></div><small>{chennaiRevenueSummary.currentInventoryMetadataCount} linked registration villages · row-level values withheld</small></div>
                  <div className="coverage-progress-row"><div><span>Current verified price rows</span><strong>0</strong></div><div className="coverage-progress"><i style={{ width: "0%" }} /></div><small>No guideline value or transaction is published from this expansion inventory.</small></div>
                </section>

                <section className="inspector-section geometry-readiness-section">
                  <div className="section-heading"><div><span>Geometry readiness</span><h2>Official GCC layers found; reuse gated</h2></div><Layers3 size={17} /></div>
                  <div className="planning-evidence-summary geometry-audit-summary">
                    <div><strong>{inr.format(chennaiRevenueSummary.authoritativeRoadFeaturesDiscovered)}</strong><span>road features</span></div>
                    <div><strong>{chennaiRevenueSummary.authoritativeWardPolygonsDiscovered}</strong><span>ward polygons</span></div>
                    <div><strong>{chennaiRevenueSummary.authoritativeZonePolygonsDiscovered}</strong><span>zone polygons</span></div>
                  </div>
                  <p className="coverage-method">The 2025 GCC service is queryable, declares EPSG:32644 and exposes GeoJSON. GCC&apos;s copyright policy still requires department permission, so MITO stores and plots zero source geometries.</p>
                  <div className="capture-blocker">
                    <span>rights gate</span>
                    <div><strong>Discovery is not publication permission</strong><p>No geometry was downloaded into the product, embedded as a live layer or used to infer a revenue-village boundary.</p><small>{chennaiGeometrySourceAudit.decision.status.replaceAll("_", " ")}</small></div>
                  </div>
                </section>

                <section className="inventory-conflict-card">
                  <AlertTriangle size={16} />
                  <div><strong>Official count conflict remains unresolved</strong><p>The Chennai District homepage says 16 taluks and 122 villages. Its detailed Revenue Administration page lists 17 taluk groups and totals 144 villages; the separate Village page lists only 10 taluk groups and 68 rows.</p></div>
                </section>
              </>
            )
          )}

          {activeView === "Coverage" && coverageScope === "chennai" && inspectorTab === "Evidence" && (
            <>
              <section className="inspector-section evidence-section">
                <div className="section-heading"><div><span>Preferred source</span><h2>Detailed revenue inventory</h2></div><Database size={17} /></div>
                <a href={chennaiRevenueCoverage.sources[0].url} target="_blank" rel="noreferrer" className="source-card">
                  <span className="source-kind official">official</span>
                  <div><strong>{chennaiRevenueCoverage.sources[0].title}</strong><p>{chennaiRevenueCoverage.sources[0].organization}</p><small>Source updated {chennaiRevenueCoverage.sources[0].sourceLastUpdatedAt} · retrieved {chennaiRevenueCoverage.retrievedAt}</small></div>
                  <ExternalLink size={15} />
                </a>
                {selectedChennaiUnit && (
                  <dl className="detail-grid">
                    <div><dt>Captured spelling</dt><dd>{selectedChennaiUnit.name}</dd></div>
                    <div><dt>Taluk group</dt><dd>{selectedChennaiUnit.talukName}</dd></div>
                    <div><dt>Table position</dt><dd>{selectedChennaiUnit.talukSequence}.{selectedChennaiUnit.sequence}</dd></div>
                    <div><dt>Last verified</dt><dd>{chennaiRevenueCoverage.verifiedAt}</dd></div>
                  </dl>
                )}
                <p className="coverage-method">MITO selected the detailed 17-group, 144-row table as the working source inventory because it contains the most granular current official list. That preference does not resolve the source conflict.</p>
              </section>

              <section className="inspector-section evidence-section">
                <div className="section-heading"><div><span>Geometry source audit</span><h2>{chennaiGeometrySourceAudit.summary.sourcesAudited} official sources checked</h2></div><Layers3 size={17} /></div>
                {chennaiGeometrySourceAudit.sources.map((source) => (
                  <a key={source.id} href={source.sourceUrl} target="_blank" rel="noreferrer" className="source-card geometry-source-card">
                    <span className="source-kind snapshot">permission</span>
                    <div><strong>{source.title}</strong><p>{source.authority}</p><small>{source.sourceKind.replaceAll("_", " ")} · {source.rightsStatus.replaceAll("_", " ")}</small></div>
                    <ExternalLink size={15} />
                  </a>
                ))}
                <p className="coverage-method">{chennaiGeometrySourceAudit.decision.summary}</p>
                <a className="resolver-api-link" href="/api/chennai-coverage" target="_blank" rel="noreferrer">Inspect layer IDs, counts, CRS, extents and rights evidence <ArrowUpRight size={13} /></a>
              </section>

              {selectedChennaiUnit?.registrationCrosswalk && (
                <section className="inspector-section evidence-section">
                  <div className="section-heading"><div><span>Registration evidence</span><h2>Verified OMR overlap</h2></div><ShieldCheck size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>Registration district</dt><dd>{selectedChennaiUnit.registrationCrosswalk.officialDistrictName} · {selectedChennaiUnit.registrationCrosswalk.officialDistrictCode}</dd></div>
                    <div><dt>Sub Registrar Office</dt><dd>{selectedChennaiUnit.registrationCrosswalk.officialSroName} · {selectedChennaiUnit.registrationCrosswalk.officialSroCode}</dd></div>
                    <div><dt>Official village ID</dt><dd>{selectedChennaiUnit.registrationCrosswalk.officialVillageCode}</dd></div>
                    <div><dt>Register label</dt><dd>{selectedChennaiUnit.registrationCrosswalk.guidelineVillageName}</dd></div>
                    <div><dt>Inventory metadata</dt><dd>{inr.format(selectedChennaiUnit.registrationCrosswalk.currentInventoryItemCount)} items</dd></div>
                    <div><dt>Verified</dt><dd>{selectedChennaiUnit.registrationCrosswalk.verifiedAt}</dd></div>
                  </dl>
                  <p className="coverage-method">{chennaiRegistrationCrosswalk.methodology}</p>
                  <div className="capture-blocker">
                    <span>permission</span>
                    <div><strong>Identity verified; current values still withheld</strong><p>The linked inventory count is metadata. No current street names, classifications or guideline-value rows are stored or republished.</p><small>{chennaiRegistrationCrosswalk.publication.blockerCode}</small></div>
                  </div>
                </section>
              )}

              {selectedChennaiUnit?.crosswalkAmbiguity && (
                <section className="inspector-section evidence-section">
                  <div className="section-heading"><div><span>Crosswalk conflict</span><h2>Revenue subdivision unresolved</h2></div><AlertTriangle size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>Candidate SRO ID</dt><dd>{selectedChennaiUnit.crosswalkAmbiguity.candidateOfficialSroCode}</dd></div>
                    <div><dt>Candidate village ID</dt><dd>{selectedChennaiUnit.crosswalkAmbiguity.candidateOfficialVillageCode}</dd></div>
                    <div><dt>Candidate label</dt><dd>{selectedChennaiUnit.crosswalkAmbiguity.candidateRegistrationVillageName}</dd></div>
                    <div><dt>MITO status</dt><dd>Unresolved</dd></div>
                  </dl>
                  <div className="inventory-conflict-card"><AlertTriangle size={16} /><div><strong>Name overlap rejected as proof</strong><p>{selectedChennaiUnit.crosswalkAmbiguity.reason}</p></div></div>
                </section>
              )}

              {!selectedChennaiUnit && (
                <section className="inspector-section evidence-section">
                  <div className="section-heading"><div><span>Registration crosswalk</span><h2>{chennaiRevenueSummary.registrationCrosswalkCount} verified overlaps</h2></div><Route size={17} /></div>
                  <div className="planning-evidence-summary">
                    <div><strong>{chennaiRevenueSummary.registrationCrosswalkCount}</strong><span>verified links</span></div>
                    <div><strong>{chennaiRevenueSummary.ambiguousRegistrationCrosswalkCount}</strong><span>ambiguities</span></div>
                    <div><strong>{inr.format(chennaiRevenueSummary.currentInventoryItemCount)}</strong><span>inventory items</span></div>
                  </div>
                  <p className="coverage-method">{chennaiRegistrationCrosswalk.methodology}</p>
                  <div className="office-ledger">
                    {chennaiTalukCrosswalkProgress.filter((taluk) => taluk.verifiedCrosswalkCount > 0 || taluk.ambiguousCrosswalkCount > 0).map((taluk) => (
                      <div key={taluk.talukSequence}><span>{taluk.talukName}<small>{taluk.sourceVillageCount} source rows</small></span><strong>{taluk.verifiedCrosswalkCount} verified</strong><b>{taluk.ambiguousCrosswalkCount} ambiguous</b></div>
                    ))}
                  </div>
                </section>
              )}

              <section className="inspector-section evidence-section">
                <div className="section-heading"><div><span>Conflict ledger</span><h2>Current official pages disagree</h2></div><AlertTriangle size={17} /></div>
                {chennaiRevenueCoverage.sources.slice(1).map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-card archived-source">
                    <span className="source-kind snapshot">conflict</span>
                    <div><strong>{source.title}</strong><p>{source.organization}</p><small>{source.role.replaceAll("_", " ")}{source.sourceLastUpdatedAt ? ` · updated ${source.sourceLastUpdatedAt}` : ""}</small></div>
                    <ExternalLink size={15} />
                  </a>
                ))}
                <div className="inventory-conflict-card">
                  <AlertTriangle size={16} />
                  <div><strong>{chennaiRevenueCoverage.conflicts[0].summary}</strong><p>{chennaiRevenueCoverage.conflicts[0].preferredInterpretation}</p></div>
                </div>
              </section>

              {!selectedChennaiUnit && (
                <section className="inspector-section">
                  <div className="section-heading"><div><span>Source table</span><h2>17 taluk groups captured</h2></div><Route size={17} /></div>
                  <div className="office-ledger">
                    {chennaiRevenueCoverage.taluks.map((taluk) => (
                      <div key={taluk.sequence}><span>{taluk.sourceName}<small>official source spelling</small></span><strong>{taluk.villageCount} rows</strong><b>{taluk.firkaCount} {taluk.firkaCount === 1 ? "firka" : "firkas"}</b></div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {activeView === "Coverage" && coverageScope === "chennai" && inspectorTab === "Context" && (
            <>
              <section className="inspector-section context-section">
                <div className="section-heading"><div><span>Expansion method</span><h2>{selectedChennaiUnit ? "Resolve this row safely" : "Move from names to evidence"}</h2></div><Route size={17} /></div>
                <ol className="lookup-steps">
                  <li>Reconcile the official district source conflict without deleting any published interpretation.</li>
                  <li>Extend the verified registration crosswalk beyond the {chennaiRevenueSummary.registrationCrosswalkCount} exact OMR overlaps.</li>
                  <li>Capture Tamil and portal spellings with explicit ambiguity rules.</li>
                  <li>Verify the current official inventory before requesting or importing authorized row-level values.</li>
                  <li>Obtain written reuse permission for the audited GCC and TNGIS geometry sources.</li>
                  <li>Add ward, street and geometry links only when a deterministic crosswalk supports them.</li>
                </ol>
                <a className="resolver-api-link" href={`/api/chennai-coverage${selectedChennaiUnit ? `?query=${encodeURIComponent(selectedChennaiUnit.name)}` : ""}`} target="_blank" rel="noreferrer">Open the machine-readable Chennai ledger <ArrowUpRight size={13} /></a>
              </section>

              <section className="inspector-section context-section">
                <div className="section-heading"><div><span>Release gate</span><h2>Chennai cannot pass yet</h2></div><LockKeyhole size={17} /></div>
                <div className="gate-row passed"><Check size={14} /><span>Preferred official 144-row source table captured</span></div>
                <div className="gate-row passed"><Check size={14} /><span>{chennaiRevenueSummary.registrationCrosswalkCount} registration links independently verified</span></div>
                <div className="gate-row passed"><Check size={14} /><span>Authoritative geometry sources, layer counts and coordinate systems audited</span></div>
                <div className="gate-row"><X size={14} /><span>Official 122-versus-144 village conflict must be reconciled</span></div>
                <div className="gate-row"><X size={14} /><span>Every row needs a verified registration crosswalk</span></div>
                <div className="gate-row"><X size={14} /><span>Authorized current price evidence must be captured</span></div>
                <div className="gate-row"><X size={14} /><span>Geometry reuse permission and revenue-to-ward crosswalk are required</span></div>
                <p className="legal-note">A verified crosswalk identifies a registration jurisdiction and inventory size only. All Chennai rows remain unplotted and unpriced; missing evidence is never treated as a zero price or a safe property.</p>
              </section>
            </>
          )}

          {activeView !== "Coverage" && inspectorTab === "Overview" && (
            <>
              <section className="confidence-card">
                <div className="confidence-badge">{selected.grade}</div>
                <div><strong>Evidence grade {selected.grade}</strong><span>{gradeCopy(selected.grade)}</span></div>
                <ShieldCheck size={20} />
              </section>

              {selected.price && (
                <section className="inspector-section">
                  <div className="section-heading"><div><span>Comparable workspace</span><h2>Asking-price evidence</h2></div><Sparkles size={17} /></div>
                  <div className="range-visual">
                    <div className="range-track"><span style={{ left: "17%", width: "56%" }} /></div>
                    <div className="range-labels"><span>{formatRate(selected.price.low)}</span><strong>{formatRate(selected.price.midpoint)}</strong><span>{formatRate(selected.price.high)}</span></div>
                    <p>Portal aggregate · {selected.price.effectiveDate}</p>
                  </div>
                  <div className="comparable-list">
                    {selected.comparables.map((comparable) => {
                      const active = selectedComparables.includes(comparable.id);
                      return (
                        <label key={comparable.id} className={active ? "active" : ""}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => setSelectedComparables((current) => current.includes(comparable.id) ? current.filter((id) => id !== comparable.id) : [...current, comparable.id])}
                          />
                          <span className="checkbox-ui">{active && <Check size={12} />}</span>
                          <span><strong>{comparable.label}</strong><small>{comparable.areaSqft ? `${inr.format(comparable.areaSqft)} sq ft · ` : ""}unplotted</small></span>
                          <b>{formatRate(comparable.pricePerSqft)}</b>
                        </label>
                      );
                    })}
                  </div>
                  <div className="recalculated-range">
                    <span>Selected comparable range</span>
                    <strong>{activeComparableRates.length ? `${formatRate(activeComparableRates[0])}–${formatRate(activeComparableRates[activeComparableRates.length - 1])}` : "Select evidence"}</strong>
                  </div>
                </section>
              )}

              <section className="inspector-section">
                <div className="section-heading"><div><span>Jurisdiction resolver</span><h2>Where to verify</h2></div><MapPin size={17} /></div>
                <dl className="detail-grid">
                  <div><dt>Registration office</dt><dd>{selected.registrationOffice}</dd></div>
                  <div><dt>Revenue village</dt><dd>{selected.revenueVillage}</dd></div>
                  <div><dt>Planning authority</dt><dd>{selected.district === "Chennai" ? "CMDA / local body" : "Local planning authority"}</dd></div>
                  <div><dt>Map precision</dt><dd>Approximate area anchor</dd></div>
                </dl>
              </section>

              <section className="gap-card"><AlertTriangle size={18} /><div><strong>Known coverage gap</strong><p>{selected.knownGap}</p></div></section>
            </>
          )}

          {activeView !== "Coverage" && inspectorTab === "Evidence" && (
            <section className="inspector-section evidence-section">
              <div className="section-heading"><div><span>Source timeline</span><h2>{selected.sourceIds.length} traceable sources</h2></div><Database size={17} /></div>
              {selected.sourceIds.map((sourceId) => {
                const source = sourceById[sourceId];
                return (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-card">
                    <span className={`source-kind ${source.category}`}>{source.category}</span>
                    <div><strong>{source.name}</strong><p>{source.organization}</p><small>Retrieved {source.retrievedAt}</small></div>
                    <ExternalLink size={15} />
                  </a>
                );
              })}
              <div className="geometry-note"><MapPin size={17} /><div><strong>Location evidence</strong><p>{selected.geometryEvidence}</p></div></div>
            </section>
          )}

          {activeView !== "Coverage" && inspectorTab === "Context" && (
            <section className="inspector-section context-section">
              <div className="section-heading"><div><span>Due-diligence context</span><h2>Verify before relying</h2></div><ShieldCheck size={17} /></div>
              {["Title, EC and ownership chain", "Patta / TSLR and survey match", "Current land use and planning rules", "Approved access and road width", "Flood, waterbody and acquisition risk"].map((item) => <div className="check-row" key={item}><span /><p>{item}</p></div>)}
              <p className="legal-note">MITO is an investigation aid, not legal certification or a registered valuation. Verify with the relevant authority and qualified professionals.</p>
            </section>
          )}
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className="active" type="button"><MapPin size={18} /><span>Map</span></button>
        <button type="button" onClick={() => setActiveView("Coverage")}><Database size={18} /><span>Coverage</span></button>
        <button type="button"><Search size={18} /><span>Search</span></button>
        <button type="button"><Building2 size={18} /><span>Saved</span></button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <button type="button" aria-pressed={coverageScope === "omr"} onClick={() => selectCoverageScope("omr")}>OMR pilot coverage</button>
          <button type="button" aria-pressed={coverageScope === "chennai"} onClick={() => selectCoverageScope("chennai")}>Chennai District expansion</button>
          <button type="button">தமிழ்</button>
          <button type="button">About the methodology</button>
          <button type="button">Submit a correction</button>
        </div>
      )}
    </main>
  );
}
