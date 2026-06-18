import type { SearchProvider } from "../types";

export function rssFeedsProvider(): SearchProvider {
  return {
    name: "rss-feeds",
    type: "rss",
    isAvailable: () => Boolean(process.env.ARTIST_STUDIO_DISCOVERY_RSS_URLS),
    unavailableReason: () => "ARTIST_STUDIO_DISCOVERY_RSS_URLS is not configured.",
    async search() {
      return [];
    }
  };
}
