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
// Neue Route im server.js
const dataDir = path.join(__dirname, 'data');

// Route to retrieve all existing seasons
app.get('/api/seasons', async (req, res) => {
  try {
    const files = await fs.readdir(dataDir);
    const seasons = files
        .filter(file => file.startsWith('ow2_s') && file.endsWith('.json'))
        .map(file => ({
          id: file.replace('.json', ''),
          name: `Season ${file.replace('ow2_s', '').replace('.json', '')}`
        }));
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get seasons' });
  }
});

// Route to create a new season data file
app.post('/api/seasons', async (req, res) => {
  try {
    const { seasonNumber } = req.body;
    const templateData = await fs.readFile(path.join(dataDir, 'data.json'), 'utf8');
    const newSeasonFile = `ow2_s${seasonNumber}.json`;
    await fs.writeFile(path.join(dataDir, newSeasonFile), templateData);
    res.json({ success: true, message: 'Season created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create season' });
  }
});

// Route to load season data
app.get('/api/data/:season?', async (req, res) => {
  try {
    const season = req.params.season || 'data';
    const filePath = path.join(dataDir, `${season}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data file' });
  }
});

// Route to save updated season data
app.post('/api/data/:season?', async (req, res) => {
  try {
    const jsonData = JSON.stringify(req.body, null, 2);
    const season = req.params.season || 'data';
    const filePath = path.join(dataDir, `${season}.json`);
    await fs.writeFile(filePath, jsonData, 'utf8');
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