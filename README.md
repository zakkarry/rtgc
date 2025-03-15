# RTGC - rTorrent Garbage Collector

A web-based utility for managing and cleaning up rTorrent torrents and data.

## Features

- Remove unregistered torrents
- Clean up orphaned data files
- Handle torrents with missing files
- Detect and manage hardlinked files

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Configure your environment (see Configuration section)

3. Start the server:
   ```
   npm start
   ```

## Configuration

The application requires the following configuration:

- rTorrent RPC URL (e.g., `http://username:password@localhost:5000/RPC2`)
- Data directories where torrent files are stored

## Development

To run the application in development mode with auto-restart:

```
npm run dev
```

## API

The application provides a web API for interacting with rTorrent and managing torrents:

- List all torrents
- Get torrent details
- Remove unregistered torrents
- Clean up orphaned data
- Find and manage hardlinked files

## License

MIT
