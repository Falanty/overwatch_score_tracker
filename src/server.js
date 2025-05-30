const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_PREFIX = 'ow2_s';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

const dataDir = path.join(__dirname, 'data');
const logDir = path.join(__dirname, 'log');

// Ensure log directory exists
async function ensureLogDirectory() {
    try {
        await fs.access(logDir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(logDir, { recursive: true });
            console.log('Log directory created');
        }
    }
}

// Logging function
async function logMatchResult(mapCategory, mapName, result, season = 'current') {
    try {
        await ensureLogDirectory();

        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

        // Create log filename with current date
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        const logFileName = `matches_${dateStr}.log`;
        const logFilePath = path.join(logDir, logFileName);

        // Format as standard log entry: [TIMESTAMP] LEVEL: MESSAGE
        const logLine = `[${timestamp}] INFO: Match result - Season: ${season}, Category: ${mapCategory}, Map: ${mapName}, Result: ${result.toUpperCase()}\n`;
        await fs.appendFile(logFilePath, logLine, 'utf8');

        console.log(`Match logged: ${mapCategory}/${mapName} - ${result}`);
    } catch (error) {
        console.error('Failed to log match result:', error);
    }
}

// Helper function to detect stat changes between old and new data
function detectStatChanges(oldData, newData) {
    const changes = [];

    function compareNodes(oldNode, newNode, path = []) {
        if (!oldNode || !newNode) return;

        // If this is a stat node (won, lost, draw)
        if (['won', 'lost', 'draw'].includes(oldNode.name) &&
            oldNode.size !== undefined && newNode.size !== undefined) {

            if (newNode.size > oldNode.size) {
                // Path structure: ["All Maps", "Push", "Colosseo", "won"]
                // We want category = "Push", mapName = "Colosseo"
                const category = path.length >= 2 ? path[1] : 'Unknown';
                const mapName = path.length >= 3 ? path[2] : 'Unknown';

                changes.push({
                    category,
                    mapName,
                    result: oldNode.name,
                    oldValue: oldNode.size,
                    newValue: newNode.size,
                    increase: newNode.size - oldNode.size
                });
            }
            return;
        }

        // Recursively check children
        if (oldNode.children && newNode.children) {
            for (let i = 0; i < Math.min(oldNode.children.length, newNode.children.length); i++) {
                const newPath = [...path, oldNode.name];
                compareNodes(oldNode.children[i], newNode.children[i], newPath);
            }
        }
    }

    compareNodes(oldData, newData);
    return changes;
}

// Route to retrieve all existing seasons
app.get('/api/seasons', async (req, res) => {
    try {
        const files = await fs.readdir(dataDir);
        const seasons = files
            .filter(file => file.startsWith(DATA_PREFIX) && file.endsWith('.json'))
            .map(file => ({
                id: file.replace('.json', ''),
                name: `Season ${file.replace(DATA_PREFIX, '').replace('.json', '')}`
            }))
            .sort();
        res.json(seasons);
    } catch (error) {
        res.status(500).json({error: 'Failed to get seasons'});
    }
});

// Route to create a new season data file
app.post('/api/seasons', async (req, res) => {
    try {
        const {seasonNumber} = req.body;
        const templateData = await fs.readFile(path.join(dataDir, 'data.json'), 'utf8');
        const newSeasonFile = `${DATA_PREFIX}${seasonNumber}.json`;
        await fs.writeFile(path.join(dataDir, newSeasonFile), templateData);
        res.json({success: true, message: 'Season created successfully'});
    } catch (error) {
        res.status(500).json({error: 'Failed to create season'});
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
        res.status(500).json({error: 'Failed to read data file'});
    }
});

// Route to save updated season data (with logging)
app.post('/api/data/:season?', async (req, res) => {
    try {
        const season = req.params.season || 'data';
        const filePath = path.join(dataDir, `${season}.json`);

        // Read existing data to compare changes
        let oldData = null;
        try {
            const existingData = await fs.readFile(filePath, 'utf8');
            oldData = JSON.parse(existingData);
        } catch (error) {
            // File doesn't exist yet, that's okay
        }

        const newData = req.body;
        const jsonData = JSON.stringify(newData, null, 2);

        // Save the updated data
        await fs.writeFile(filePath, jsonData, 'utf8');

        // Log any stat changes
        if (oldData) {
            const changes = detectStatChanges(oldData, newData);
            for (const change of changes) {
                // Log each increase as separate match results
                for (let i = 0; i < change.increase; i++) {
                    await logMatchResult(change.category, change.mapName, change.result, season);
                }
            }
        }

        console.log('Data saved successfully');
        res.json({success: true, message: 'Data saved successfully'});
    } catch (error) {
        console.error('Error saving JSON file:', error);
        res.status(500).json({error: 'Failed to save data file'});
    }
});

// Route to get log entries (optional - for viewing logs via API)
app.get('/api/logs/:date?', async (req, res) => {
    try {
        const date = req.params.date || new Date().toISOString().split('T')[0];
        const logFileName = `matches_${date}.log`;
        const logFilePath = path.join(logDir, logFileName);

        try {
            const logData = await fs.readFile(logFilePath, 'utf8');
            const logEntries = logData.trim().split('\n')
                .filter(line => line.trim())
                .map(line => {
                    // Parse standard log format: [TIMESTAMP] LEVEL: MESSAGE
                    const match = line.match(/^\[([^\]]+)\] (\w+): Match result - Season: ([^,]+), Category: ([^,]+), Map: ([^,]+), Result: (\w+)$/);
                    if (match) {
                        return {
                            timestamp: match[1],
                            level: match[2],
                            season: match[3],
                            mapCategory: match[4],
                            mapName: match[5],
                            result: match[6].toLowerCase(),
                            rawLine: line
                        };
                    }
                    return { rawLine: line }; // Return unparsed lines as fallback
                });

            res.json(logEntries);
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.json([]); // No log file for this date
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({error: 'Failed to read log file'});
    }
});

// Route to get available log dates
app.get('/api/logs', async (req, res) => {
    try {
        await ensureLogDirectory();
        const files = await fs.readdir(logDir);
        const logDates = files
            .filter(file => file.startsWith('matches_') && file.endsWith('.log'))
            .map(file => file.replace('matches_', '').replace('.log', ''))
            .sort()
            .reverse(); // Most recent first

        res.json(logDates);
    } catch (error) {
        res.status(500).json({error: 'Failed to read log directory'});
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Make sure you have data.json in the same directory as this server file');
    console.log(`Logs will be saved to: ${logDir}`);
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