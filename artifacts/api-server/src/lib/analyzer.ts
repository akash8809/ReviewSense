import { getModel } from "./gemini";
import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";

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

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "was", "are", "were", "to", "for",
  "in", "on", "at", "by", "this", "that", "it", "with", "as", "of", "i", "you",
  "he", "she", "they", "we", "my", "your", "our", "their", "me", "him", "her",
  "us", "them", "this", "that", "these", "those", "have", "has", "had", "do",
  "does", "did", "will", "would", "shall", "should", "can", "could", "may",
  "might", "must", "about", "above", "after", "again", "against", "all", "am",
  "any", "because", "been", "before", "being", "below", "between", "both",
  "but", "cannot", "could", "during", "each", "few", "from", "further",
  "here", "how", "if", "into", "more", "most", "no", "nor", "not", "only",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
  "so", "some", "such", "than", "then", "there", "their", "theirs", "themselves",
  "thence", "thereabout", "thereafter", "thereby", "therefore", "therein",
  "thereupon", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when", "where",
  "which", "while", "who", "whom", "why", "with", "would", "you", "your",
  "yours", "yourself", "yourselves", "product", "reviews", "review", "one", "just",
  "get", "got", "make", "made", "like", "love", "really"
]);

function extractKeywords(reviews: string[], count = 8): string[] {
  const frequencies: Record<string, number> = {};
  for (const text of reviews) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    for (const w of words) {
      frequencies[w] = (frequencies[w] ?? 0) + 1;
    }
  }
  return Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(entry => entry[0]);
}

function extractTopPhrases(reviews: string[], count = 5): string[] {
  const frequencies: Record<string, number> = {};
  for (const text of reviews) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (words[i].length <= 2 || words[i + 1].length <= 2 || STOP_WORDS.has(words[i]) || STOP_WORDS.has(words[i + 1])) {
        continue;
      }
      frequencies[phrase] = (frequencies[phrase] ?? 0) + 1;
    }
  }
  return Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(entry => entry[0]);
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
const ML_API_URL =
  process.env.ML_API_URL || "http://localhost:5001";

