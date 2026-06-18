import { curatedBoardsProvider } from "./curatedBoards";
import { institutionSitesProvider } from "./institutionSites";
import { rssFeedsProvider } from "./rssFeeds";
import { webSearchProvider } from "./webSearch";

export function defaultSearchProviders() {
  return [
    curatedBoardsProvider(),
    institutionSitesProvider(),
    webSearchProvider(),
    rssFeedsProvider()
  ];
}
