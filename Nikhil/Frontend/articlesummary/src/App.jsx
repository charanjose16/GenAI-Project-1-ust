import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [topic, setTopic] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:8000/summarize-topic", {
        topic: topic,
      });

      setSummaries(response.data.articles);
    } catch (err) {
      setError("Failed to fetch summaries. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Article Summarizer</h1>
        <p>Enter a topic below to get summarized articles.</p>
      </header>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter a topic (e.g., climate change)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button onClick={handleSummarize} disabled={loading}>
          {loading ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="summaries">
        {summaries.map((summary, index) => (
          <div key={index} className="summary">
            <p>{summary.summary}</p>
            <p className="reference-link">
              <strong>Source:</strong>{" "}
              <a href={summary.reference_link} target="_blank" rel="noopener noreferrer">
                {summary.reference_link}
              </a>
            </p>
          </div>
        ))}
      </div>

      <footer>
        <p>Get your articles here!</p>
      </footer>
    </div>
  );
}

export default App;