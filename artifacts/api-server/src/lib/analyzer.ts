import { getModel } from "./gemini";
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

async function callGemini(prompt: string): Promise<string> {
  const model = getModel("gemini-2.5-flash");
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });
  return result.response.text();
}

export async function analyzeReviews(
  productName: string,
  reviews: ReviewItem[]
): Promise<AnalysisResult> {
  const reviewTexts = reviews.map((r, i) => `${i + 1}. ${r.review}`).join("\n");

  const sentimentPrompt = `You are a sentiment analysis AI. Analyze the sentiment of each of these product reviews for "${productName}".

For EACH review, provide:
- sentiment: "positive", "negative", or "neutral"
- score: float from -1.0 (very negative) to 1.0 (very positive)
- confidence: float from 0.0 to 1.0

Reviews:
${reviewTexts}

Return a JSON object with a single key "results" containing an array of exactly ${reviews.length} objects:
{"results": [{"sentiment":"positive","score":0.8,"confidence":0.95}, ...]}`;

  const summaryPrompt = `You are an expert product analyst. Analyze these customer reviews for the product "${productName}" and provide a comprehensive analysis.

Reviews:
${reviewTexts.slice(0, 6000)}

Return a JSON object with exactly these fields:
{
  "overallSummary": "2-3 sentence overall product summary based on the reviews",
  "customerOpinion": "What customers generally think — 2 sentences",
  "strengths": "Top 3-4 product strengths mentioned in reviews, as a comma-separated list",
  "weaknesses": "Top 2-3 product weaknesses or complaints from reviews, as a comma-separated list",
  "recommendation": "One clear sentence — should someone buy this product?",
  "businessInsights": "2-3 actionable insights for the seller based on the reviews",
  "positiveKeywords": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"],
  "negativeKeywords": ["word1", "word2", "word3", "word4", "word5"],
  "topPhrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "predNextMonthPositivePct": 72.5,
  "predNextMonthNegativePct": 15.2,
  "predExpectedRating": 4.1,
  "predSatisfactionScore": 78.3,
  "predRiskScore": 22.4,
  "predBuyRecommendation": "One sentence buy recommendation with reasoning"
}`;

  const [sentimentRaw, summaryRaw] = await Promise.all([
    callGemini(sentimentPrompt).catch((e) => {
      logger.warn({ err: e }, "Sentiment Gemini call failed");
      return "{}";
    }),
    callGemini(summaryPrompt).catch((e) => {
      logger.warn({ err: e }, "Summary Gemini call failed");
      return "{}";
    }),
  ]);

  // Parse sentiment
  let sentiments: SentimentResult[] = [];
  try {
    const raw = JSON.parse(sentimentRaw);
    const arr = Array.isArray(raw) ? raw : (raw.results ?? raw.sentiments ?? []);
    sentiments = arr.slice(0, reviews.length).map((s: Record<string, unknown>) => ({
      sentiment: (["positive", "negative", "neutral"].includes(String(s.sentiment))
        ? s.sentiment
        : "neutral") as "positive" | "negative" | "neutral",
      score: typeof s.score === "number" ? s.score : 0,
      confidence: typeof s.confidence === "number" ? s.confidence : 0.7,
    }));
  } catch (e) {
    logger.warn({ err: e }, "Failed to parse sentiment response");
  }
  while (sentiments.length < reviews.length) {
    sentiments.push({ sentiment: "neutral", score: 0, confidence: 0.5 });
  }

  // Parse summary
  let summary = {
    overallSummary: "Analysis complete.",
    customerOpinion: "Mixed customer feedback.",
    strengths: "Quality, Value",
    weaknesses: "Shipping",
    recommendation: "Recommended with reservations.",
    businessInsights: "Focus on customer service.",
    positiveKeywords: ["quality", "value", "great", "good", "love", "easy", "fast", "durable"],
    negativeKeywords: ["slow", "issue", "problem", "cheap", "broken"],
    topPhrases: ["great product", "good value", "fast shipping", "easy to use", "highly recommend"],
    predNextMonthPositivePct: 70,
    predNextMonthNegativePct: 15,
    predExpectedRating: 4.0,
    predSatisfactionScore: 75,
    predRiskScore: 25,
    predBuyRecommendation: "Recommended based on overall sentiment.",
  };
  try {
    const raw = JSON.parse(summaryRaw);
    summary = { ...summary, ...raw };
  } catch (e) {
    logger.warn({ err: e }, "Failed to parse summary response");
  }

  // Compute metrics
  const total = reviews.length;
  const positiveCount = sentiments.filter((s) => s.sentiment === "positive").length;
  const negativeCount = sentiments.filter((s) => s.sentiment === "negative").length;
  const neutralCount = sentiments.filter((s) => s.sentiment === "neutral").length;

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

  // Sentiment timeline
  const monthMap = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();
  for (let i = 0; i < reviews.length; i++) {
    const rev = reviews[i];
    const sent = sentiments[i];
    const dateStr = rev.date ?? "";
    const monthKey = dateStr
      ? dateStr.slice(0, 7)
      : `Month ${Math.floor(i / Math.max(1, Math.floor(total / 6))) + 1}`;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { positive: 0, negative: 0, neutral: 0, total: 0 });
    }
    const entry = monthMap.get(monthKey)!;
    entry[sent.sentiment]++;
    entry.total++;
  }
  const sentimentTimeline = Array.from(monthMap.entries())
    .slice(0, 12)
    .map(([date, counts]) => ({
      date,
      positive: counts.total > 0 ? Math.round((counts.positive / counts.total) * 100) : 0,
      negative: counts.total > 0 ? Math.round((counts.negative / counts.total) * 100) : 0,
      neutral: counts.total > 0 ? Math.round((counts.neutral / counts.total) * 100) : 0,
    }));

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

