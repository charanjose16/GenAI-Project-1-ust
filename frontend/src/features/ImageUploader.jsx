import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaBrain } from "react-icons/fa";

const Navbar = () => {
  const username = localStorage.getItem("username") || "User";

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 backdrop-blur-sm z-50 shadow-lg">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <FaBrain className="h-8 w-8 text-blue-400 mr-2" />
          <span className="text-xl font-bold text-white">AI Made Easier</span>
        </div>
        <div className="text-gray-300 text-lg font-medium">
          Welcome,{" "}
          <span className="text-blue-400 font-semibold">{username}</span>
        </div>
      </div>
    </nav>
  );
};

const ImageUploader = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(""); // "scanning", "processing", "generating"
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [resultData, setResultData] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // To manage multiple stage timers
  const timerRef = useRef([]);

  const clearTimers = () => {
    timerRef.current.forEach((timer) => clearTimeout(timer));
    timerRef.current = [];
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image file.");
      return;
    }

    setLoading(true);
    setError("");
    setDescription("");
    setResultData(null);

    // Set the loading stage messages with 1-second intervals.
    setLoadingStage("scanning");
    timerRef.current.push(
      setTimeout(() => {
        setLoadingStage("processing");
      }, 1000)
    );
    timerRef.current.push(
      setTimeout(() => {
        setLoadingStage("generating");
      }, 2000)
    );

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://127.0.0.1:8000/describe",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Response Data:", response.data); // Log the full response
      setResultData(response.data); // Store the result data
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "An error occurred while processing the image."
      );
    } finally {
      clearTimers();
      setLoading(false);
      setLoadingStage(""); // Reset the loading stage after the process is complete
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
            className="fixed inset-0 bg-gray-900 text-white flex justify-center items-center p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg flex flex-col items-center overflow-y-auto max-h-[90vh]">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl focus:outline-none transition transform hover:scale-110"
              >
                ✖
              </button>

              <h1 className="text-3xl font-bold mb-6 text-center">
                Image Description Generator
              </h1>

              <form
                onSubmit={handleSubmit}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="w-full">
                  <label className="block text-sm font-medium mb-2">
                    Upload Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 border border-gray-700 rounded-lg bg-gray-700 text-white"
                  />
                </div>

                <AnimatePresence>
                  {preview && (
                    <motion.div
                      className="w-full flex flex-col items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-xl font-semibold mb-4">
                        Image Preview
                      </h2>
                      <img
                        src={preview}
                        alt="Uploaded Preview"
                        className="w-full max-h-80 object-contain rounded-lg shadow-lg"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 px-6 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Generate Description"}
                </button>
              </form>

              {/* Show error if any */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="p-4 bg-red-500/10 text-red-400 rounded-lg mt-4 w-full text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Error: {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show the description after processing */}
              <AnimatePresence>
                {resultData && (
                  <motion.div
                    className="mt-6 p-6 bg-gray-700 rounded-lg shadow-lg w-full text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div
                      className="results"
                      style={{
                        display: "flex",
                        gap: "2rem",
                        flexDirection: "row",
                        marginTop: "2rem",
                        width: "100%",
                      }}
                    >
                      <div
                        className="content-section"
                        style={{
                          flex: 1,
                          backgroundColor: "#2D3748",
                          padding: "2rem",
                          borderRadius: "10px",
                          boxShadow: "0 2px 15px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        <h2 className="text-white mb-4">Content Analysis</h2>
                        <div id="heroText" className="text-white mb-4">
                          <h3 className="text-lg font-semibold">Hero Text</h3>
                          <p>{resultData.hero_text || "N/A"}</p>
                        </div>
                        <div
                          id="websiteDescription"
                          className="text-white mb-4"
                        >
                          <h3 className="text-lg font-semibold">
                            Website Description
                          </h3>
                          <p>{resultData.website_description || "N/A"}</p>
                        </div>
                        <div id="callToAction" className="text-white mb-4">
                          <h3 className="text-lg font-semibold">
                            Call to Action
                          </h3>
                          <p>{resultData.call_to_action || "N/A"}</p>
                        </div>
                        <div id="websiteContent" className="text-white mb-4">
                          <h3 className="text-lg font-semibold">
                            Website Content
                          </h3>
                          <p>{resultData.website_content || "N/A"}</p>
                        </div>
                      </div>

                      <div
                        className="metadata-section"
                        style={{
                          backgroundColor: "#2D3748",
                          padding: "2rem",
                          borderRadius: "10px",
                          boxShadow: "0 2px 15px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        <h2 className="text-white mb-4">Design Metadata</h2>
                        <h3 className="text-white">Color Palette</h3>
                        <div
                          className="color-palette"
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            margin: "1rem 0",
                          }}
                        >
                          {resultData.color_palette &&
                            resultData.color_palette.map((color, index) => (
                              <div
                                key={index}
                                className="color-box"
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  borderRadius: "5px",
                                  border: "1px solid #ddd",
                                  backgroundColor: color,
                                }}
                              />
                            ))}
                        </div>

                        <h3 className="text-white">Font Palette</h3>
                        <div className="text-white">
                          {resultData.font_palette?.join(", ") || "N/A"}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Full-Screen Loading Overlay */}
            {loading && (
              <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50">
                <p className="mb-4 text-2xl font-semibold text-white">
                  {loadingStage === "scanning"
                    ? "AI is scanning the image..."
                    : loadingStage === "processing"
                    ? "AI is processing details..."
                    : loadingStage === "generating"
                    ? "AI is generating description..."
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

export default ImageUploader;
