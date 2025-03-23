# RTGC - rTorrent Garbage Collector

A web-based utility for managing and cleaning up rTorrent torrents and data.

## Features

- Remove unregistered torrents
- Clean up orphaned data files
- Handle torrents with missing files
- Detect and manage hardlinked files

## Run locally

1. Install dependencies:

   ```
   pnpm i
   ```

2. Configure your environment (see Configuration section)

3. Start the server:
   ```
   caddy run --config Caddyfile & pnpm dev & node --watch --experimental-transform-types server/server.ts
   ```

## Production

Use docker.

## Configuration

The application requires the following configuration:

- rTorrent RPC URL (e.g., `http://username:password@localhost:5000/RPC2`)
- Data directories where torrent files are stored
