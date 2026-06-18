import { curatedBoardsProvider } from "./curatedBoards";
import { institutionSitesProvider } from "./institutionSites";
import { manualSourcesProvider } from "./manualSources";
import { rssFeedsProvider } from "./rssFeeds";
import { webSearchProvider } from "./webSearch";
import type { SearchResult } from "../types";

export function defaultSearchProviders(manualResults: SearchResult[] = []) {
  return [
    manualSourcesProvider(manualResults),
    curatedBoardsProvider(),
    institutionSitesProvider(),
    webSearchProvider(),
    rssFeedsProvider()
  ];
}
