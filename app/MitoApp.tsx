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
  archivedGuidelineRecordsForVillage,
  omrGuidelineCaptureRun,
  omrGuidelineSecondaryCorroborationLedger,
  omrGuidelineSecondaryCorroborationSummary,
  omrGuidelineSnapshotLedger,
  omrGuidelineSnapshotSummary,
  omrPlanningLedger,
  omrPlanningSummary,
  planningRecordsForVillage,
} from "../data/evidence";
import { omrCoverage, omrCoverageByOffice, omrCoveragePercent, omrCoverageSummary, omrReleaseReady } from "../data/omr";
import { marketAreas, sourceById, type MarketArea } from "../data/pilot";

const views = ["Market", "Guideline", "Transactions", "Planning", "Risk", "Coverage"] as const;
type View = (typeof views)[number];

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const planningSourceById = Object.fromEntries(omrPlanningLedger.sources.map((source) => [source.id, source]));

function formatRate(value: number) {
  return `₹${inr.format(value)}`;
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

  const filteredCoverageUnits = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return omrCoverage.units;
    return omrCoverage.units.filter((unit) => {
      const office = omrCoverage.registrationOffices.find((candidate) => candidate.officialSroCode === unit.officialSroCode);
      return [unit.nameEn, unit.nameTa, unit.officialVillageCode, office?.nameEn, office?.nameTa]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized);
    });
  }, [query]);

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
          <button className="geography-button" type="button">
            <MapPin size={15} /> Tamil Nadu <ChevronDown size={14} />
          </button>
          <div className="release-pill"><span /> OMR collection · audited 16 Jul 2026</div>
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
            placeholder="Search street, locality, survey no."
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
          <span className="result-count">{activeView === "Coverage" ? `${filteredCoverageUnits.length} target villages` : `${filteredAreas.length} areas`}</span>
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
        <div><strong>{omrCoverageSummary.jurisdictionVerifiedCount}/{omrCoverageSummary.unitCount}</strong><span>jurisdictions</span></div>
        <div><strong>{omrCoverageSummary.streetRegisterVerifiedCount}</strong><span>street registers</span></div>
        <div><strong>{omrCoverageSummary.archivedGuidelineRecordCount}</strong><span>archived rate</span></div>
        <div><strong>{omrCoverageSummary.officialPlanningRecordCount}</strong><span>planning records</span></div>
        <button type="button" onClick={() => setActiveView("Coverage")}><Database size={14} /> OMR is collecting <ArrowUpRight size={13} /></button>
      </section>

      <section className="area-list" aria-label="Matching areas">
        <div className="area-list-heading">
          <span>{activeView === "Coverage" ? (query ? "Coverage matches" : "OMR target villages") : (query ? "Search results" : "Pilot markets")}</span>
          <button type="button" aria-label="Sort areas"><Filter size={14} /></button>
        </div>
        <div className="area-list-scroll">
          {activeView === "Coverage" ? (
            <>
              {filteredCoverageUnits.map((unit) => {
                const office = omrCoverage.registrationOffices.find((candidate) => candidate.officialSroCode === unit.officialSroCode);
                const planningRecordCount = planningRecordsForVillage(unit.officialSroCode, unit.officialVillageCode).length;
                const archivedRateCount = archivedGuidelineRecordsForVillage(unit.officialSroCode, unit.officialVillageCode).length;
                return (
                  <article key={`${unit.officialSroCode}-${unit.officialVillageCode}`} className={`coverage-unit-card ${planningRecordCount ? "has-planning-evidence" : ""} ${archivedRateCount ? "has-guideline-snapshot" : ""}`}>
                    <div className="coverage-unit-index">{unit.sequence}</div>
                    <div>
                      <strong>{unit.nameEn}</strong>
                      <span>{unit.nameTa}</span>
                      <small>{office?.nameEn} SRO · ID {unit.officialVillageCode}</small>
                    </div>
                    <div className="coverage-unit-state"><i /> jurisdiction<br /><b>{archivedRateCount ? `${archivedRateCount} archived rate · recheck` : planningRecordCount ? `${planningRecordCount} CMDA ${planningRecordCount === 1 ? "record" : "records"}` : "street data pending"}</b></div>
                  </article>
                );
              })}
              {!filteredCoverageUnits.length && <div className="empty-list"><Search size={19} /><strong>No coverage match</strong><span>Try a village, SRO, official ID or Tamil name.</span></div>}
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
        <span><i className="legend-price" /> Asking-price evidence</span>
        <span><i className="legend-gap" /> Coverage gap</span>
        <button type="button"><Layers3 size={15} /> Layers</button>
      </div>

      <button className="locate-button" type="button" aria-label="Return to selected area" onClick={() => selectArea(selected)}><LocateFixed size={18} /></button>

      <aside className="inspector" aria-label={activeView === "Coverage" ? "OMR coverage inspector" : `${selected.name} evidence inspector`}>
        <div className="inspector-handle" />
        <div className="inspector-head">
          <div className="eyebrow"><span className="live-dot" /> {activeView === "Coverage" ? "Auditable coverage programme" : selected.propertyType}</div>
          <button type="button" className="inspector-close" aria-label="Close inspector"><Minus size={18} /></button>
          <h1>{activeView === "Coverage" ? "OMR evidence programme" : selected.name}</h1>
          <p>{activeView === "Coverage" ? "Adyar → Mamallapuram · official jurisdiction ledger" : `${selected.tamilName} · ${selected.district}`}</p>
          <div className="inspector-price">
            {activeView === "Coverage" ? (
              <><strong>{omrCoveragePercent.streetRegister}%</strong><span>verified street registers</span></>
            ) : selected.price ? (
              <><strong>{formatRate(selected.price.low)}–{formatRate(selected.price.high)}</strong><span>per sq ft</span></>
            ) : (
              <><strong>Insufficient evidence</strong><span>No value published</span></>
            )}
          </div>
          <div className="price-type"><Info size={14} /> {activeView === "Coverage" ? "Jurisdictions are mapped; price evidence is not complete" : selected.price?.type ?? "MITO will not manufacture a price"}</div>
        </div>

        <div className="inspector-tabs" role="tablist">
          {(["Overview", "Evidence", "Context"] as const).map((tabName) => (
            <button key={tabName} type="button" role="tab" aria-selected={inspectorTab === tabName} className={inspectorTab === tabName ? "active" : ""} onClick={() => setInspectorTab(tabName)}>{tabName}</button>
          ))}
        </div>

        <div className="inspector-scroll">
          {activeView === "Coverage" && inspectorTab === "Overview" && (
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

              <section className="secondary-audit-card">
                <div><ShieldCheck size={17} /></div>
                <p><strong>Archived row independently corroborated</strong><span>Street, classification and ₹4,400 rate match a secondary mirror exactly</span></p>
                <em>Not official</em>
              </section>

              <section className="inspector-section">
                <div className="section-heading"><div><span>Collection progress</span><h2>What is actually complete</h2></div><Database size={17} /></div>
                <div className="coverage-progress-row"><div><span>Jurisdiction IDs</span><strong>{omrCoveragePercent.jurisdiction}%</strong></div><div className="coverage-progress"><i style={{ width: `${omrCoveragePercent.jurisdiction}%` }} /></div><small>{omrCoverageSummary.jurisdictionVerifiedCount} of {omrCoverageSummary.unitCount} verified against TNREGINET</small></div>
                <div className="coverage-progress-row"><div><span>Street registers</span><strong>{omrCoveragePercent.streetRegister}%</strong></div><div className="coverage-progress"><i style={{ width: `${omrCoveragePercent.streetRegister}%` }} /></div><small>One dated 17-street inventory is visible in an archive; no current register is verified</small></div>
                <div className="coverage-progress-row"><div><span>Current verified values</span><strong>{omrCoverageSummary.officialGuidelineRecordCount}</strong></div><div className="coverage-progress"><i style={{ width: "0%" }} /></div><small>{omrGuidelineSnapshotSummary.recordCount} archived row is shown separately and excluded from this total</small></div>
                <div className="coverage-progress-row"><div><span>Planning evidence</span><strong>{omrCoveragePercent.planning}%</strong></div><div className="coverage-progress planning"><i style={{ width: `${omrCoveragePercent.planning}%` }} /></div><small>{omrPlanningSummary.villageCount} of {omrCoverageSummary.unitCount} villages have directly linked CMDA records</small></div>
              </section>

              <section className="inspector-section">
                <div className="section-heading"><div><span>Release gate</span><h2>OMR cannot pass yet</h2></div><LockKeyhole size={17} /></div>
                <div className="gate-row passed"><Check size={14} /><span>24 corridor jurisdictions carry official IDs</span></div>
                <div className="gate-row"><X size={14} /><span>Every jurisdiction must have a known street total</span></div>
                <div className="gate-row"><X size={14} /><span>100% of official street records must be captured</span></div>
                <div className="gate-row"><X size={14} /><span>Each record needs source and verification dates</span></div>
              </section>

              <section className="gap-card"><AlertTriangle size={18} /><div><strong>Live price collection remains blocked</strong><p>{omrGuidelineCaptureRun.publicMessage} The archived row is a recovery lead, not proof of the current rate. {omrGuidelineCaptureRun.nextAction}</p></div></section>
            </>
          )}

          {activeView === "Coverage" && inspectorTab === "Evidence" && (
            <>
              <section className="inspector-section evidence-section">
                <div className="section-heading"><div><span>Price source ledger</span><h2>Official collection status</h2></div><Database size={17} /></div>
                <a href={omrCoverage.source.url} target="_blank" rel="noreferrer" className="source-card">
                  <span className="source-kind official">official</span>
                  <div><strong>{omrCoverage.source.title}</strong><p>{omrCoverage.source.organization}</p><small>Retrieved {omrCoverage.source.retrievedAt} · source updated {omrCoverage.source.lastUpdatedBySource}</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrGuidelineSnapshotLedger.source.url} target="_blank" rel="noreferrer" className="source-card archived-source">
                  <span className="source-kind snapshot">archive</span>
                  <div><strong>TNREGINET result embedded in a public project file</strong><p>Official portal screen archived by {omrGuidelineSnapshotLedger.source.archivedBy}</p><small>Screen dated 16 Apr 2025 · recovered 16 Jul 2026 · live recheck pending</small></div>
                  <ExternalLink size={15} />
                </a>
                <a href={omrGuidelineSecondaryCorroborationLedger.audit.url} target="_blank" rel="noreferrer" className="source-card secondary-source">
                  <span className="source-kind discovery">secondary</span>
                  <div><strong>Proquiro targeted source audit</strong><p>{omrGuidelineSecondaryCorroborationLedger.audit.organization}</p><small>One known row checked 16 Jul 2026 · no bulk ingestion · live official recheck still required</small></div>
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
                  <span>{omrGuidelineSecondaryCorroborationSummary.exactFieldMatchCount} exact match</span>
                  <div><strong>Transcription confidence increased; coverage did not</strong><p>The secondary page matches the archived street name after whitespace normalization, classification and ₹4,400/sq ft value.</p><small>Current official values added: {omrGuidelineSecondaryCorroborationSummary.currentOfficialPromotionCount}</small></div>
                </div>
                <div className="inventory-conflict-card">
                  <AlertTriangle size={16} />
                  <div><strong>Street inventory conflict remains unresolved</strong><p>Archived official screen: 17 items. Secondary mirror claim: {omrGuidelineSecondaryCorroborationSummary.claimedStreetCount} streets. MITO preserves both and uses neither as a current complete register.</p></div>
                </div>
                <div className="capture-blocker">
                  <span>{omrGuidelineCaptureRun.status}</span>
                  <div><strong>{omrGuidelineCaptureRun.publicMessage}</strong><p>{omrGuidelineCaptureRun.notes}</p><small>Accepted records: {omrGuidelineCaptureRun.recordsAccepted} · {omrGuidelineCaptureRun.blockerCode}</small></div>
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
          )}

          {activeView === "Coverage" && inspectorTab === "Context" && (
            <section className="inspector-section context-section">
              <div className="section-heading"><div><span>Boundary method</span><h2>Transparent by design</h2></div><ShieldCheck size={17} /></div>
              <p className="coverage-definition">{omrCoverage.definition}</p>
              <div className="evidence-contract">
                <span>Import contract · v1.1.0</span>
                <strong>Every official value must arrive with provenance</strong>
                <p>Source record ID, SRO and village codes, street name, classification, raw unit, normalized ₹/sq ft, effective date, snapshot hash, location evidence and verification status are mandatory. An absent official street code is allowed only for a pending archived row and blocks verification. Secondary corroboration never promotes a record to current official evidence.</p>
                <a href="/api/evidence" target="_blank" rel="noreferrer">Inspect the machine-readable evidence ledger <ArrowUpRight size={13} /></a>
              </div>
              {["Resolve the official street inventory for every target village", "Capture guideline value, classification and effective date", "Reconcile Tamil and English street names without merging conflicts", "Add registered transactions only when legally accessible", "Audit the 100% release gate before publishing OMR complete"].map((item) => <div className="check-row" key={item}><span /><p>{item}</p></div>)}
              <p className="legal-note">Release ready: <strong>{omrReleaseReady ? "yes" : "no"}</strong>. A missing street total is treated as missing evidence, not zero coverage. Planning records remain separate from price evidence.</p>
            </section>
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
          <button type="button">தமிழ்</button>
          <button type="button">About the methodology</button>
          <button type="button">Submit a correction</button>
        </div>
      )}
    </main>
  );
}
