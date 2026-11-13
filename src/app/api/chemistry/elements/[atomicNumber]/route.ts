import { periodicElements } from "@/app/app/periodic-elements";
import { authorizePremiumStudyTool } from "@/lib/study-access";

type WikipediaSummary = {
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
};

export async function GET(_request: Request, { params }: { params: Promise<{ atomicNumber: string }> }) {
  const access = await authorizePremiumStudyTool("Química");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  const { atomicNumber: value } = await params;
  const atomicNumber = Number(value);
  const element = periodicElements.find((item) => item.atomicNumber === atomicNumber);
  if (!element) return Response.json({ error: "Elemento no encontrado." }, { status: 404 });

  try {
    let factSummary: WikipediaSummary | null = null;
    let imageSummary: WikipediaSummary | null = null;
    for (const [language, title] of [["es", element.name], ["en", element.englishName]] as const) {
      const response = await fetch(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
        headers: { accept: "application/json", "user-agent": "STUDY-AI/1.0 (periodic table educational tool)" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const candidate = await response.json() as WikipediaSummary;
      if (!factSummary && candidate.extract) factSummary = candidate;
      if (!imageSummary && candidate.thumbnail?.source) imageSummary = candidate;
      if (factSummary && imageSummary) break;
    }
    if (!factSummary && !imageSummary) return Response.json({ image: null, fact: null, sourceUrl: null, imageSourceUrl: null }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
    return Response.json({
      image: imageSummary?.thumbnail?.source || null,
      fact: factSummary?.extract || null,
      sourceUrl: factSummary?.content_urls?.desktop?.page || null,
      imageSourceUrl: imageSummary?.content_urls?.desktop?.page || null,
    }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ image: null, fact: null, sourceUrl: null, imageSourceUrl: null }, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  }
}
