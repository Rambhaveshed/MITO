export type EvidenceGrade = "A" | "B" | "C" | "D" | "E";

export type SourceRecord = {
  id: string;
  name: string;
  organization: string;
  category: "official" | "planning" | "listing" | "map";
  url: string;
  publishedAt?: string;
  retrievedAt: string;
  note: string;
};

export type Comparable = {
  id: string;
  label: string;
  pricePerSqft: number;
  areaSqft?: number;
  evidenceDate: string;
  plotted: false;
  sourceId: string;
  note: string;
};

export type MarketArea = {
  id: string;
  name: string;
  tamilName: string;
  district: string;
  registrationOffice: string;
  revenueVillage: string;
  coordinate: [number, number];
  geometryPrecision: "approximate-area-anchor";
  geometryEvidence: string;
  propertyType: "Residential plot" | "Mixed property";
  grade: EvidenceGrade;
  price?: {
    type: "Advertised asking price aggregate";
    low: number;
    midpoint: number;
    high: number;
    effectiveDate: string;
    unit: "INR/sq ft";
  };
  evidenceCount: number;
  plottedEvidenceCount: number;
  comparables: Comparable[];
  sourceIds: string[];
  knownGap: string;
};

export const sources: SourceRecord[] = [
  {
    id: "tnreginet",
    name: "Guideline Value Search",
    organization: "Tamil Nadu Registration Department",
    category: "official",
    url: "https://tnreginet.gov.in/portal/",
    publishedAt: "2026-01-22",
    retrievedAt: "2026-07-15",
    note: "Authoritative public search for street- and survey-number guideline values. MITO does not relabel these values as market prices.",
  },
  {
    id: "tn-eservices",
    name: "Land Records e-Services",
    organization: "Government of Tamil Nadu",
    category: "official",
    url: "https://eservices.tn.gov.in/eservicesnew/index.html",
    retrievedAt: "2026-07-15",
    note: "Official service for Patta, Chitta, A-Register, FMB and TSLR lookups. Parcel data is not reproduced without a verified record and permitted use.",
  },
  {
    id: "cmdamaps",
    name: "Second Master Plan and land-use resources",
    organization: "Chennai Metropolitan Development Authority",
    category: "planning",
    url: "https://www.cmdachennai.gov.in/",
    retrievedAt: "2026-07-15",
    note: "Planning context source. Site-specific zoning still requires verification against the applicable map and current orders.",
  },
  {
    id: "tnrera",
    name: "Registered Projects",
    organization: "Tamil Nadu Real Estate Regulatory Authority",
    category: "official",
    url: "https://www.rera.tn.gov.in/",
    retrievedAt: "2026-07-15",
    note: "Official project-registration source. Registration does not by itself certify title or current completion status.",
  },
  {
    id: "magicbricks-sholinganallur-q2-2026",
    name: "Residential Plot Rates & Trends — Sholinganallur",
    organization: "MagicBricks",
    category: "listing",
    url: "https://www.magicbricks.com/Property-Rates-Trends/Residential-Plot-rates-Sholinganallur-in-Chennai",
    publishedAt: "2026-06-30",
    retrievedAt: "2026-07-15",
    note: "Apr–Jun 2026 advertised residential-plot aggregate. Converted from ₹/sq yd to ₹/sq ft by dividing by 9; not a registered transaction series.",
  },
  {
    id: "nobroker-sholinganallur-2026",
    name: "Residential plots for sale — Sholinganallur",
    organization: "NoBroker",
    category: "listing",
    url: "https://www.nobroker.in/residential-land-plots-for-sale-in-sholinganallur_chennai",
    publishedAt: "2026-07-04",
    retrievedAt: "2026-07-15",
    note: "Individual asking-price evidence. Locations remain unplotted until a listing supplies independently verifiable geometry.",
  },
  {
    id: "housing-sholinganallur-2026",
    name: "Residential plots for sale — Sholinganallur",
    organization: "Housing.com",
    category: "listing",
    url: "https://housing.com/in/buy/chennai/sholinganallur-gid/plots-fid/",
    publishedAt: "2026-07-09",
    retrievedAt: "2026-07-15",
    note: "Portal asking-price evidence used only as an unplotted comparable, not as a completed sale.",
  },
  {
    id: "osm-anchors",
    name: "OpenStreetMap place labels",
    organization: "OpenStreetMap contributors",
    category: "map",
    url: "https://www.openstreetmap.org/copyright",
    retrievedAt: "2026-07-15",
    note: "Used only for approximate locality anchors in this pilot. No anchor represents a parcel, property, transaction or official boundary.",
  },
];

