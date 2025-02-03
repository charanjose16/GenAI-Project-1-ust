import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaFilePdf, FaPaperPlane, FaBrain } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ChatWithPDF = () => {
  const [messages, setMessages] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Navbar component
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

  useEffect(() => {
    if (!token) {
      alert("User not authenticated. Please log in.");
    }
  }, [token]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setLoading(true);

      const response = await axios.post("http://localhost:8000/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDescription(response.data.description);
    } catch (err) {
      setError("Error uploading file. Please try again.");
      console.error("Error uploading file:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/generate", { query: userQuery }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setMessages((prev) => [
        ...prev,
        { sender: "user", text: userQuery },
        { sender: "bot", text: response.data.answer },
      ]);
      setUserQuery("");
    } catch (err) {
      setError("Error generating answer. Please try again.");
      console.error("Error generating answer:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      navigate("/dashboard");
    }, 300);
  };

  return (
    <div>
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

              <h1 className="text-3xl font-bold mb-6 text-center">Chat with Document</h1>

              {/* File Upload Section */}
              <div className="w-full max-w-md mb-8 p-4 bg-gray-700 shadow-lg rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                  <FaFilePdf className="text-blue-600" />
                  Upload a PDF
                </h2>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={loading || !token}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {loading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
              </div>

              {/* Image Preview Section */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    className="w-full flex flex-col items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-xl font-semibold mb-4">PDF Preview</h2>
                    <img
                      src={preview}
                      alt="Uploaded Preview"
                      className="w-full max-h-80 object-contain rounded-lg shadow-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Interface */}
              <div className="w-full max-w-md bg-gray-600 shadow-lg rounded-lg p-6 mb-4">
                <h2 className="text-2xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                  <FaPaperPlane className="text-blue-600" />
                  Ask a Question
                </h2>
                <div className="chat-box h-64 overflow-y-auto border border-gray-500 rounded-lg p-4 mb-4 bg-gray-500">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      className={`mb-2 p-3 rounded-lg max-w-[80%] ${
                        msg.sender === "user"
                          ? "bg-blue-500 text-white self-end"
                          : "bg-gray-400 text-gray-800 self-start"
                      }`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {msg.text}
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={loading || !token}
                    className="flex-grow p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !token}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="p-4 bg-red-500/10 text-red-400 rounded-lg mt-4 w-full text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Error: {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generated Description */}
              <AnimatePresence>
                {description && (
                  <motion.div
                    className="mt-6 p-6 bg-gray-700 rounded-lg shadow-lg w-full text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h2 className="text-xl font-semibold mb-2">Generated Description</h2>
                    <p className="text-gray-300 text-lg">{description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWithPDF;