/** Strip HTML tags and collapse whitespace. */
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

/** Extract the most useful text sections from raw HTML. */
function extractPageText(html: string, maxChars = 8000): { text: string; imageUrl: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : "";

  const metaMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const meta = metaMatch ? metaMatch[1] : "";

  const ogTitle =
    (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";
  const ogDesc =
    (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";
  const ogImage =
    (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";

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

/** Fetch product page HTML with a browser-like User-Agent. */
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
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
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
  const html = await fetchPageHtml(url);
  let pageContext = "";
  let scrapedImageUrl = "";

  if (html) {
    const extracted = extractPageText(html);
    pageContext = extracted.text;
    scrapedImageUrl = extracted.imageUrl;
    logger.info({ url, chars: pageContext.length }, "Scraped product page");
  } else {
    logger.warn({ url }, "Could not fetch page — falling back to URL-only inference");
  }

  const prompt = html
    ? `You are a product data extractor. A user submitted this e-commerce URL for review analysis:
URL: ${url}

Here is the actual scraped page content:

=== SCRAPED PAGE CONTENT ===
${pageContext}
===========================

From the content above, extract the exact product details and generate 20 realistic, SPECIFIC customer reviews for THIS product.
Reviews must reflect this product's actual features, typical use cases, and common complaints — NOT a generic product.
Mix: ~60% positive (4-5★), ~20% neutral (3★), ~20% negative (1-2★). Vary lengths from 1 to 4 sentences.

Return JSON:
{
  "productName": "exact product name from the page",
  "productBrand": "brand or manufacturer",
  "productCategory": "product category",
  "productPrice": "$XX.XX or null",
  "reviews": [
    {"review": "...", "rating": 5, "date": "2024-06-15"},
    ... 20 total items
  ]
}`
    : `You are a product data extractor. Decode this e-commerce product URL to identify the exact product:
URL: ${url}

Use the URL slug, ASIN, keywords, and domain to infer:
- Exact product name
- Brand / manufacturer
- Category
- Approximate price

Then generate 20 realistic, SPECIFIC customer reviews for THIS product.
Reviews must reflect this specific product's features, problems, and use cases — not a generic product type.
Mix: ~60% positive (4-5★), ~20% neutral (3★), ~20% negative (1-2★).

Return JSON:
{
  "productName": "...",
  "productBrand": "...",
  "productCategory": "...",
  "productPrice": "$XX.XX or null",
  "reviews": [
    {"review": "...", "rating": 4, "date": "2024-05-10"},
    ... 20 total items
  ]
}`;

  try {
    const raw = await callGemini(prompt);
    const data = JSON.parse(raw);
    return {
      productName: data.productName ?? new URL(url).hostname + " Product",
      productBrand: data.productBrand ?? undefined,
      productImageUrl: scrapedImageUrl || undefined,
      productCategory: data.productCategory ?? undefined,
      productPrice: data.productPrice ?? undefined,
      sampleReviews: Array.isArray(data.reviews) ? data.reviews : [],
    };
  } catch (e) {
    logger.error({ err: e }, "Failed to extract product info via Gemini");
    return {
      productName: "Product from " + new URL(url).hostname,
      sampleReviews: [],
    };
  }
}
