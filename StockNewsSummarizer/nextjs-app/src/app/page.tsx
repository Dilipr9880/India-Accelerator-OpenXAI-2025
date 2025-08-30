"use client";

import { useState, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [ticker, setTicker] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [summary, setSummary] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  // 🔹 Fetch news + sentiment summary
  const handleFetch = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, from: dateRange.from, to: dateRange.to }),
      });
      const data = await res.json();
      setSummary(data.summary || "No summary available.");
      setSentiment(data.sentiment || "⚠️ Neutral");
      setKeyPoints(data.keyPoints || []);
      setArticles(data.articles || []);
      setChartData(data.chartData || []);
    } catch (e) {
      setSummary("⚠️ Error fetching summary.");
    }
    setLoading(false);
  };

  // 🔹 Export as PDF (fixed)
  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        foreignObjectRendering: false,
        logging: false,
        backgroundColor: darkMode ? "#111827" : "#ffffff", // bg-gray-900 vs white
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`${ticker || "report"}-summary.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("⚠️ PDF export failed. Please try again.");
    }
  };

  const COLORS = ["#22c55e", "#ef4444", "#eab308"];

  return (
    <main
      className={`min-h-screen transition-colors ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Navbar */}
      <header
        className={`p-4 flex justify-between items-center shadow-md ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <h1 className="text-2xl font-bold">📊 Stock News Summarizer</h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-1 rounded-md border dark:border-gray-600"
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </header>

      {/* Content */}
      <section className="p-6 max-w-5xl mx-auto" ref={reportRef}>
        {/* Input Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Enter stock ticker (e.g. AAPL, MSFT)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className={`flex-1 p-2 rounded border focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            }`}
          />
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange({ ...dateRange, from: e.target.value })
            }
            className={`p-2 rounded border focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? "bg-gray-800 border-gray-600 text-gray-100"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className={`p-2 rounded border focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? "bg-gray-800 border-gray-600 text-gray-100"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
          <button
            onClick={handleFetch}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "⏳ Loading..." : "🔍 Fetch"}
          </button>
        </div>

        {/* Summary Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`p-6 rounded-lg shadow-md mb-6 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          {summary ? (
            <>
              <p className="mb-2">{summary}</p>
              {sentiment && (
                <p className="font-semibold">Sentiment: {sentiment}</p>
              )}
              {keyPoints.length > 0 && (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {keyPoints.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              )}
              <button
                onClick={handleExportPDF}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                📄 Export PDF
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Enter a stock ticker and date range, then click Fetch 🔎
            </p>
          )}
        </motion.div>

        {/* Chart + News */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chart */}
          {chartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`p-6 rounded-lg shadow-md ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3 className="text-lg font-semibold mb-4">Sentiment Overview</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* News */}
          {articles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className={`p-6 rounded-lg shadow-md ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3 className="text-lg font-semibold mb-4">Latest Articles</h3>
              <div className="space-y-3">
                {articles.map((article, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-3 rounded-md border ${
                      article.sentiment === "Positive"
                        ? "border-green-500"
                        : article.sentiment === "Negative"
                        ? "border-red-500"
                        : "border-yellow-500"
                    }`}
                  >
                    <p className="font-medium">{article.title}</p>
                    <p className="text-sm opacity-75">
                      {article.sentiment} —{" "}
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  );
}