export const marketAreas: MarketArea[] = [
  {
    id: "sholinganallur",
    name: "Sholinganallur",
    tamilName: "சோழிங்கநல்லூர்",
    district: "Chennai",
    registrationOffice: "Neelangarai / verify by street",
    revenueVillage: "Sholinganallur / verify by survey",
    coordinate: [80.2279, 12.901],
    geometryPrecision: "approximate-area-anchor",
    geometryEvidence: "Approximate OpenStreetMap locality anchor. This is not a property or parcel coordinate.",
    propertyType: "Residential plot",
    grade: "D",
    price: {
      type: "Advertised asking price aggregate",
      low: 5841,
      midpoint: 7086,
      high: 8331,
      effectiveDate: "Apr–Jun 2026",
      unit: "INR/sq ft",
    },
    evidenceCount: 4,
    plottedEvidenceCount: 0,
    comparables: [
      {
        id: "shol-nb-9600",
        label: "Sholinganallur listing",
        pricePerSqft: 5250,
        areaSqft: 9600,
        evidenceDate: "2026-07-01",
        plotted: false,
        sourceId: "nobroker-sholinganallur-2026",
        note: "Advertised listing; exact street and geometry not independently verified.",
      },
      {
        id: "shol-nb-raman-thangal",
        label: "Raman Thangal Lake area listing",
        pricePerSqft: 6229,
        areaSqft: 3050,
        evidenceDate: "2026-07-04",
        plotted: false,
        sourceId: "nobroker-sholinganallur-2026",
        note: "Advertised listing; lake-area description is not precise enough to plot safely.",
      },
      {
        id: "shol-housing-elcot",
        label: "Elcot Avenue listing",
        pricePerSqft: 6000,
        evidenceDate: "2026-07-09",
        plotted: false,
        sourceId: "housing-sholinganallur-2026",
        note: "Advertised portal rate; retained as unplotted until the parcel can be verified.",
      },
    ],
    sourceIds: ["magicbricks-sholinganallur-q2-2026", "nobroker-sholinganallur-2026", "housing-sholinganallur-2026", "tnreginet", "osm-anchors"],
    knownGap: "No registered-sale series or verified parcel geometries have been ingested yet.",
  },
  {
    id: "anna-nagar",
    name: "Anna Nagar",
    tamilName: "அண்ணா நகர்",
    district: "Chennai",
    registrationOffice: "Anna Nagar",
    revenueVillage: "Naduvakkarai and adjacent villages",
    coordinate: [80.2101, 13.085],
    geometryPrecision: "approximate-area-anchor",
    geometryEvidence: "Approximate OpenStreetMap locality anchor. This is not a property or parcel coordinate.",
    propertyType: "Mixed property",
    grade: "E",
    evidenceCount: 0,
    plottedEvidenceCount: 0,
    comparables: [],
    sourceIds: ["tnreginet", "tn-eservices", "cmdamaps", "osm-anchors"],
    knownGap: "Official street value and registered transaction evidence still need street-level capture and reconciliation.",
  },
  {
    id: "t-nagar",
    name: "T. Nagar",
    tamilName: "தியாகராய நகர்",
    district: "Chennai",
    registrationOffice: "Thyagaraya Nagar",
    revenueVillage: "Verify by street",
    coordinate: [80.2341, 13.0418],
    geometryPrecision: "approximate-area-anchor",
    geometryEvidence: "Approximate OpenStreetMap locality anchor. This is not a property or parcel coordinate.",
    propertyType: "Mixed property",
    grade: "E",
    evidenceCount: 0,
    plottedEvidenceCount: 0,
    comparables: [],
    sourceIds: ["tnreginet", "cmdamaps", "osm-anchors"],
    knownGap: "Commercial and residential evidence must be separated before a locality range can be published.",
  },
  {
    id: "perungudi",
    name: "Perungudi",
    tamilName: "பெருங்குடி",
    district: "Chennai",
    registrationOffice: "Neelangarai / verify by street",
    revenueVillage: "Perungudi",
    coordinate: [80.2461, 12.9654],
    geometryPrecision: "approximate-area-anchor",
    geometryEvidence: "Approximate OpenStreetMap locality anchor. This is not a property or parcel coordinate.",
    propertyType: "Mixed property",
    grade: "E",
    evidenceCount: 0,
    plottedEvidenceCount: 0,
    comparables: [],
    sourceIds: ["tnreginet", "cmdamaps", "osm-anchors"],
    knownGap: "Land and built-property evidence are not yet separated.",
  },
  {
    id: "rs-puram",
    name: "R.S. Puram",
    tamilName: "ஆர். எஸ். புரம்",
    district: "Coimbatore",
    registrationOffice: "Coimbatore Joint I / verify by street",
    revenueVillage: "Verify by survey",
    coordinate: [76.9504, 11.0052],
    geometryPrecision: "approximate-area-anchor",
    geometryEvidence: "Approximate OpenStreetMap locality anchor. This is not a property or parcel coordinate.",
    propertyType: "Mixed property",
    grade: "E",
    evidenceCount: 0,
    plottedEvidenceCount: 0,
    comparables: [],
    sourceIds: ["tnreginet", "tn-eservices", "osm-anchors"],
    knownGap: "Current portal averages mix land and buildings, so MITO withholds a land-only value.",
  },
  {
    id: "kk-nagar-madurai",
    name: "K.K. Nagar, Madurai",
    tamilName: "கே. கே. நகர், மதுரை",
    district: "Madurai",
    registrationOffice: "Madurai North / verify by street",
    revenueVillage: "Verify by survey",
    coordinate: [78.1453, 9.9334],
    geometryPrecision: "approximate-area-anchor",
    geometryEvidence: "Approximate OpenStreetMap locality anchor. This is not a property or parcel coordinate.",
    propertyType: "Mixed property",
    grade: "E",
    evidenceCount: 0,
    plottedEvidenceCount: 0,
    comparables: [],
    sourceIds: ["tnreginet", "tn-eservices", "osm-anchors"],
    knownGap: "No sufficiently attributable street-level evidence has been verified.",
  },
];

export const sourceById = Object.fromEntries(sources.map((source) => [source.id, source]));
