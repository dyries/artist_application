import type { SourceType } from "./types";

export type RegistrySource = {
  name: string;
  url: string;
  type: SourceType;
  region: string;
  languages: string[];
  institutionType?: string;
};

export const curatedBoardSources: RegistrySource[] = [
  { name: "ArtConnect Opportunities", url: "https://www.artconnect.com/opportunities", type: "curated_board", region: "worldwide", languages: ["en"] },
  { name: "TransArtists Calls", url: "https://www.transartists.org/en/calls", type: "curated_board", region: "worldwide", languages: ["en"] },
  { name: "Res Artis Open Calls", url: "https://resartis.org/open-calls/", type: "curated_board", region: "worldwide", languages: ["en"] },
  { name: "NYFA Opportunities", url: "https://www.nyfa.org/opportunities/", type: "curated_board", region: "North America", languages: ["en"] },
  { name: "Call for Entry", url: "https://www.callforentry.org/", type: "curated_board", region: "North America", languages: ["en"] },
  { name: "CuratorSpace Opportunities", url: "https://www.curatorspace.com/opportunities", type: "curated_board", region: "Europe", languages: ["en"] },
  { name: "Artenda Open Calls", url: "https://artenda.net/open-calls/", type: "curated_board", region: "Europe", languages: ["en"] },
  { name: "Artquest Opportunities", url: "https://www.artquest.org.uk/opportunities/", type: "curated_board", region: "Europe", languages: ["en"] }
];

export const institutionSources: RegistrySource[] = [
  { name: "Asia Art Archive", url: "https://aaa.org.hk/en/programmes/search/programmes", type: "institution_site", region: "Asia", languages: ["en", "zh"], institutionType: "archive" },
  { name: "Japan Foundation", url: "https://www.jpf.go.jp/e/program/", type: "institution_site", region: "Japan", languages: ["en", "ja"], institutionType: "foundation" },
  { name: "Korea Arts Management Service", url: "https://www.gokams.or.kr/", type: "institution_site", region: "Korea", languages: ["ko", "en"], institutionType: "arts council" },
  { name: "Onassis AiR", url: "https://www.onassis.org/initiatives/onassis-air", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "residency programme" },
  { name: "Akademie Schloss Solitude", url: "https://www.akademie-solitude.de/en/application/", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "residency programme" },
  { name: "Eyebeam", url: "https://www.eyebeam.org/opportunities/", type: "institution_site", region: "North America", languages: ["en"], institutionType: "art centre" }
];

export function configuredSources() {
  const fromEnv = (process.env.ARTIST_STUDIO_DISCOVERY_SOURCE_URLS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url, index): RegistrySource => ({
      name: `Configured source ${index + 1}`,
      url,
      type: "curated_board",
      region: "configured",
      languages: ["en"]
    }));
  return fromEnv.length ? fromEnv : curatedBoardSources;
}
