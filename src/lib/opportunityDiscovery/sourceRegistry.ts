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
  { name: "Eyebeam", url: "https://www.eyebeam.org/opportunities/", type: "institution_site", region: "North America", languages: ["en"], institutionType: "art centre" },
  { name: "Creative Capital", url: "https://creative-capital.org/about/open-calls/", type: "institution_site", region: "North America", languages: ["en"], institutionType: "foundation" },
  { name: "Canada Council for the Arts", url: "https://canadacouncil.ca/funding/grants", type: "institution_site", region: "North America", languages: ["en"], institutionType: "government arts council" },
  { name: "Arts Council England", url: "https://www.artscouncil.org.uk/ProjectGrants", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "government arts council" },
  { name: "Pro Helvetia", url: "https://prohelvetia.ch/en/find-support/", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "cultural institute" },
  { name: "European Cultural Foundation", url: "https://culturalfoundation.eu/open-calls/", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "foundation" },
  { name: "Liverpool Biennial", url: "https://www.biennial.com/opportunities/", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "biennial" },
  { name: "Ars Electronica", url: "https://ars.electronica.art/news/en/calls/", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "art festival" },
  { name: "SOMA Mexico", url: "https://somamexico.org/en/open-calls/", type: "institution_site", region: "Latin America", languages: ["en"], institutionType: "independent art space" },
  { name: "ZKM Center for Art and Media", url: "https://zkm.de/en/open-calls", type: "institution_site", region: "Europe", languages: ["en"], institutionType: "art research centre" }
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
