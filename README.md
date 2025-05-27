# Overwatch Map Statistics Tracker

A web application for manual tracking of Overwatch map statistics with an Express backend and interactive visualization.

## Features

- Map statistics visualization
- Express.js backend for json file data management
- Interactive user interface
- Category-based map filtering
- Win/Loss/Draw tracking

## Installation

```bash
# Clone repository
git clone [repository-url]

# Install dependencies
npm install

# Start server
npm run start
```

## Development

For development with auto-reload:

```bash
npm run dev
```

Server runs by default on `http://localhost:3000`

## Technologies

- Express.js
- Node.js
- D3.js

## API Endpoints

- GET `/api/data` - Retrieve current statistics
- POST `/api/data` - Update statistics
- GET `/` - Main application interface
