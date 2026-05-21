# PAJ GPS CLI

CLI tool for [PAJ GPS](https://www.paj-gps.de/) tracker devices.  
Exposes all tools from [paj-gps-mcp](https://github.com/chestyy/paj-gps-mcp) as native shell commands.

## Commands

| Command | Description |
|---------|-------------|
| `paj list-devices` | List all GPS tracker devices with capabilities and alarm settings |
| `paj car-devices` | List vehicle-device associations (car, license plate, mileage) |
| `paj positions [-d <ids>]` | Get last known GPS positions (lat, lng, speed, battery) |
| `paj route-history -d <id> --from <datetime> --to <datetime>` | Get route history between two dates |
| `paj alerts [--all]` | Get alerts (SOS, battery, speed, shock, etc.) — unread by default |
| `paj mark-alerts-read -t <type>` | Mark alerts of a specific type as read |
| `paj set-alert -d <id> -t <type> -e <bool>` | Enable/disable an alert type on a device |
| `paj sensor-data -d <id>` | Get latest sensor readings (voltage) for a device |

## Setup

### 1. Install

```bash
npm install
npm run build
```

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env with your PAJ GPS email and password
```

Or export directly:

```bash
export PAJ_GPS_EMAIL="your-email@example.com"
export PAJ_GPS_PASSWORD="your-password"
```

### 3. Run

```bash
npm run dev list-devices      # Dev mode (tsx, no build needed)
npm run build && node dist/cli/index.js list-devices
npm install -g . && paj list-devices  # Install globally
```

## Examples

```bash
paj list-devices
paj positions
paj positions -d 12345,67890
paj route-history -d 12345 --from 2026-05-01T00:00:00 --to 2026-05-01T23:59:59
paj alerts
paj alerts --all
paj mark-alerts-read -t sos
paj set-alert -d 12345 -t speed -e true
paj sensor-data -d 12345
```

## Alert Types

`shock`, `battery`, `sos`, `speed`, `power_cutoff`, `ignition`, `drop`, `voltage`

## Development

```bash
npm run dev      # Run with tsx (no build)
npm run build    # Compile TypeScript
npm test         # Run tests
```

## API

Uses the official PAJ GPS API at `connect.paj-gps.de/api/v1`.  
Bearer token auto-refreshed every 55 minutes.

## License

MIT

---

Generated from [paj-gps-mcp](https://github.com/chestyy/paj-gps-mcp) using [CLI Printing Press](https://github.com/mvanhorn/cli-printing-press).
