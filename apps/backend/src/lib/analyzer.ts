import { getModel } from "./gemini";
import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

function getMlServicePath(fileName: string): string {
  // If running from monorepo root
  let p = path.join(process.cwd(), "apps", "ml-service", fileName);
  if (fs.existsSync(p)) return p;
  // If running from apps/backend
  p = path.join(process.cwd(), "..", "ml-service", fileName);
  if (fs.existsSync(p)) return p;
  // Fallback
  return path.join(process.cwd(), "apps", "ml-service", fileName);
}

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

    // 1. Before calling the ML API print
    console.log("ML_API_URL:", ML_API_URL);
    console.log("Sending reviews:", reviews.length);

    const payload = { reviews: reviews.map((r) => r.review) };

    // 4. Print the exact payload sent to the ML service.
    console.log("[DEBUG] Payload sent to ML service:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${ML_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const endPredict = performance.now();
    predictionTimeMs = endPredict - startPredict;

    // 2. Print the HTTP response status and headers.
    console.log("[DEBUG] ML HTTP Response Status:", response.status);
    console.log("[DEBUG] ML HTTP Response Headers:");
    response.headers.forEach((val, key) => console.log(`  ${key}: ${val}`));

    // 3. If the response is not 200, print the full error. Never silently fall back to Neutral.
    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[ERROR] ML service failed with status ${response.status}. Response body:`, errBody);
      throw new Error(`FastAPI predict server returned status ${response.status}: ${errBody}`);
    }

    const rawBody = await response.text();
    // 5. Print the exact JSON returned from the ML service.
    console.log("[DEBUG] ML HTTP Response Body (Raw JSON):", rawBody);

    const data = JSON.parse(rawBody) as { results: any[]; confidences: number[] };

    sentiments = data.results.map((res, i) => {
      // 6. Verify mapping. Do NOT assume mapping. Print every prediction.
      let sentiment: "positive" | "negative" | "neutral" = "neutral";
      const rawPredStr = String(res);
      const rawPredLower = rawPredStr.toLowerCase();

      // Support 0 -> Negative, 1 -> Neutral, 2 -> Positive, or string labels
      if (rawPredLower === "positive" || rawPredStr === "2") {
        sentiment = "positive";
      } else if (rawPredLower === "negative" || rawPredStr === "0") {
        sentiment = "negative";
      } else if (rawPredLower === "neutral" || rawPredStr === "1") {
        sentiment = "neutral";
      } else {
        console.warn(`[WARN] Unknown prediction value: "${res}", mapped to neutral.`);
        sentiment = "neutral";
      }

      const conf = data.confidences?.[i] ?? 0.8;
      let score = 0;
      if (sentiment === "positive") score = conf;
      else if (sentiment === "negative") score = -conf;

      // 7. Verify that analyzer.ts is not overwriting the ML prediction.
      console.log(`[DEBUG] Prediction details for review #${i}:`);
      console.log(`  Raw prediction: ${res}`);
      console.log(`  Mapped sentiment: ${sentiment}`);
      console.log(`  Final sentiment: ${sentiment}`);
      console.log(`  Confidence: ${conf}`);
      console.log(`  Score: ${score}`);

      return {
        sentiment,
        score,
        confidence: conf,
      };
    });
  } catch (e) {
    // 8. If any exception occurs, print the full stack trace instead of returning Neutral.
    console.error("[CRITICAL ERROR] Exception in ML prediction pipeline:", e);
    throw e;
  }

  // Save prediction time
  if (analysisId) {
    try {
      const timesPath = getMlServicePath("prediction_times.json");
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
  const twitterImage =
    (html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ?? [])[1] ?? "";
  
  const landingImageMatch = html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i) ??
                            html.match(/src=["']([^"']+)["'][^>]+id=["']landingImage["']/i);
  const landingImage = landingImageMatch ? landingImageMatch[1] : "";

  const mainImageMatch = html.match(/id=["']main-image["'][^>]+src=["']([^"']+)["']/i) ??
                         html.match(/src=["']([^"']+)["'][^>]+id=["']main-image["']/i);
  const mainImage = mainImageMatch ? mainImageMatch[1] : "";

  const productImageUrl = ogImage || twitterImage || landingImage || mainImage || "";

  const bodyText = stripHtml(html).slice(0, maxChars);

  const parts = [
    title && `PAGE TITLE: ${title}`,
    ogTitle && `OG TITLE: ${ogTitle}`,
    meta && `META DESC: ${meta}`,
    ogDesc && `OG DESC: ${ogDesc}`,
    `PAGE TEXT:\n${bodyText}`,
  ].filter(Boolean);

  return { text: parts.join("\n\n"), imageUrl: productImageUrl };
}

/** Detect if the scraped HTML represents a block or CAPTCHA from Amazon */
function detectBlock(html: string): string | null {
  if (!html || html.trim().length < 200) {
    return "Empty or extremely short HTML returned";
  }
  const lower = html.toLowerCase();
  if (lower.includes("robot check") || lower.includes("sorry, we just need to make sure you're not a robot") || lower.includes("api-services-support@amazon.com")) {
    return "Amazon Robot Check/CAPTCHA page detected";
  }
  if (lower.includes("captcha")) {
    return "CAPTCHA page detected";
  }
  if (lower.includes("access denied")) {
    return "Access Denied detected";
  }
  if (lower.includes("sign-in") || lower.includes("signin") || lower.includes("sign in")) {
    if (lower.includes("amazon sign-in") || lower.includes("sign in to your account")) {
      return "Amazon Sign-In page redirect detected";
    }
  }
  return null;
}

function normalizeUrl(urlStr: string): string {
  try {
    const urlObj = new URL(urlStr);
    const cleanPath = urlObj.pathname.replace(/\/ref=.*$/, "");
    return `${urlObj.origin}${cleanPath}`;
  } catch {
    return urlStr;
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
  const normalized = normalizeUrl(url);
  console.log(`[DEBUG] Incoming URL: "${url}"`);
  console.log(`[DEBUG] Normalized URL: "${normalized}"`);

  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const extraHeaders = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
  };

  console.log(`[DEBUG] User-Agent sent: "${userAgent}"`);
  console.log(`[DEBUG] Headers sent:`, JSON.stringify(extraHeaders, null, 2));

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ]
    });

    const context = await browser.newContext({
      userAgent,
      extraHTTPHeaders: extraHeaders,
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      timezoneId: "America/New_York"
    });

    const page = await context.newPage();
    
    // Hide Automation Webdriver Flag
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
    
    // Track redirects
    let redirectCount = 0;
    page.on("response", (res) => {
      const status = res.status();
      if (status >= 300 && status < 400) {
        redirectCount++;
      }
    });

    // Establish a real browser session by navigating to the home page first
    console.log("[DEBUG] Navigating to Amazon home page to establish session cookies...");
    try {
      await page.goto("https://www.amazon.com/", {
        waitUntil: "domcontentloaded",
        timeout: 20000
      });
      await page.waitForTimeout(1500);
    } catch (err) {
      console.warn("[DEBUG] Initial home page navigation timed out or failed, continuing directly...", err);
    }

    const asinMatch = normalized.match(/\/dp\/([A-Z0-9]{10})/i) || normalized.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    let successfullyLoaded = false;
    let targetAsin = "";

    if (asinMatch) {
      targetAsin = asinMatch[1];
      const searchUrl = `${new URL(normalized).origin}/s?k=${targetAsin}`;
      console.log(`[DEBUG] ASIN "${targetAsin}" detected. Trying stealth search entry: ${searchUrl}`);
      try {
        const searchResponse = await page.goto(searchUrl, {
          waitUntil: "domcontentloaded",
          timeout: 25000
        });

        if (searchResponse && searchResponse.status() === 200) {
          const searchHtml = await page.content();
          if (!detectBlock(searchHtml)) {
            // Find EXACT link containing the target ASIN on the search page case-insensitively
            const exactProductHref = await page.evaluate((asin) => {
              const doc = (globalThis as any).document;
              const anchors = Array.from(doc.querySelectorAll('a')) as any[];
              const match = anchors.find(a => {
                const href = a.href || '';
                return href.toLowerCase().includes(`/dp/${asin.toLowerCase()}`) || 
                       href.toLowerCase().includes(`/gp/product/${asin.toLowerCase()}`);
              });
              return match ? match.href : null;
            }, targetAsin);

            if (exactProductHref) {
              console.log(`[DEBUG] Found exact target ASIN product link on search page: ${exactProductHref}`);
              await page.goto(exactProductHref, { waitUntil: "domcontentloaded", timeout: 25000 });
              successfullyLoaded = true;
            } else {
              console.warn("[DEBUG] Exact ASIN link not found on search results page. Clicking first listing instead...");
              const linkSelector = 'a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal';
              const hasLink = await page.$(linkSelector);
              if (hasLink) {
                await Promise.all([
                  page.click(linkSelector),
                  page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 })
                ]);
                successfullyLoaded = true;
              }
            }
          } else {
            console.warn("[DEBUG] Search page blocked by CAPTCHA, skipping stealth search entry.");
          }
        }
      } catch (err) {
        console.warn("[DEBUG] Stealth search entry failed, falling back to direct navigation.", err);
      }
    }

    if (!successfullyLoaded) {
      console.log(`[DEBUG] Navigating directly to URL: ${normalized}`);
      const response = await page.goto(normalized, {
        waitUntil: "domcontentloaded",
        timeout: 25000
      });

      if (!response) {
        console.error("[ERROR] Amazon product could not be scraped. Empty response from Playwright.");
        throw new Error("Amazon product could not be scraped. Empty response from browser.");
      }

      const status = response.status();
      const finalUrl = response.url();
      console.log(`[DEBUG] Response Status: ${status}`);
      console.log(`[DEBUG] Final URL after redirects: ${finalUrl}`);
    }

    const html = await page.content();
    console.log(`[DEBUG] Final loaded URL: ${page.url()}`);
    console.log(`[DEBUG] Loaded Page HTML size: ${html.length} characters`);

    // CAPTCHA / Bot detection
    const blockReason = detectBlock(html);
    if (blockReason) {
      console.error(`[ERROR] Block detected: ${blockReason}`);
      console.log(`[DEBUG] Blocked HTML (First 1000 characters):\n${html.slice(0, 1000)}`);
      throw new Error(`Amazon product could not be scraped. Amazon blocked the request: ${blockReason}`);
    }

    // Scroll directly to the customer reviews section to trigger lazy widget loading
    const reviewsSection = await page.$("#customerReviews");
    if (reviewsSection) {
      console.log("[DEBUG] Scrolling to customer reviews section...");
      await reviewsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      // Trigger scroll event
       await page.evaluate(() => {
        (globalThis as any).scrollBy(0, 100);
        (globalThis as any).scrollBy(0, -50);
      });
      await page.waitForTimeout(1500);
    } else {
      console.log("[DEBUG] #customerReviews wrapper not found, doing progressive scroll...");
      await page.evaluate(() => {
        (globalThis as any).scrollTo(0, (globalThis as any).document.body.scrollHeight * 0.4);
      });
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        (globalThis as any).scrollTo(0, (globalThis as any).document.body.scrollHeight * 0.75);
      });
      await page.waitForTimeout(1500);
    }

    console.log("[DEBUG] Waiting for review containers to be attached in DOM...");
    try {
      await page.waitForSelector('div[data-hook="review"], .review, .a-section.review', { state: "attached", timeout: 15000 });
      console.log("[DEBUG] Review containers attached successfully!");
    } catch (e) {
      console.warn("[DEBUG] Timeout waiting for review containers to attach in DOM.", e);
    }

    const extracted = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      // 1. Title
      const titleEl = doc.querySelector("#productTitle") || doc.querySelector("#title") || doc.querySelector(".qa-title-text");
      const productName = titleEl ? titleEl.textContent.trim() : "";

      // 2. Brand
      const brandEl = doc.querySelector("#bylineInfo") || doc.querySelector(".po-brand .a-span9") || doc.querySelector("#brand");
      const productBrand = brandEl ? brandEl.textContent.replace(/^Brand:\s*/i, "").trim() : undefined;

      // 3. Category
      const categoryEl = doc.querySelector("#wayfinding-breadcrumbs_container") || doc.querySelector("#showing-breadcrumbs_div") || doc.querySelector(".wayfinding-breadcrumbs");
      const productCategory = categoryEl ? categoryEl.textContent.replace(/\s+/g, " ").trim() : undefined;

      // 4. Price
      const priceEl = doc.querySelector(".a-price .a-offscreen") || doc.querySelector("#priceblock_ourprice") || doc.querySelector(".priceBlockBuyingPriceString");
      const productPrice = priceEl ? priceEl.textContent.trim() : undefined;

      // 5. Image URL
      const imgEl = doc.querySelector("#landingImage") || doc.querySelector("#main-image") || doc.querySelector("#imgBlkFront") || doc.querySelector("#ebooksImgBlkFront");
      const productImageUrl = imgEl ? imgEl.getAttribute("src") : undefined;

      // 6. Average Product Rating
      const ratingAvgEl = doc.querySelector("span[data-hook='rating-out-of-text']") || doc.querySelector(".a-icon-alt");
      const ratingAvgText = ratingAvgEl ? ratingAvgEl.textContent.trim() : "";

      // 7. Review Items
      const reviewContainers = doc.querySelectorAll('div[data-hook="review"], .review, .a-section.review');
      const reviews: Array<{ review: string; rating?: number | null; date?: string | null }> = [];

      reviewContainers.forEach((container: any) => {
        const bodyEl = container.querySelector('[data-hook="review-body"], [data-hook="reviewText"], [data-hook="reviewRichContentContainer"], .review-text-content');
        let text = bodyEl ? bodyEl.textContent.trim() : "";
        text = text
          .replace("Brief content visible, double tap to read full content.", "")
          .replace("Full content visible, double tap to read brief content.", "")
          .trim();
        if (!text) return;

        // Rating
        const starEl = container.querySelector('i[data-hook="review-star-rating"], .review-rating');
        let ratingValue: number | null = null;
        if (starEl) {
          const classMatch = starEl.className.match(/a-star-(\d)/);
          if (classMatch) {
            ratingValue = parseInt(classMatch[1], 10);
          } else {
            const altText = starEl.querySelector(".a-icon-alt")?.textContent || "";
            const numMatch = altText.match(/(\d(\.\d)?)/);
            if (numMatch) {
              ratingValue = parseFloat(numMatch[1]);
            }
          }
        }

        // Date
        const dateEl = container.querySelector('span[data-hook="review-date"], .review-date');
        let dateVal: string | null = null;
        if (dateEl) {
          dateVal = dateEl.textContent.trim();
        }

        reviews.push({
          review: text,
          rating: ratingValue,
          date: dateVal
        });
      });

      return {
        productName,
        productBrand,
        productCategory,
        productPrice,
        productImageUrl,
        ratingAvgText,
        reviews,
        containersCount: reviewContainers.length
      };
    });

    const finalLoadedUrl = page.url();
    const loadedAsinMatch = finalLoadedUrl.match(/\/dp\/([A-Z0-9]{10})/i) || finalLoadedUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    const resolvedAsin = loadedAsinMatch ? loadedAsinMatch[1] : targetAsin;

    // Fallback: If no reviews found on main page, try the reviews page directly
    if (extracted.reviews.length === 0 && resolvedAsin) {
      console.log(`[DEBUG] No reviews found on product details page. Navigating to reviews page for ASIN ${resolvedAsin}...`);
      const reviewsUrl = `${new URL(normalized).origin}/product-reviews/${resolvedAsin}`;
      console.log(`[DEBUG] Loading reviews URL: ${reviewsUrl}`);
      try {
        const revResponse = await page.goto(reviewsUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        console.log(`[DEBUG] Reviews Page Status: ${revResponse?.status()}`);
        await page.waitForTimeout(2500);

        const reviewsHtml = await page.content();
        console.log(`[DEBUG] Reviews Page HTML Size: ${reviewsHtml.length} characters`);
        const revBlock = detectBlock(reviewsHtml);
        if (revBlock) {
          console.warn(`[DEBUG] Reviews Page Blocked: ${revBlock}`);
        } else {
          const reviewsExtracted = await page.evaluate(() => {
            const doc = (globalThis as any).document;
            const reviewContainers = doc.querySelectorAll('div[data-hook="review"], .review, .a-section.review');
            const reviews: Array<{ review: string; rating?: number | null; date?: string | null }> = [];

            reviewContainers.forEach((container: any) => {
              const bodyEl = container.querySelector('[data-hook="review-body"], [data-hook="reviewText"], [data-hook="reviewRichContentContainer"], .review-text-content');
              let text = bodyEl ? bodyEl.textContent.trim() : "";
              text = text
                .replace("Brief content visible, double tap to read full content.", "")
                .replace("Full content visible, double tap to read brief content.", "")
                .trim();
              if (!text) return;

              const starEl = container.querySelector('i[data-hook="review-star-rating"], .review-rating');
              let ratingValue: number | null = null;
              if (starEl) {
                const classMatch = starEl.className.match(/a-star-(\d)/);
                if (classMatch) {
                  ratingValue = parseInt(classMatch[1], 10);
                } else {
                  const altText = starEl.querySelector(".a-icon-alt")?.textContent || "";
                  const numMatch = altText.match(/(\d(\.\d)?)/);
                  if (numMatch) ratingValue = parseFloat(numMatch[1]);
                }
              }

              const dateEl = container.querySelector('span[data-hook="review-date"], .review-date');
              let dateVal: string | null = null;
              if (dateEl) dateVal = dateEl.textContent.trim();

              reviews.push({ review: text, rating: ratingValue, date: dateVal });
            });

            return { reviews, containersCount: reviewContainers.length };
          });

          console.log(`[DEBUG] Reviews Page Review Containers Found: ${reviewsExtracted.containersCount}`);
          console.log(`[DEBUG] Reviews Page Real Reviews Extracted count: ${reviewsExtracted.reviews.length}`);

          extracted.reviews = reviewsExtracted.reviews;
          extracted.containersCount = reviewsExtracted.containersCount;
        }
      } catch (err) {
        console.warn("[DEBUG] Error fetching fallback reviews page:", err);
      }
    }

    console.log(`[DEBUG] Scraper Product Title Found: "${extracted.productName}"`);
    console.log(`[DEBUG] Scraper Brand Found: "${extracted.productBrand || 'N/A'}"`);
    console.log(`[DEBUG] Scraper Image URL Found: "${extracted.productImageUrl || 'N/A'}"`);
    console.log(`[DEBUG] Scraper Rating Info: "${extracted.ratingAvgText || 'N/A'}"`);
    console.log(`[DEBUG] Review Containers Found: ${extracted.containersCount}`);
    console.log(`[DEBUG] Real Reviews Extracted count: ${extracted.reviews.length}`);

    // Print first 3 reviews for verification
    if (extracted.reviews.length > 0) {
      console.log("[DEBUG] First 3 extracted reviews:");
      extracted.reviews.slice(0, 3).forEach((r, idx) => {
        console.log(`  Review #${idx + 1}: Rating ${r.rating} - Date "${r.date}" - "${r.review.slice(0, 100)}..."`);
      });
    }

    // Validation
    if (!extracted.productName || extracted.productName.toLowerCase().includes("product from") || (extracted.productName.toLowerCase().includes("product") && extracted.productName.toLowerCase().includes("amazon")) || extracted.productName === "www.amazon.in Product" || extracted.productName === "www.amazon.com Product") {
      console.error(`[ERROR] Validation failed: productName is missing, generic, or invalid ("${extracted.productName}")`);
      throw new Error(`Amazon product could not be scraped: Title validation failed ("${extracted.productName}")`);
    }

    if (extracted.reviews.length === 0) {
      console.error("[ERROR] Validation failed: no reviews extracted.");
      throw new Error("Amazon product could not be scraped: Zero reviews found on page DOM selectors.");
    }

    if (!extracted.productImageUrl) {
      console.error("[ERROR] Validation failed: productImageUrl is missing.");
      throw new Error("Amazon product could not be scraped: Image selector failed.");
    }

    const payload = {
      productName: extracted.productName,
      productBrand: extracted.productBrand ?? undefined,
      productImageUrl: extracted.productImageUrl,
      productCategory: extracted.productCategory ?? undefined,
      productPrice: extracted.productPrice ?? undefined,
      sampleReviews: extracted.reviews,
    };

    console.log("[DEBUG] Final payload returned by scraper:", JSON.stringify(payload, null, 2));

    return payload;

  } catch (e) {
    console.error("[ERROR] Exception in Playwright scraping pipeline:", e);
    throw new Error(`Amazon product could not be scraped. Reason: ${e instanceof Error ? e.message : e}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
