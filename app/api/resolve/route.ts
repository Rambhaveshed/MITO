import { resolveOmrPlace } from "../../../data/omr";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") ?? "";
  const result = resolveOmrPlace(query);

  return Response.json(
    {
      generatedAt: "2026-07-17",
      scopeId: "omr-corridor-2026",
      methodology: "Deterministic matching against verified coverage names, Tamil names, TNREGINET selector labels, official IDs and explicit ambiguity rules. No geocoding or inferred village assignment is used.",
      result,
    },
    { status: result.status === "empty" ? 400 : 200 },
  );
}
