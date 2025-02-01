import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Show loading spinner
  const showLoading = () => setLoading(true);

  // Hide loading spinner
  const hideLoading = () => setLoading(false);

  // Show error message
  const showError = (message) => {
    setError(message);
  };

  // Display results
  const displayResults = (results) => {
    setResults(results);
    setError('');
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus('');
    setError('');
  };

  // Handle upload file
  const uploadFile = async () => {
    if (!file) {
      showError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    showLoading();
    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const result = await response.json();
      setUploadStatus(result.message);
      setError('');
    } catch (error) {
      showError(error.message);
    } finally {
      hideLoading();
    }
  };

  // Retrieve documents
  const retrieveDocuments = async () => {
    if (!query) {
      showError('Please enter a question first');
      return;
    }

    showLoading();
    try {
      const response = await fetch('http://localhost:8000/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          top_k: 3,
          similarity_threshold: 0.3,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      displayResults(results);
    } catch (error) {
      showError(error.message);
    } finally {
      hideLoading();
    }
  };

  // Generate answer
  const generateAnswer = async () => {
    if (!query) {
      showError('Please enter a question first');
      return;
    }

    showLoading();
    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      displayResults([{ answer: result.answer }]);
    } catch (error) {
      showError(error.message);
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="container">
      <h1>Document QA System</h1>

      {/* File Upload Section */}
      <div className="upload-section">
        <h2>Upload Document</h2>
        <input
          type="file"
          id="fileInput"
          accept=".pdf,.txt"
          onChange={handleFileChange}
        />
        <button onClick={uploadFile}>Upload Document</button>
        <div id="uploadStatus" className="result">
          {uploadStatus && <p>{uploadStatus}</p>}
        </div>
      </div>

      {/* Query Section */}
      <div className="query-section">
        <h2>Ask Questions</h2>
        <textarea
          id="queryInput"
          placeholder="Enter your question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        ></textarea>
        <div className="button-group">
          <button onClick={retrieveDocuments}>Search Documents</button>
          <button onClick={generateAnswer}>Generate Answer</button>
        </div>
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}
        <div id="results" className={`result ${results.length > 0 ? 'visible' : ''}`}>
          {error && <div className="error">{error}</div>}
          {results.length > 0 &&
            results.map((result, index) => (
              <div key={index} className="result-item">
                {result.document && (
                  <div className="document">
                    <h3>Document:</h3>
                    <p>{result.document}</p>
                  </div>
                )}
                {result.answer && (
                  <div className="answer">
                    <h3>Answer:</h3>
                    <p>{result.answer}</p>
                  </div>
                )}
                {result.similarity && (
                  <div className="similarity">
                    <h3>Similarity Score:</h3>
                    <p>{result.similarity.toFixed(3)}</p>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;