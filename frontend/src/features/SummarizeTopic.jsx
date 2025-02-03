import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaBrain } from "react-icons/fa";

const Navbar = () => {
  const username = localStorage.getItem("username") || "User";

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900/80 backdrop-blur-sm z-50 shadow-lg">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <FaBrain className="h-8 w-8 text-blue-400 mr-2" />
          <span className="text-xl font-bold text-white">AI Made Easier</span>
        </div>
        <div className="text-gray-300 text-lg font-medium">
          Welcome, <span className="text-blue-400 font-semibold">{username}</span>
        </div>
      </div>
    </nav>
  );
};

const SummarizeTopic = () => {
  const [topic, setTopic] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(""); // "searching", "scraping", "summarising"
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const timerRef = useRef([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      alert("User not authenticated. Please log in.");
      navigate("/login");
    }
  }, [navigate]);

  const clearTimers = () => {
    timerRef.current.forEach((timer) => clearTimeout(timer));
    timerRef.current = [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim() || !token) return;

    setLoading(true);
    setError("");
    setSummaries([]);
    setLoadingStage("searching");

    // Set stage timers:
    timerRef.current.push(
      setTimeout(() => {
        setLoadingStage("scraping");
      }, 2000)
    );
    timerRef.current.push(
      setTimeout(() => {
        setLoadingStage("summarising");
      }, 4000)
    );

    try {
      const response = await fetch("http://localhost:8000/summarize-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summaries");
      }

      const result = await response.json();
      setSummaries(result.articles);
    } catch (err) {
      setError("Error fetching article summaries. Please try again.");
    } finally {
      clearTimers();
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      navigate("/dashboard");
    }, 300);
  };

  return (
    <>
      <Navbar />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed inset-0 bg-gray-900 text-white flex justify-center items-center p-6 pt-20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-full max-w-5xl bg-gray-800 p-8 rounded-lg shadow-xl flex flex-col items-center overflow-y-auto max-h-[85vh] space-y-6">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl focus:outline-none transition transform hover:scale-110"
              >
                ✖
              </button>

              <h1 className="text-3xl font-bold text-center text-gray-100">
                Summarize a Topic
              </h1>

              {/* Topic Input */}
              <div className="w-full max-w-lg bg-gray-700 p-6 shadow-md rounded-lg">
                <h2 className="text-xl font-semibold text-gray-200 mb-3">
                  Enter a Topic
                </h2>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a topic..."
                  disabled={loading || !token}
                  className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
              </div>

              {/* Summaries */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                {summaries.length > 0 ? (
                  summaries.map((summary, index) => (
                    <motion.div
                      key={index}
                      className="p-6 bg-gray-700 rounded-lg shadow-lg transition transform hover:scale-105 hover:shadow-xl"
                      whileHover={{ scale: 1.05 }}
                    >
                      <h3 className="text-xl font-semibold text-gray-100 mb-2">
                        {summary.title}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {summary.summary.length > 200
                          ? summary.summary.slice(0, 200) + "..."
                          : summary.summary}
                      </p>
                      <a
                        href={summary.reference_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 mt-3 inline-block text-sm font-medium"
                      >
                        Read Full Article
                      </a>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-400 col-span-full text-center">
                    No summaries available.
                  </p>
                )}
              </div>

              {/* Summarize Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || !token}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? "Processing..." : "Summarize"}
              </button>
            </div>

            {/* Full-Screen Loading Overlay */}
            {loading && (
              <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50">
                <p className="mb-4 text-2xl font-semibold text-white">
                  {loadingStage === "searching"
                    ? "AI is searching..."
                    : loadingStage === "scraping"
                    ? "AI is scraping info from related websites..."
                    : loadingStage === "summarising"
                    ? "AI is summarising and generating..."
                    : "Loading..."}
                </p>
                <motion.div
                  className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SummarizeTopic;
