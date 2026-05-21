#!/usr/bin/env node
import { Command } from "commander";
import { config } from "dotenv";
import { PajGpsClient } from "../api/client.js";
import { ALERT_TYPE_MAP, type AlertType } from "../api/types.js";

config();

const email    = process.env.PAJ_GPS_EMAIL;
const password = process.env.PAJ_GPS_PASSWORD;

if (!email || !password) {
  console.error("Error: PAJ_GPS_EMAIL and PAJ_GPS_PASSWORD environment variables are required.");
  console.error("  Set them in a .env file or export them before running.");
  process.exit(1);
}

const client = new PajGpsClient(email, password);

function printJSON(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function getAlertTypeName(typeId: number): string {
  for (const [name, mapping] of Object.entries(ALERT_TYPE_MAP)) {
    if (mapping.id === typeId) return name;
  }
  return `unknown_${typeId}`;
}

const program = new Command();

program
  .name("paj")
  .description("CLI for PAJ GPS tracker devices")
  .version("1.0.0");

program
  .command("list-devices")
  .description("List all GPS tracker devices on your account")
  .action(async () => {
    const response = await client.getDevices();
    const devices = response.success.map((d) => ({
      id: d.id, name: d.name, imei: d.imei,
      model: d.device_models?.[0]?.model ?? "unknown",
      alarms: {
        sos:          { available: d.device_models?.[0]?.alarm_sos === 1,              enabled: d.alarmsos === 1 },
        shock:        { available: d.device_models?.[0]?.alarm_erschuetterung === 1,  enabled: d.alarmbewegung === 1 },
        battery:      { available: d.device_models?.[0]?.alarm_batteriestand === 1,   enabled: d.alarmakkuwarnung === 1 },
        speed:        { available: d.device_models?.[0]?.alarm_geschwindigkeit === 1, enabled: d.alarmgeschwindigkeit === 1 },
        voltage:      { available: d.device_models?.[0]?.alarm_volt === 1,            enabled: d.alarm_volt === 1 },
        power_cutoff: { available: d.device_models?.[0]?.alarm_stromunterbrechung === 1, enabled: d.alarmstromunterbrechung === 1 },
        ignition:     { available: d.device_models?.[0]?.alarm_zuendalarm === 1,      enabled: d.alarmzuendalarm === 1 },
        drop:         { available: d.device_models?.[0]?.alarm_drop === 1,            enabled: d.alarm_fall_enabled === 1 },
      },
    }));
    printJSON(devices);
  });

program
  .command("car-devices")
  .description("List all vehicle-device associations")
  .action(async () => {
    const response = await client.getCarDevices();
    const cars = response.success.map((c) => ({
      id: c.id, car_name: c.car_name, license_plate: c.license_plate,
      model_name: c.model_name, device_id: c.iddevice,
      mileage: c.mileage, active: c.active === 1,
    }));
    printJSON(cars);
  });

program
  .command("positions")
  .description("Get last known GPS positions for devices")
  .option("-d, --devices <ids>", "Comma-separated device IDs (default: all)")
  .action(async (opts: { devices?: string }) => {
    let deviceIds: number[] = [];
    if (opts.devices) {
      deviceIds = opts.devices.split(",").map((s) => parseInt(s.trim(), 10));
    } else {
      const devResp = await client.getDevices();
      deviceIds = devResp.success.map((d) => d.id);
    }
    if (deviceIds.length === 0) { console.log("No devices found."); return; }
    const response = await client.getPositions(deviceIds);
    const positions = response.success.map((p) => ({
      device_id: p.iddevice,
      latitude: p.lat, longitude: p.lng,
      speed_kmh: p.speed, direction_degrees: p.direction,
      battery_percent: p.battery,
      google_maps_link: `https://www.google.com/maps?q=${p.lat},${p.lng}`,
    }));
    printJSON(positions);
  });

program
  .command("route-history")
  .description("Get route history for a device between two dates")
  .requiredOption("-d, --device <id>", "Device ID")
  .requiredOption("--from <datetime>", "Start datetime (ISO 8601, e.g. 2026-05-01T00:00:00)")
  .requiredOption("--to <datetime>",   "End datetime   (ISO 8601, e.g. 2026-05-02T23:59:59)")
  .action(async (opts: { device: string; from: string; to: string }) => {
    const response = await client.getRouteHistory(parseInt(opts.device, 10), opts.from, opts.to);
    printJSON(response);
  });

program
  .command("alerts")
  .description("Get alerts/notifications from PAJ GPS devices")
  .option("--all", "Include already-read alerts (default: unread only)")
  .action(async (opts: { all?: boolean }) => {
    const response = await client.getAlerts(!opts.all);
    const alerts = response.success.map((a) => ({
      id: a.id, device_id: a.iddevice,
      alert_type_id: a.meldungtyp,
      alert_type_name: getAlertTypeName(a.meldungtyp),
      created_at: a.created_at, message: a.message,
    }));
    printJSON(alerts);
  });

program
  .command("mark-alerts-read")
  .description("Mark all alerts of a specific type as read")
  .requiredOption("-t, --type <type>", `Alert type: ${Object.keys(ALERT_TYPE_MAP).join(", ")}`)
  .action(async (opts: { type: string }) => {
    const mapping = ALERT_TYPE_MAP[opts.type as AlertType];
    if (!mapping) {
      console.error(`Unknown alert type: ${opts.type}`);
      console.error(`Valid types: ${Object.keys(ALERT_TYPE_MAP).join(", ")}`);
      process.exit(1);
    }
    await client.markAlertsRead(mapping.id);
    console.log(`All "${opts.type}" alerts marked as read.`);
  });

program
  .command("set-alert")
  .description("Enable or disable a specific alert type on a device")
  .requiredOption("-d, --device <id>", "Device ID")
  .requiredOption("-t, --type <type>", `Alert type: ${Object.keys(ALERT_TYPE_MAP).join(", ")}`)
  .requiredOption("-e, --enabled <bool>", "true to enable, false to disable")
  .action(async (opts: { device: string; type: string; enabled: string }) => {
    const mapping = ALERT_TYPE_MAP[opts.type as AlertType];
    if (!mapping) { console.error(`Unknown alert type: ${opts.type}`); process.exit(1); }
    const enabled = opts.enabled.toLowerCase() !== "false" && opts.enabled !== "0";
    await client.setAlertState(parseInt(opts.device, 10), mapping.field, enabled);
    console.log(`Alert "${opts.type}" ${enabled ? "enabled" : "disabled"} on device ${opts.device}.`);
  });

program
  .command("sensor-data")
  .description("Get latest sensor readings (voltage) for a device")
  .requiredOption("-d, --device <id>", "Device ID")
  .action(async (opts: { device: string }) => {
    const response = await client.getSensorData(parseInt(opts.device, 10));
    printJSON(response);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
