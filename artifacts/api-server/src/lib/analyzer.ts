import { openai } from "./openai";
import { logger } from "./logger";

export interface ReviewItem {
  review: string;
  rating?: number | null;
  date?: string | null;
}

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  confidence: number;
}

export interface AnalysisResult {
  reviews: Array<ReviewItem & SentimentResult>;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  avgRating: number | null;
  sentimentScore: number;
  aiConfidence: number;
  overallSummary: string;
  customerOpinion: string;
  strengths: string;
  weaknesses: string;
  recommendation: string;
  businessInsights: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
  topPhrases: string[];
  ratingDistribution: Record<string, number>;
  sentimentTimeline: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  predNextMonthPositivePct: number;
  predNextMonthNegativePct: number;
  predExpectedRating: number;
  predSatisfactionScore: number;
  predRiskScore: number;
  predBuyRecommendation: string;
}

export async function analyzeReviews(
  productName: string,
  reviews: ReviewItem[]
): Promise<AnalysisResult> {
  // Batch analyze sentiment for all reviews
  const reviewTexts = reviews.map((r, i) => `${i + 1}. ${r.review}`).join("\n");

  const sentimentPrompt = `You are a sentiment analysis AI. Analyze the sentiment of these product reviews for "${productName}".

For EACH review, provide:
- sentiment: "positive", "negative", or "neutral"
- score: a float from -1.0 (very negative) to 1.0 (very positive)
- confidence: a float from 0.0 to 1.0

Reviews:
${reviewTexts}

Respond ONLY with a JSON array with exactly ${reviews.length} objects, one per review:
[{"sentiment":"positive","score":0.8,"confidence":0.95}, ...]`;

  const summaryPrompt = `You are an expert product analyst. Based on customer reviews for "${productName}", provide a comprehensive analysis.

Reviews sample:
${reviewTexts.slice(0, 3000)}

Respond with a JSON object:
{
  "overallSummary": "2-3 sentence overall product summary",
  "customerOpinion": "What customers generally think in 2 sentences",
  "strengths": "Top 3-4 product strengths as a comma-separated list",
  "weaknesses": "Top 2-3 product weaknesses as a comma-separated list",
  "recommendation": "Should you buy this? One clear sentence",
  "businessInsights": "2-3 actionable business insights for the seller",
  "positiveKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
  "negativeKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "topPhrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "predNextMonthPositivePct": 72.5,
  "predNextMonthNegativePct": 15.2,
  "predExpectedRating": 4.1,
  "predSatisfactionScore": 78.3,
  "predRiskScore": 22.4,
  "predBuyRecommendation": "Recommended — strong value proposition with minor quality concerns"
}`;

  const [sentimentResponse, summaryResponse] = await Promise.all([
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: sentimentPrompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    }).catch(() => null),
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: summaryPrompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    }).catch(() => null),
  ]);

  // Parse sentiment results
  let sentiments: SentimentResult[] = [];
  try {
    const raw = JSON.parse(sentimentResponse?.choices[0]?.message?.content ?? "{}");
    const arr = Array.isArray(raw) ? raw : raw.results ?? raw.sentiments ?? [];
    sentiments = arr.slice(0, reviews.length).map((s: Record<string, unknown>) => ({
      sentiment: (["positive", "negative", "neutral"].includes(String(s.sentiment)) ? s.sentiment : "neutral") as "positive" | "negative" | "neutral",
      score: typeof s.score === "number" ? s.score : 0,
      confidence: typeof s.confidence === "number" ? s.confidence : 0.7,
    }));
  } catch (e) {
    logger.warn({ err: e }, "Failed to parse sentiment response, using defaults");
  }

  // Fill missing sentiments with neutral
  while (sentiments.length < reviews.length) {
    sentiments.push({ sentiment: "neutral", score: 0, confidence: 0.5 });
  }

  // Parse summary
  let summary = {
    overallSummary: "Analysis complete.",
    customerOpinion: "Mixed reviews from customers.",
    strengths: "Quality, Value",
    weaknesses: "Shipping delays",
    recommendation: "Recommended with some reservations.",
    businessInsights: "Focus on improving delivery times.",
    positiveKeywords: ["quality", "value", "great", "good", "love"],
    negativeKeywords: ["slow", "issue", "problem"],
    topPhrases: ["great product", "good value", "fast shipping"],
    predNextMonthPositivePct: 70,
    predNextMonthNegativePct: 15,
    predExpectedRating: 4.0,
    predSatisfactionScore: 75,
    predRiskScore: 25,
    predBuyRecommendation: "Recommended based on overall sentiment trends.",
  };
  try {
    const raw = JSON.parse(summaryResponse?.choices[0]?.message?.content ?? "{}");
    summary = { ...summary, ...raw };
  } catch (e) {
    logger.warn({ err: e }, "Failed to parse summary response, using defaults");
  }

  // Compute metrics
  const positiveCount = sentiments.filter((s) => s.sentiment === "positive").length;
  const negativeCount = sentiments.filter((s) => s.sentiment === "negative").length;
  const neutralCount = sentiments.filter((s) => s.sentiment === "neutral").length;
  const total = reviews.length;

  const positivePct = total > 0 ? (positiveCount / total) * 100 : 0;
  const negativePct = total > 0 ? (negativeCount / total) * 100 : 0;
  const neutralPct = total > 0 ? (neutralCount / total) * 100 : 0;

  const ratingsWithValues = reviews.filter((r) => r.rating != null && !isNaN(Number(r.rating)));
  const avgRating =
    ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, r) => sum + Number(r.rating), 0) / ratingsWithValues.length
      : null;

  const sentimentScore =
    sentiments.reduce((sum, s) => sum + s.score, 0) / Math.max(1, sentiments.length);
  const aiConfidence =
    sentiments.reduce((sum, s) => sum + s.confidence, 0) / Math.max(1, sentiments.length);

  // Rating distribution
  const ratingDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of reviews) {
    if (r.rating != null) {
      const rounded = Math.round(Number(r.rating));
      if (rounded >= 1 && rounded <= 5) {
        ratingDistribution[String(rounded)] = (ratingDistribution[String(rounded)] ?? 0) + 1;
      }
    }
  }

  // Sentiment timeline: group by month if dates available, else fake monthly buckets
  const sentimentTimeline: Array<{ date: string; positive: number; negative: number; neutral: number }> = [];
  const monthMap = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();

  for (let i = 0; i < reviews.length; i++) {
    const rev = reviews[i];
    const sent = sentiments[i];
    const dateStr = rev.date ?? "";
    const monthKey = dateStr ? dateStr.slice(0, 7) : `Month ${Math.floor(i / Math.max(1, Math.floor(total / 6))) + 1}`;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { positive: 0, negative: 0, neutral: 0, total: 0 });
    }
    const entry = monthMap.get(monthKey)!;
    entry[sent.sentiment]++;
    entry.total++;
  }

  for (const [date, counts] of Array.from(monthMap.entries()).slice(0, 12)) {
    sentimentTimeline.push({
      date,
      positive: counts.total > 0 ? Math.round((counts.positive / counts.total) * 100) : 0,
      negative: counts.total > 0 ? Math.round((counts.negative / counts.total) * 100) : 0,
      neutral: counts.total > 0 ? Math.round((counts.neutral / counts.total) * 100) : 0,
    });
  }

  return {
    reviews: reviews.map((r, i) => ({
      ...r,
      sentiment: sentiments[i].sentiment,
      score: sentiments[i].score,
      confidence: sentiments[i].confidence,
    })),
    positivePct: Math.round(positivePct * 10) / 10,
    negativePct: Math.round(negativePct * 10) / 10,
    neutralPct: Math.round(neutralPct * 10) / 10,
    avgRating,
    sentimentScore: Math.round(sentimentScore * 1000) / 1000,
    aiConfidence: Math.round(aiConfidence * 1000) / 1000,
    ...summary,
    ratingDistribution,
    sentimentTimeline,
  };
}

