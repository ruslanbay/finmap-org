import type { NewsItem, CompanyInfo } from "./types.js";
import type { Language } from "../types.js";
import { getConfig } from "../config.js";

export async function fetchNews(
  ticker: string,
  companyName: string,
  date: string,
): Promise<NewsItem[]> {
  const config = getConfig();

  let newsLang: string;
  let displayName: string;

  switch (config.language) {
    case "en":
      newsLang = "hl=en-US&gl=US&ceid=US:en";
      displayName = companyName;
      break;
    case "ru":
      newsLang = "hl=ru&gl=RU&ceid=RU:ru";
      displayName = companyName;
      break;
    default:
      newsLang = "hl=en-US&gl=US&ceid=US:en";
      displayName = companyName;
      break;
  }

  const newsQuery = encodeURIComponent(
    displayName.split(" ").slice(0, 2).join(" "),
  );
  const url = `https://news.finmap.org/${config.language}:${ticker}.xml?q=${newsQuery}+before:${date}&${newsLang}&_=${new Date().toISOString().split(":")[0]}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("XML parsing failed");
    }

    const items = Array.from(xmlDoc.getElementsByTagName("item"));

    const newsItems = items
      .map((item) => {
        const title = item.getElementsByTagName("title")[0]?.textContent || "";
        const link = item.getElementsByTagName("link")[0]?.textContent || "";
        const pubDate =
          item.getElementsByTagName("pubDate")[0]?.textContent || "";
        const source =
          item.getElementsByTagName("source")[0]?.textContent || "";
        const sourceUrl =
          item.getElementsByTagName("source")[0]?.getAttribute("url") || "";

        return {
          title: title.trim(),
          link: link.trim(),
          pubDate: formatNewsDate(pubDate),
          source: source.trim(),
          sourceUrl: sourceUrl.trim(),
          originalPubDate: pubDate,
        };
      })
      .filter((item) => item.title && item.link);

    // Sort by original date (newest first)
    newsItems.sort(
      (a, b) =>
        new Date(b.originalPubDate).getTime() -
        new Date(a.originalPubDate).getTime(),
    );

    // Remove the temporary originalPubDate field
    return newsItems.map(({ originalPubDate, ...item }) => item);
    return newsItems;
  } catch (error) {
    console.warn("Failed to fetch news:", error);
    return [];
  }
}

function formatNewsDate(pubDateStr: string): string {
  if (!pubDateStr) return "";

  try {
    const date = new Date(pubDateStr);
    if (isNaN(date.getTime())) return pubDateStr;

    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    return date.toLocaleDateString("en-US", options);
  } catch {
    return pubDateStr;
  }
}

export async function fetchCompanyInfo(
  exchange: string,
  ticker: string,
  wikiPageIdEng?: string,
  wikiPageIdOriginal?: string,
): Promise<CompanyInfo | null> {
  const config = getConfig();

  try {
    switch (exchange) {
      case "nasdaq":
      case "nyse":
      case "amex":
      case "us-all":
        return await fetchUSCompanyInfo(exchange, ticker);
      case "moex":
        return await fetchWikiInfo(
          wikiPageIdEng,
          wikiPageIdOriginal,
          config.language,
        );
      default:
        return null;
    }
  } catch (error) {
    console.warn("Failed to fetch company info:", error);
    return null;
  }
}

async function fetchUSCompanyInfo(
  exchange: string,
  ticker: string,
): Promise<CompanyInfo | null> {
  const url = `https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/securities/${exchange}/${ticker[0]}/${ticker}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const description = json.data?.CompanyDescription?.value || "";
    const sourceLink = json.data?.CompanyUrl?.value || "";

    if (!description && !sourceLink) return null;

    return {
      description: description.trim(),
      sourceLink: sourceLink.trim(),
    };
  } catch (error) {
    console.warn(`Failed to fetch US company info for ${ticker}:`, error);
    return null;
  }
}

async function fetchWikiInfo(
  wikiPageIdEng?: string,
  wikiPageIdOriginal?: string,
  language?: string,
): Promise<CompanyInfo | null> {
  // Determine which wiki page ID to use based on language
  let wikiPageId: string;
  const config = getConfig();
  const lang: Language = config.language;

  if (language === "ru" && wikiPageIdOriginal) {
    wikiPageId = wikiPageIdOriginal;
  } else if (wikiPageIdEng) {
    wikiPageId = wikiPageIdEng;
  } else {
    return null;
  }

  // Convert string to number if valid
  const pageId = parseInt(wikiPageId);
  if (!pageId || isNaN(pageId)) return null;

  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts&exintro&explaintext&format=json&origin=*`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const pages = (json.query?.pages as Record<string, any>) || {};
    const pageIds = Object.keys(pages);
    if (pageIds.length === 0) return null;

    const firstPageId = Number(pageIds[0]);
    const page = pages[firstPageId];

    // Check if page exists (negative ID means page doesn't exist)
    if (firstPageId < 0 || !page?.extract) {
      return null;
    }

    const description = page.extract.trim();
    const sourceLink = `https://${lang}.wikipedia.org/wiki/?curid=${pageId}`;

    return { description, sourceLink };
  } catch (error) {
    console.warn(`Failed to fetch company info for page ${pageId}:`, error);
    return null;
  }
}
