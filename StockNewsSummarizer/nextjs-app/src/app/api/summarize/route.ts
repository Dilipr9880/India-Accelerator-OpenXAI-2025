import { NextResponse } from "next/server";

const NEWS_API = "https://newsapi.org/v2/everything";
const HF_SUMMARIZER = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
const HF_SENTIMENT = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment";

function mapLabel(label: string) {
  if (/NEGATIVE|LABEL_0/i.test(label)) return "Negative";
  if (/POSITIVE|LABEL_2/i.test(label)) return "Positive";
  return "Neutral";
}

async function analyzeSentiment(text: string) {
  try {
    const res = await fetch(HF_SENTIMENT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });
    if (!res.ok) return "Neutral";
    const data = await res.json();
    const arr = Array.isArray(data[0]) ? data[0] : data;
    if (!Array.isArray(arr)) return "Neutral";
    const best = arr.reduce((a: any, b: any) => (a.score > b.score ? a : b));
    return mapLabel(best.label);
  } catch {
    return "Neutral";
  }
}

export async function POST(req: Request) {
  try {
    const { ticker, from, to } = await req.json();
    if (!ticker) {
      return NextResponse.json({ error: "Ticker required" }, { status: 400 });
    }

    const url = `${NEWS_API}?q=${encodeURIComponent(
      ticker
    )}&pageSize=5&language=en&apiKey=${process.env.NEWS_API_KEY}${
      from ? `&from=${from}` : ""
    }${to ? `&to=${to}` : ""}`;

    const newsRes = await fetch(url);
    const newsData = await newsRes.json();
    const articles = (newsData.articles || []).slice(0, 5);

    if (articles.length === 0) {
      return NextResponse.json({
        summary: `No news found for ${ticker}`,
        sentiment: "⚠️ Neutral",
        keyPoints: [],
        articles: [],
        chartData: [],
      });
    }

    // Sentiment per article
    let pos = 0, neg = 0, neu = 0;
    for (let a of articles) {
      const s = await analyzeSentiment(`${a.title} ${a.description || ""}`);
      a.sentiment = s;
      if (s === "Positive") pos++;
      else if (s === "Negative") neg++;
      else neu++;
    }

    // Build summarizer input
    const context = articles
      .map((a: any, i: number) => `Article ${i + 1}: ${a.title}. ${a.description}`)
      .join("\n");

    const res = await fetch(HF_SUMMARIZER, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: context }),
    });

    let summary = "";
    if (res.ok) {
      const d = await res.json();
      summary = d?.[0]?.summary_text || "";
    }

    const sentiment =
      pos > neg && pos > neu
        ? "✅ Positive"
        : neg > pos && neg > neu
        ? "❌ Negative"
        : "⚠️ Neutral";

    return NextResponse.json({
      summary,
      sentiment,
      keyPoints: articles.map((a: any) => a.title),
      articles,
      chartData: [
        { name: "Positive", value: pos },
        { name: "Negative", value: neg },
        { name: "Neutral", value: neu },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
