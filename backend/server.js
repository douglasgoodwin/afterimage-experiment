// backend/server.js

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(bodyParser.json());

// Serve the frontend as static files
// ../frontend relative to backend/
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Path to results file: ../data/results.json
const dataDir = path.join(__dirname, '..', 'data');
const resultsFile = path.join(dataDir, 'results.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure results.json exists and is valid JSON array
function ensureResultsFile() {
  if (!fs.existsSync(resultsFile)) {
    fs.writeFileSync(resultsFile, '[]', 'utf8');
    return;
  }

  // If exists but is empty or invalid, reset to []
  try {
    const text = fs.readFileSync(resultsFile, 'utf8').trim();
    if (text.length === 0) {
      fs.writeFileSync(resultsFile, '[]', 'utf8');
      return;
    }
    JSON.parse(text);
  } catch (err) {
    console.error('results.json invalid, resetting to []:', err.message);
    fs.writeFileSync(resultsFile, '[]', 'utf8');
  }
}

ensureResultsFile();

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Save a single experiment result
app.post('/api/results', (req, res) => {
  // Whatever your frontend sends as the trial result
  const result = req.body;

  if (!result) {
    return res.status(400).json({ error: 'Missing result body' });
  }

  // Attach server-side timestamp
  const entry = {
    ...result,
    serverTimestamp: new Date().toISOString()
  };

  fs.readFile(resultsFile, 'utf8', (readErr, data) => {
    if (readErr) {
      console.error('Error reading results file:', readErr);
      return res.status(500).json({ error: 'Failed to read results file' });
    }

    let results = [];
    try {
      results = JSON.parse(data);
      if (!Array.isArray(results)) {
        results = [];
      }
    } catch (parseErr) {
      console.error('Error parsing results file, resetting:', parseErr);
      results = [];
    }

    results.push(entry);

    fs.writeFile(resultsFile, JSON.stringify(results, null, 2), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing results file:', writeErr);
        return res.status(500).json({ error: 'Failed to write results file' });
      }

      return res.status(201).json({ status: 'ok' });
    });
  });
});

// Fallback: serve index.html for root
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Afterimage experiment backend running at http://localhost:${PORT}`);
});