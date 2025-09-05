# Local File Search

Local file search application that provides both semantic and lexical search capabilities for your file system using Elasticsearch.

## Features

### File Support
- **Documents**: PDF, DOC, DOCX, TXT, MD
- **Source Code**: JS, TS, PY, JAVA, CPP, C, H
- **Data**: JSON
- **Content Extraction**: Full-text search within file contents

### API Endpoints
- `GET /api/search` - Search files
- `GET /api/files/:id` - Get file details
- `DELETE /api/files/:id` - Remove file from index
- `POST /api/index` - Index a directory
- `POST /api/index/reset` - Reset the entire index
- `POST /api/watch/start` - Start watching directory for changes
- `POST /api/watch/stop` - Stop watching directories

## Quick Start

### 1. Start Elasticsearch
https://github.com/elastic/start-local
```bash
curl -fsSL https://elastic.co/start-local | sh
```

This will:
- Download and start Elasticsearch on `http://localhost:9200`  
- Download and start Kibana on `http://localhost:5601`
- Provide you with credentials (username, password, API key)

If you already have Elasticsearch running, just update your `.env` file with the connection details.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env` file with Elasticsearch credentials from start-local output:
```bash
cp env.example .env
# Edit .env with your actual credentials
```

### 4. Check Setup

```bash
npm run check-setup
```

### 5. Build and Run

```bash
npm run dev
```

### 6. Access the Application

- **UI**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## Usage Guide

### Getting Started

1. **Index Your Files**
   - Open the web interface at http://localhost:3000
   - Enter a directory path (e.g., `/Users/yourusername/Documents`)
   - Click "Index Directory" to scan and index all supported files

2. **Start Real-time Watching** (Optional)
   - Use the same directory path
   - Click "Start Watching" to automatically index new/modified files

3. **Search Your Files**
   - Enter search queries like:
     - "medical documents" (finds health-related files)
     - "python scripts" (finds .py files and code references)
     - "meeting notes from last week" (semantic search)
     - "invoice.pdf" (exact filename search)

### Search Types

**Hybrid Search** (Recommended)
- Combines semantic and lexical approaches
- Best overall results for most queries

**Semantic Search**
- Finds files by meaning and context
- Great for conceptual searches like "financial reports", "vacation photos"

**Lexical Search**
- Traditional keyword matching
- Best for exact terms and filenames

### Advanced Filtering

- **File Extensions**: Filter by type (e.g., `.pdf,.doc,.txt`)
- **Date Range**: Find files modified within specific timeframes
- **Result Limits**: Control number of results (10, 20, 50)

## API Examples

### Search Files
```bash
# Basic search
curl "http://localhost:3000/api/search?q=medical+documents&type=hybrid"

# Advanced search with filters
curl "http://localhost:3000/api/search?q=python&type=semantic&extensions=.py,.js&limit=10"
```

### Index Management
```bash
# Index a directory
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"path": "/Users/username/Documents"}'

# Reset index
curl -X POST http://localhost:3000/api/index/reset
```

### Directory Watching
```bash
# Start watching
curl -X POST http://localhost:3000/api/watch/start \
  -H "Content-Type: application/json" \
  -d '{"path": "/Users/username/Documents"}'

# Stop watching
curl -X POST http://localhost:3000/api/watch/stop
```

## Configuration

### Environment Variables
- `ELASTICSEARCH_NODE`: Elasticsearch URL (default: `http://localhost:9200`)
- `PORT`: Server port (default: `3000`)
- `NODE_ENV`: Environment mode (`development` or `production`)

### Supported File Types
The application currently indexes these file types:
- Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.md`
- Source Code: `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.c`, `.h`
- Data: `.json`

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Troubleshooting

**Connection Issues:**
```bash
# 1. Check Elasticsearch is running
curl http://localhost:9200

# 2. Verify setup
npm run check-setup

# 3. Restart Elasticsearch  
curl -fsSL https://elastic.co/start-local | sh
```

**Common fixes:**
- Use `http://localhost:9200` (not https) in `.env`
- Copy exact credentials from start-local output
- Change PORT in `.env` if 3000 is in use