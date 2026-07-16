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
  chennaiRevenueCoverage,
  chennaiRevenueSummary,
  chennaiRevenueUnits,
  resolveChennaiRevenuePlace,
} from "../data/chennai";
import {
  archivedGuidelineRecordsForVillage,
  omrGuidelineCaptureRun,
  omrGuidelineLiveRegisterSummary,
  omrGuidelineOmrInventoryAudit,
  omrGuidelineSecondaryCorroborationLedger,
  omrGuidelineSnapshotLedger,
  omrGuidelineSnapshotSummary,
  omrPlanningLedger,
  omrPlanningSummary,
  planningRecordsForVillage,
} from "../data/evidence";
import {
  aliasesForVillage,
  omrCoverage,
  omrCoverageByOffice,
  omrCoveragePercent,
  omrCoverageSummary,
  omrReleaseReady,
  resolveOmrPlace,
} from "../data/omr";
import { marketAreas, sourceById, type MarketArea } from "../data/pilot";

const views = ["Market", "Guideline", "Transactions", "Planning", "Risk", "Coverage"] as const;
type View = (typeof views)[number];
type CoverageScope = "omr" | "chennai";

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
  const selectedCoverageOffice = selectedCoverageUnit
    ? omrCoverage.registrationOffices.find((office) => office.officialSroCode === selectedCoverageUnit.officialSroCode) ?? null
    : null;
  const selectedCoveragePlanningRecords = selectedCoverageUnit
    ? planningRecordsForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
    : [];
  const selectedCoverageArchivedRecords = selectedCoverageUnit
    ? archivedGuidelineRecordsForVillage(selectedCoverageUnit.officialSroCode, selectedCoverageUnit.officialVillageCode)
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
    : selectedChennaiUnit ? `${selectedChennaiUnit.talukName} taluk · revenue source row` : "426 sq km · source inventory awaiting registration crosswalk";
  const coverageInspectorEyebrow = coverageScope === "omr"
    ? selectedCoverageUnit ? "Verified registration village" : "Auditable coverage programme"
    : selectedChennaiUnit ? "Official revenue source entry" : "Chennai expansion programme";

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
    setSelectedCoverageKey(`${officialSroCode}:${officialVillageCode}`);
    setActiveView("Coverage");
    setInspectorTab("Overview");
    setQuery("");
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
          <div className="release-pill"><span /> {coverageScope === "omr" ? "24 current inventories" : "144 source rows · conflict open"}</div>
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
            <div><strong>{chennaiRevenueSummary.conflictCount}</strong><span>official conflict</span></div>
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
                const hasCurrentInventory = "streetTargetEvidenceStatus" in unit && unit.streetTargetEvidenceStatus === "live_official_metadata";
                const unitKey = `${unit.officialSroCode}:${unit.officialVillageCode}`;
                const match = coverageMatchByKey.get(unitKey);
                return (
                  <button
                    key={unitKey}
                    type="button"
                    aria-pressed={selectedCoverageKey === unitKey}
                    className={`coverage-unit-card ${planningRecordCount ? "has-planning-evidence" : ""} ${archivedRateCount ? "has-guideline-snapshot" : ""} ${selectedCoverageKey === unitKey ? "selected" : ""}`}
                    onClick={() => selectCoverageUnit(unit.officialSroCode, unit.officialVillageCode)}
                  >
                    <div className="coverage-unit-index">{unit.sequence}</div>
                    <div>
                      <strong>{unit.nameEn}</strong>
                      <span>{unit.nameTa}</span>
                      <small>{query && match ? `Matched “${match.matchedAlias}” · ` : ""}{office?.nameEn} SRO · ID {unit.officialVillageCode}</small>
                    </div>
                    <div className="coverage-unit-state"><i /> jurisdiction<br /><b>{hasCurrentInventory ? `${unit.streetTargetCount} current official ${unit.streetTargetCount === 1 ? "street" : "streets"} · values withheld` : archivedRateCount ? `${archivedRateCount} archived rate · recheck` : planningRecordCount ? `${planningRecordCount} CMDA ${planningRecordCount === 1 ? "record" : "records"}` : "street data pending"}</b></div>
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
                  className={`coverage-unit-card chennai-source-card ${selectedChennaiKey === unit.key ? "selected" : ""}`}
                  onClick={() => selectChennaiUnit(unit.key)}
                >
                  <div className="coverage-unit-index">{unit.talukSequence}.{unit.sequence}</div>
                  <div>
                    <strong>{unit.name}</strong>
                    <span>{unit.talukName} taluk · official source spelling</span>
                    <small>Registration ID, Tamil alias and geometry pending</small>
                  </div>
                  <div className="coverage-unit-state source-only"><i /> source row<br /><b>0 current values</b></div>
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
            <span><i className="legend-gap" /> Village geometry unplotted</span>
            <span>{coverageScope === "omr" ? "Search the verified jurisdiction ledger" : "Source inventory · crosswalk pending"}</span>
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
                  ? <><strong>{inr.format(selectedCoverageUnit.streetTargetCount)}</strong><span>current official inventory items</span></>
                  : <><strong>{omrCoveragePercent.streetRegister}%</strong><span>verified street registers</span></>
                : selectedChennaiUnit
                  ? <><strong>0</strong><span>current official values</span></>
                  : <><strong>{chennaiRevenueSummary.sourceVillageCount}</strong><span>source-listed village rows</span></>
            ) : selected.price ? (
              <><strong>{formatRate(selected.price.low)}–{formatRate(selected.price.high)}</strong><span>per sq ft</span></>
            ) : (
              <><strong>Insufficient evidence</strong><span>No value published</span></>
            )}
          </div>
          <div className="price-type"><Info size={14} /> {activeView === "Coverage"
            ? coverageScope === "omr"
              ? selectedCoverageUnit ? "0 current values published · row access pending" : "Jurisdictions are mapped; price evidence is not complete"
              : selectedChennaiUnit ? "Registration crosswalk and price evidence pending" : "Official source counts conflict · Chennai is not complete"
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
                    <div><strong>0</strong><span>current values</span></div>
                  </div>
                  <p className="coverage-method">The official inventory size and jurisdiction are verified. Individual street values, transactions and parcel geometry are not published as current evidence.</p>
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Village release gate</span><h2>Price evidence is not complete</h2></div><LockKeyhole size={17} /></div>
                  <div className="gate-row passed"><Check size={14} /><span>Official SRO and village identifiers verified</span></div>
                  <div className="gate-row passed"><Check size={14} /><span>Current official inventory total verified</span></div>
                  <div className="gate-row"><X size={14} /><span>Authorized row-level guideline values not captured</span></div>
                  <div className="gate-row"><X size={14} /><span>No verified registered transactions in MITO yet</span></div>
                </section>

                <section className="gap-card"><AlertTriangle size={18} /><div><strong>Do not treat the inventory count as a price</strong><p>{selectedCoverageInventory.displayedItemCount} is the number of official register items returned for this village. MITO publishes no current ₹/sq ft figure until authorized row data or independently verified transaction evidence is available.</p></div></section>
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

              <section className="inspector-section">
                <div className="section-heading"><div><span>Collection progress</span><h2>What is actually complete</h2></div><Database size={17} /></div>
                <div className="coverage-progress-row"><div><span>Jurisdiction IDs</span><strong>{omrCoveragePercent.jurisdiction}%</strong></div><div className="coverage-progress"><i style={{ width: `${omrCoveragePercent.jurisdiction}%` }} /></div><small>{omrCoverageSummary.jurisdictionVerifiedCount} of {omrCoverageSummary.unitCount} verified against TNREGINET</small></div>
                <div className="coverage-progress-row"><div><span>Current inventories</span><strong>{omrCoveragePercent.currentInventory}%</strong></div><div className="coverage-progress current-inventory"><i style={{ width: `${omrCoveragePercent.currentInventory}%` }} /></div><small>{omrCoverageSummary.currentStreetInventoryVerifiedCount} of {omrCoverageSummary.unitCount} village totals verified from the current official register</small></div>
                <div className="coverage-progress-row"><div><span>Captured street registers</span><strong>{omrCoveragePercent.streetRegister}%</strong></div><div className="coverage-progress"><i style={{ width: `${omrCoveragePercent.streetRegister}%` }} /></div><small>{inr.format(omrGuidelineLiveRegisterSummary.currentInventoryCount)} current items are inventoried, but zero row-level values are captured or republished</small></div>
                <div className="coverage-progress-row"><div><span>Current verified values</span><strong>{omrCoverageSummary.officialGuidelineRecordCount}</strong></div><div className="coverage-progress"><i style={{ width: "0%" }} /></div><small>{omrGuidelineSnapshotSummary.recordCount} archived row is shown separately and excluded from this total</small></div>
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
                <section className="confidence-card coverage-confidence source-inventory-confidence">
                  <div className="confidence-badge"><Database size={17} /></div>
                  <div><strong>Official revenue source row captured</strong><span>Taluk {selectedChennaiUnit.talukSequence} · row {selectedChennaiUnit.sequence} · source spelling preserved</span></div>
                  <ShieldCheck size={20} />
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Source identity</span><h2>What this row establishes</h2></div><MapPin size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>Revenue village name</dt><dd>{selectedChennaiUnit.name}</dd></div>
                    <div><dt>Source taluk</dt><dd>{selectedChennaiUnit.talukName}</dd></div>
                    <div><dt>MITO source key</dt><dd>{selectedChennaiUnit.key}</dd></div>
                    <div><dt>Source status</dt><dd>Official page listed</dd></div>
                    <div><dt>Registration crosswalk</dt><dd>Not started</dd></div>
                    <div><dt>Geometry</dt><dd>Unplotted</dd></div>
                  </dl>
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Evidence status</span><h2>No price claim yet</h2></div><LockKeyhole size={17} /></div>
                  <div className="planning-evidence-summary village-evidence-summary">
                    <div><strong>0</strong><span>registration IDs</span></div>
                    <div><strong>0</strong><span>guideline values</span></div>
                    <div><strong>0</strong><span>transactions</span></div>
                  </div>
                  <p className="coverage-method">The official page proves only that this name appears under {selectedChennaiUnit.talukName}. It does not prove a TNREGINET village, parcel, ward, street, boundary or price.</p>
                </section>

                <section className="gap-card"><AlertTriangle size={18} /><div><strong>Registration identity must be resolved next</strong><p>MITO will not reuse a matching place name as a registration crosswalk. The exact registration district, SRO, village code and current inventory must be independently verified.</p></div></section>
              </>
            ) : (
              <>
                <section className="confidence-card coverage-confidence source-inventory-confidence">
                  <div className="confidence-badge"><Database size={17} /></div>
                  <div><strong>{chennaiRevenueSummary.sourceVillageCount} official source rows captured</strong><span>{chennaiRevenueSummary.talukGroupCount} listed taluk groups · {chennaiRevenueSummary.firkaCount} firkas · zero registration mappings</span></div>
                  <ShieldCheck size={20} />
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Expansion boundary</span><h2>Chennai District, not the whole CMA</h2></div><Route size={17} /></div>
                  <dl className="detail-grid">
                    <div><dt>District / GCC area</dt><dd>{chennaiRevenueCoverage.officialClaims.districtHomepage.areaSqKm} sq km</dd></div>
                    <div><dt>GCC zones</dt><dd>{chennaiRevenueCoverage.officialClaims.greaterChennaiCorporation.zones}</dd></div>
                    <div><dt>GCC wards</dt><dd>{chennaiRevenueCoverage.officialClaims.greaterChennaiCorporation.wards}</dd></div>
                    <div><dt>Preferred table rows</dt><dd>{chennaiRevenueSummary.sourceVillageCount}</dd></div>
                    <div><dt>Registration crosswalks</dt><dd>0</dd></div>
                    <div><dt>Current price values</dt><dd>0</dd></div>
                  </dl>
                  <p className="coverage-method">{chennaiRevenueCoverage.scopeDefinition}</p>
                </section>

                <section className="inspector-section">
                  <div className="section-heading"><div><span>Expansion progress</span><h2>What is actually complete</h2></div><Database size={17} /></div>
                  <div className="coverage-progress-row"><div><span>Preferred official source table captured</span><strong>144/144</strong></div><div className="coverage-progress"><i style={{ width: "100%" }} /></div><small>This proves source capture only; the official page conflict remains open.</small></div>
                  <div className="coverage-progress-row"><div><span>Registration crosswalks</span><strong>0/144</strong></div><div className="coverage-progress"><i style={{ width: "0%" }} /></div><small>SRO and registration-village identifiers are not yet assigned.</small></div>
                  <div className="coverage-progress-row"><div><span>Current verified price rows</span><strong>0</strong></div><div className="coverage-progress"><i style={{ width: "0%" }} /></div><small>No guideline value or transaction is published from this expansion inventory.</small></div>
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
                  <li>Resolve each revenue row to its registration district, SRO and registration-village ID.</li>
                  <li>Capture Tamil and portal spellings with explicit ambiguity rules.</li>
                  <li>Verify the current official inventory before requesting or importing authorized row-level values.</li>
                  <li>Add ward, street and geometry links only when an authoritative crosswalk supports them.</li>
                </ol>
                <a className="resolver-api-link" href={`/api/chennai-coverage${selectedChennaiUnit ? `?query=${encodeURIComponent(selectedChennaiUnit.name)}` : ""}`} target="_blank" rel="noreferrer">Open the machine-readable Chennai ledger <ArrowUpRight size={13} /></a>
              </section>

              <section className="inspector-section context-section">
                <div className="section-heading"><div><span>Release gate</span><h2>Chennai cannot pass yet</h2></div><LockKeyhole size={17} /></div>
                <div className="gate-row passed"><Check size={14} /><span>Preferred official 144-row source table captured</span></div>
                <div className="gate-row"><X size={14} /><span>Official 122-versus-144 village conflict must be reconciled</span></div>
                <div className="gate-row"><X size={14} /><span>Every row needs a verified registration crosswalk</span></div>
                <div className="gate-row"><X size={14} /><span>Authorized current price evidence must be captured</span></div>
                <div className="gate-row"><X size={14} /><span>Geometry and street coverage must be audited</span></div>
                <p className="legal-note">A source-listed village is searchable but remains unplotted and unpriced. Missing evidence is never treated as a zero price or a safe property.</p>
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