export async function analyzeReviews(
  productName: string,
  reviews: ReviewItem[],
  analysisId?: number
): Promise<AnalysisResult> {
  let sentiments: SentimentResult[] = [];
  let predictionTimeMs = 0;

  try {
    const startPredict = performance.now();
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviews: reviews.map((r) => r.review) }),
    });
    const endPredict = performance.now();
    predictionTimeMs = endPredict - startPredict;

    if (!response.ok) {
      throw new Error(`FastAPI predict server returned status ${response.status}`);
    }

    const data = (await response.json()) as { results: string[]; confidences: number[] };
    sentiments = data.results.map((res, i) => {
      const sentiment = res.toLowerCase() as "positive" | "negative" | "neutral";
      const conf = data.confidences?.[i] ?? 0.8;
      let score = 0;
      if (sentiment === "positive") score = conf;
      else if (sentiment === "negative") score = -conf;

      // Temporary debug logs
      console.log(`[DEBUG] analyzer.ts sentiment mapping:`);
      console.log(`  Original review: "${reviews[i].review}"`);
      console.log(`  Raw prediction: "${res}"`);
      console.log(`  Mapped sentiment: "${sentiment}"`);
      console.log(`  Confidence: ${conf}`);
      console.log(`  Score: ${score}`);

      return {
        sentiment,
        score,
        confidence: conf,
      };
    });
  } catch (e) {
    logger.error({ err: e }, "Failed to get sentiment predictions from FastAPI server");
    sentiments = reviews.map(() => ({
      sentiment: "neutral",
      score: 0,
      confidence: 0.5,
    }));
  }

  // Save prediction time
  if (analysisId) {
    try {
      const timesPath = path.join(process.cwd(), "ml", "prediction_times.json");
      let times: Record<string, number> = {};
      if (fs.existsSync(timesPath)) {
        times = JSON.parse(fs.readFileSync(timesPath, "utf-8"));
      }
      times[String(analysisId)] = Math.round(predictionTimeMs * 10) / 10;
      fs.writeFileSync(timesPath, JSON.stringify(times, null, 2), "utf-8");
    } catch (e) {
      logger.warn({ err: e }, "Failed to write prediction time to JSON cache");
    }
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

  // Extract keywords and top phrases
  const positiveReviewTexts = reviews
    .filter((_, idx) => sentiments[idx].sentiment === "positive")
    .map((r) => r.review);
  const negativeReviewTexts = reviews
    .filter((_, idx) => sentiments[idx].sentiment === "negative")
    .map((r) => r.review);
  const allReviewTexts = reviews.map((r) => r.review);

  const positiveKeywords = extractKeywords(positiveReviewTexts, 8);
  const negativeKeywords = extractKeywords(negativeReviewTexts, 5);
  const topPhrases = extractTopPhrases(allReviewTexts, 5);

  const summaryPrompt = `You are an expert product analyst. Review the following machine learning sentiment analysis results for the product "${productName}":

- Total Reviews: ${total}
- Positive Sentiment percentage: ${positivePct.toFixed(1)}%
- Negative Sentiment percentage: ${negativePct.toFixed(1)}%
- Neutral Sentiment percentage: ${neutralPct.toFixed(1)}%
- Average ML Classification Confidence: ${(aiConfidence * 100).toFixed(1)}%
- Top Positive Keywords: ${positiveKeywords.join(", ")}
- Top Negative Keywords: ${negativeKeywords.join(", ")}
- Common Themes / Key Phrases: ${topPhrases.join(", ")}

Based ONLY on this aggregated sentiment analysis, generate a comprehensive product analysis.
Return a JSON object with exactly these fields:
{
  "overallSummary": "2-3 sentence overall product summary based on the reviews",
  "customerOpinion": "What customers generally think — 2 sentences",
  "strengths": "Top 3-4 product strengths, as a comma-separated list",
  "weaknesses": "Top 2-3 product weaknesses or complaints, as a comma-separated list",
  "recommendation": "One clear sentence — should someone buy this product?",
  "businessInsights": "2-3 actionable insights for the seller based on the reviews",
  "predNextMonthPositivePct": float (e.g. 72.5),
  "predNextMonthNegativePct": float (e.g. 15.2),
  "predExpectedRating": float (e.g. 4.1),
  "predSatisfactionScore": float (e.g. 78.3),
  "predRiskScore": float (e.g. 22.4),
  "predBuyRecommendation": "One sentence buy recommendation with reasoning"
}`;

  let summary = {
    overallSummary: "Analysis complete.",
    customerOpinion: "Mixed customer feedback.",
    strengths: "Quality, Value",
    weaknesses: "Shipping",
    recommendation: "Recommended with reservations.",
    businessInsights: "Focus on customer service.",
    predNextMonthPositivePct: 70,
    predNextMonthNegativePct: 15,
    predExpectedRating: 4.0,
    predSatisfactionScore: 75,
    predRiskScore: 25,
    predBuyRecommendation: "Recommended based on overall sentiment.",
  };

  try {
    const summaryRaw = await callGemini(summaryPrompt);
    const raw = JSON.parse(summaryRaw);
    summary = { ...summary, ...raw };
  } catch (e) {
    logger.warn({ err: e }, "Failed to get/parse Gemini summary response");
  }

  const ratingDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of reviews) {
    if (r.rating != null) {
      const rounded = Math.round(Number(r.rating));
      if (rounded >= 1 && rounded <= 5) {
        ratingDistribution[String(rounded)] = (ratingDistribution[String(rounded)] ?? 0) + 1;
      }
    }
  }

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
    positiveKeywords,
    negativeKeywords,
    topPhrases,
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
