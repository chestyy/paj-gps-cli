import type {
  LoginResponse,
  DeviceListResponse,
  PositionsResponse,
  AlertsResponse,
  CarDevicesResponse,
} from "./types.js";

const BASE_URL = "https://connect.paj-gps.de/api/v1";
const TOKEN_TTL_MS = 55 * 60 * 1000;

export class PajGpsClient {
  private token: string | null = null;
  private tokenObtainedAt: number = 0;
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    if (!email || !password) {
      throw new Error("PAJ GPS credentials required: email and password");
    }
    this.email = email;
    this.password = password;
  }

  private isTokenExpired(): boolean {
    if (!this.token) return true;
    return Date.now() - this.tokenObtainedAt > TOKEN_TTL_MS;
  }

  private getHeaders(): Record<string, string> {
    if (!this.token) throw new Error("Not authenticated");
    return {
      accept: "application/json",
      Authorization: `Bearer ${this.token}`,
      "X-CSRF-TOKEN": "",
    };
  }

  async authenticate(): Promise<void> {
    if (this.token && !this.isTokenExpired()) return;
    const url = `${BASE_URL}/login?email=${encodeURIComponent(this.email)}&password=${encodeURIComponent(this.password)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { accept: "application/json", "X-CSRF-TOKEN": "" },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Login failed (${response.status}): ${text}`);
    }
    const data = (await response.json()) as LoginResponse;
    if (!data.success?.token) throw new Error("Login response missing token");
    this.token = data.success.token;
    this.tokenObtainedAt = Date.now();
  }

  async ensureAuth(): Promise<void> {
    if (this.isTokenExpired()) {
      this.token = null;
      await this.authenticate();
    }
  }

  private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    await this.ensureAuth();
    let url = `${BASE_URL}${path}`;
    if (params) url += `?${new URLSearchParams(params).toString()}`;
    const options: RequestInit = {
      method,
      headers: { ...this.getHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
    };
    if (body) options.body = JSON.stringify(body);
    let response = await fetch(url, options);
    if (response.status === 401) {
      this.token = null;
      await this.authenticate();
      options.headers = { ...this.getHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) };
      response = await fetch(url, options);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }

  async getDevices(): Promise<DeviceListResponse> {
    return this.request<DeviceListResponse>("GET", "/device");
  }
  async getPositions(deviceIds: number[]): Promise<PositionsResponse> {
    return this.request<PositionsResponse>("POST", "/trackerdata/getalllastpositions", { deviceIDs: deviceIds, fromLastPoint: false });
  }
  async getAlerts(unreadOnly: boolean = true): Promise<AlertsResponse> {
    const params = unreadOnly ? { isRead: "0" } : undefined;
    return this.request<AlertsResponse>("GET", "/notifications", undefined, params);
  }
  async markAlertsRead(alertType: number): Promise<void> {
    await this.request<unknown>("PUT", "/notifications/markReadByCustomer", undefined, { alertType: String(alertType), isRead: "1" });
  }
  async setAlertState(deviceId: number, alertField: string, enabled: boolean): Promise<void> {
    await this.request<unknown>("PUT", `/device/${deviceId}`, undefined, { [alertField]: enabled ? "1" : "0" });
  }
  async getCarDevices(): Promise<CarDevicesResponse> {
    return this.request<CarDevicesResponse>("GET", "/sdevice/car");
  }
  async getRouteHistory(deviceId: number, from: string, to: string): Promise<unknown> {
    return this.request<unknown>("GET", `/trackerdata/${deviceId}/lastpoints`, undefined, { lastPoints: "0", dateFrom: from, dateTo: to });
  }
  async getSensorData(deviceId: number): Promise<{ voltage_v: number; raw: unknown }> {
    const response = await this.request<{ success: { volt?: number } }>("GET", `/sensordata/last/${deviceId}`);
    return { voltage_v: (response.success?.volt ?? 0) / 1000, raw: response.success };
  }
}
