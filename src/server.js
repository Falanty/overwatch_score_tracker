const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JSON_FILE_PATH = path.join(__dirname, 'data/data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Route to get the current JSON data
app.get('/api/data', async (req, res) => {
  try {
    const data = await fs.readFile(JSON_FILE_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading JSON file:', error);
    res.status(500).json({ error: 'Failed to read data file' });
  }
});

// Route to save updated JSON data
app.post('/api/data', async (req, res) => {
  try {
    const jsonData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(JSON_FILE_PATH, jsonData, 'utf8');
    console.log('Data saved successfully');
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving JSON file:', error);
    res.status(500).json({ error: 'Failed to save data file' });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Make sure you have data.json in the same directory as this server file');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});