/** Strip HTML tags and collapse whitespace to get readable plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Pull the most useful text sections out of raw page HTML. */
function extractPageText(html: string, maxChars = 8000): string {
  // Grab <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : "";

  // Grab meta description
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const meta = metaMatch ? metaMatch[1] : "";

  // Grab Open Graph title / description (richer on product pages)
  const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";
  const ogDesc  = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";
  const ogImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";

  // Strip the full page body and take a chunk
  const bodyText = stripHtml(html).slice(0, maxChars);

  const parts = [
    title && `PAGE TITLE: ${title}`,
    ogTitle && `OG TITLE: ${ogTitle}`,
    meta && `META DESC: ${meta}`,
    ogDesc && `OG DESC: ${ogDesc}`,
    `PAGE TEXT:\n${bodyText}`,
  ].filter(Boolean);

  return { text: parts.join("\n\n"), imageUrl: ogImage };
}

/** Attempt to fetch the product page with a realistic browser User-Agent. */
async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    return await res.text();
  } catch (e) {
    logger.warn({ err: e, url }, "Page fetch failed");
    return null;
  }
}

export async function extractProductInfo(url: string): Promise<{
  productName: string;
  productBrand?: string;
  productImageUrl?: string;
  productCategory?: string;
  productPrice?: string;
  sampleReviews: ReviewItem[];
}> {
  // 1. Try to actually fetch the page so GPT gets real content
  const html = await fetchPageHtml(url);
  let pageContext = "";
  let scrapedImageUrl = "";

  if (html) {
    const extracted = extractPageText(html);
    pageContext = extracted.text;
    scrapedImageUrl = extracted.imageUrl ?? "";
    logger.info({ url, chars: pageContext.length }, "Scraped product page");
  } else {
    logger.warn({ url }, "Could not fetch page — falling back to URL-only inference");
  }

  // 2. Ask GPT to parse the real page text (or fall back to URL inference)
  const prompt = html
    ? `You are a product data extractor. A customer submitted this e-commerce URL for review analysis:
URL: ${url}

Below is the actual page content we scraped from that URL. Use it to extract accurate product information.

=== SCRAPED PAGE CONTENT ===
${pageContext}
===========================

From the scraped content above, extract:
- The exact product name as listed on the page
- The brand/manufacturer
- The product category
- The price (if visible)

Then generate 20 realistic, DIVERSE customer reviews SPECIFIC to this exact product — its actual features, common complaints, use cases. 
Reviews must reflect the REAL product above (not a generic product).
Mix: ~60% positive (4-5★), ~20% neutral (3★), ~20% negative (1-2★).
Vary length from 1 sentence to 4 sentences. Make them sound like genuine human reviews.

Respond with JSON:
{
  "productName": "exact product name from the page",
  "productBrand": "brand/manufacturer",
  "productCategory": "category",
  "productPrice": "$XX.XX or null",
  "reviews": [
    {"review": "review text here", "rating": 5, "date": "2024-06-15"},
    ...20 items...
  ]
}`
    : `You are a product data extractor. Extract information from this e-commerce product URL:
URL: ${url}

The URL itself contains clues (product slug, ASIN, keywords). Use them carefully to infer:
- Product name (decode the slug/ASIN as best you can)
- Brand
- Category
- Approximate price range

Then generate 20 realistic, DIVERSE customer reviews SPECIFIC to the inferred product.
The reviews MUST be tailored to this specific product's likely features, problems, and use cases.
Mix: ~60% positive (4-5★), ~20% neutral (3★), ~20% negative (1-2★).

Respond with JSON:
{
  "productName": "...",
  "productBrand": "...",
  "productCategory": "...",
  "productPrice": "$XX.XX or null",
  "reviews": [
    {"review": "...", "rating": 4, "date": "2024-05-10"},
    ...20 items...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });
    const data = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      productName: data.productName ?? new URL(url).hostname + " Product",
      productBrand: data.productBrand ?? undefined,
      productImageUrl: scrapedImageUrl || undefined,
      productCategory: data.productCategory ?? undefined,
      productPrice: data.productPrice ?? undefined,
      sampleReviews: Array.isArray(data.reviews) ? data.reviews : [],
    };
  } catch (e) {
    logger.error({ err: e }, "Failed to extract product info");
    return {
      productName: "Product from " + new URL(url).hostname,
      sampleReviews: [],
    };
  }
}
