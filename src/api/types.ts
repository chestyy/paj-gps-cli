export interface LoginResponse {
  success: {
    token: string;
    refresh_token: string;
    userID: number;
    routeIcon: string;
  };
}

export interface PajDevice {
  id: number;
  name: string;
  imei: string;
  device_models: DeviceModel[];
  alarmsos: number;
  alarmbewegung: number;
  alarm_volt: number;
  alarmakkuwarnung: number;
  alarmgeschwindigkeit: number;
  alarmstromunterbrechung: number;
  alarmzuendalarm: number;
  alarm_fall_enabled: number;
}

export interface DeviceModel {
  model: string;
  standalone_battery: number;
  alarm_sos: number;
  alarm_erschuetterung: number;
  alarm_volt: number;
  alarm_batteriestand: number;
  alarm_geschwindigkeit: number;
  alarm_stromunterbrechung: number;
  alarm_zuendalarm: number;
  alarm_drop: number;
}

export interface DeviceListResponse { success: PajDevice[]; }
export interface PositionEntry { iddevice: number; lat: number; lng: number; direction: number; speed: number; battery: number; timestamp?: string; }
export interface PositionsResponse { success: PositionEntry[]; }
export interface AlertEntry { id: number; iddevice: number; meldungtyp: number; created_at: string; message?: string; }
export interface AlertsResponse { success: AlertEntry[]; }
export interface CarDevice { id: number; car_id: number; car_name: string; model_id: number; model_name: string; license_plate: string; iddevice: number; mileage: number; active: number; }
export interface CarDevicesResponse { success: CarDevice[]; number_of_records: number; }

export type AlertType = "shock" | "battery" | "sos" | "speed" | "power_cutoff" | "ignition" | "drop" | "voltage";

export const ALERT_TYPE_MAP: Record<AlertType, { id: number; field: string }> = {
  shock:        { id: 1,  field: "alarmbewegung" },
  battery:      { id: 2,  field: "alarmakkuwarnung" },
  sos:          { id: 4,  field: "alarmsos" },
  speed:        { id: 5,  field: "alarmgeschwindigkeit" },
  power_cutoff: { id: 6,  field: "alarmstromunterbrechung" },
  ignition:     { id: 7,  field: "alarmzuendalarm" },
  drop:         { id: 9,  field: "alarm_fall_enabled" },
  voltage:      { id: 13, field: "alarm_volt" },
};
