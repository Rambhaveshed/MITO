export const GUIDELINE_IMPORT_SCHEMA_VERSION = "1.0.0";

const allowedUnits = new Set(["sqft", "sqm", "cent", "ground", "acre"]);
const allowedCaptureMethods = new Set(["official_export", "manual_official_snapshot", "official_api"]);
const allowedVerificationStatuses = new Set(["pending", "verified", "rejected", "conflicted"]);
const allowedGeometryStatuses = new Set(["exact", "approximate", "unplotted"]);
const sha256Pattern = /^sha256:[a-f0-9]{64}$/;
const codePattern = /^\d+$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function pushRequiredString(errors, value, path) {
  if (!isNonEmptyString(value)) errors.push(`${path} must be a non-empty string`);
}

export function validateGuidelineImport(batch, options = {}) {
  const errors = [];
  const allowedVillageKeys = new Set(options.allowedVillageKeys ?? []);

  if (!isObject(batch)) return { valid: false, errors: ["batch must be an object"] };
  if (batch.schemaVersion !== GUIDELINE_IMPORT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${GUIDELINE_IMPORT_SCHEMA_VERSION}`);
  }
  pushRequiredString(errors, batch.scopeId, "scopeId");

  if (!isObject(batch.source)) {
    errors.push("source must be an object");
  } else {
    pushRequiredString(errors, batch.source.id, "source.id");
    pushRequiredString(errors, batch.source.organization, "source.organization");
    pushRequiredString(errors, batch.source.url, "source.url");
    if (!isoDatePattern.test(batch.source.retrievedAt ?? "")) errors.push("source.retrievedAt must be an ISO date");
    if (!allowedCaptureMethods.has(batch.source.captureMethod)) errors.push("source.captureMethod is not allowed");
    if (!sha256Pattern.test(batch.source.snapshotHash ?? "")) errors.push("source.snapshotHash must be a sha256 digest");
  }

  if (!Array.isArray(batch.rows)) {
    errors.push("rows must be an array");
    return { valid: false, errors };
  }

  const recordKeys = new Set();
  batch.rows.forEach((row, index) => {
    const path = `rows[${index}]`;
    if (!isObject(row)) {
      errors.push(`${path} must be an object`);
      return;
    }

    for (const field of ["sourceRecordId", "officialSroCode", "officialVillageCode", "officialStreetCode", "sourceStreetName", "classification", "locationEvidence"]) {
      pushRequiredString(errors, row[field], `${path}.${field}`);
    }
    if (!codePattern.test(row.officialSroCode ?? "")) errors.push(`${path}.officialSroCode must contain digits only`);
    if (!codePattern.test(row.officialVillageCode ?? "")) errors.push(`${path}.officialVillageCode must contain digits only`);

    const villageKey = `${row.officialSroCode}:${row.officialVillageCode}`;
    if (allowedVillageKeys.size && !allowedVillageKeys.has(villageKey)) {
      errors.push(`${path} references a village outside the declared coverage scope`);
    }

    if (!isPositiveNumber(row.rawValueInr)) errors.push(`${path}.rawValueInr must be positive`);
    if (!isPositiveNumber(row.valueInrPerSqft)) errors.push(`${path}.valueInrPerSqft must be positive`);
    if (!allowedUnits.has(row.rawValueUnit)) errors.push(`${path}.rawValueUnit is not allowed`);
    if (row.rawValueUnit !== "sqft" && !isNonEmptyString(row.conversionMethod)) {
      errors.push(`${path}.conversionMethod is required when the source unit is not sqft`);
    }
    if (row.rawValueUnit === "sqft" && isPositiveNumber(row.rawValueInr) && isPositiveNumber(row.valueInrPerSqft) && Math.abs(row.rawValueInr - row.valueInrPerSqft) > 0.01) {
      errors.push(`${path}.valueInrPerSqft must equal rawValueInr when rawValueUnit is sqft`);
    }
    if (!isoDatePattern.test(row.effectiveFrom ?? "")) errors.push(`${path}.effectiveFrom must be an ISO date`);
    if (!allowedVerificationStatuses.has(row.verificationStatus)) errors.push(`${path}.verificationStatus is not allowed`);
    if (!allowedGeometryStatuses.has(row.geometryStatus)) errors.push(`${path}.geometryStatus is not allowed`);
    if (row.geometryStatus !== "unplotted" && !isNonEmptyString(row.geometryEvidence)) {
      errors.push(`${path}.geometryEvidence is required for plotted records`);
    }
    if (row.verificationStatus === "verified" && !isoDatePattern.test(row.verifiedAt ?? "")) {
      errors.push(`${path}.verifiedAt is required for verified records`);
    }

    const recordKey = [row.sourceRecordId, row.officialSroCode, row.officialVillageCode, row.officialStreetCode, row.effectiveFrom].join(":");
    if (recordKeys.has(recordKey)) errors.push(`${path} duplicates another source record in this batch`);
    recordKeys.add(recordKey);
  });

  return { valid: errors.length === 0, errors };
}
