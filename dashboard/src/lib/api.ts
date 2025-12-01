const API_BASE = '/api/admin';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('adminToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('adminToken', token);
    } else {
      localStorage.removeItem('adminToken');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    baseUrl: string = API_BASE
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        window.location.href = '/admin/login';
      }
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; admin: any }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request<{ admin: any }>('/me');
  }

  // Stats
  async getOverviewStats() {
    return this.request<{ stats: any }>('/stats/overview');
  }

  async getRideStats(days = 7) {
    return this.request<{ stats: any[] }>(`/stats/rides?days=${days}`);
  }

  // Rides
  async getRides(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return this.request<{ rides: any[]; pagination: any }>(`/rides?${query}`);
  }

  async getRide(id: string) {
    return this.request<{ ride: any; history: any[] }>(`/rides/${id}`);
  }

  async assignRide(rideId: string, driverDid: string) {
    return this.request(`/rides/${rideId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ driverDid }),
    });
  }

  async cancelRide(rideId: string, reason?: string) {
    return this.request(`/rides/${rideId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Drivers
  async getDrivers(params: { page?: number; limit?: number; online?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.online !== undefined) query.set('online', String(params.online));
    return this.request<{ drivers: any[]; pagination: any }>(`/drivers?${query}`);
  }

  async getDriverLocations() {
    return this.request<{ drivers: any[] }>('/drivers/locations');
  }

  // Users
  async getUsers(params: { page?: number; limit?: number; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    return this.request<{ users: any[]; pagination: any }>(`/users?${query}`);
  }

  // Debug
  async getHealth() {
    return this.request<{ health: any }>('/debug/health');
  }

  async getNotificationDebug() {
    return this.request<{ devices: any[] }>('/debug/notifications');
  }

  async getWebSocketDebug() {
    return this.request<{ websocket: any }>('/debug/websocket');
  }

  // Driver Approval
  async approveDriver(did: string, driverRole: 'taxi' | 'delivery') {
    return this.request<{ user: any; profile: any }>('/drivers/approve', {
      method: 'POST',
      body: JSON.stringify({ did, driverRole }),
    });
  }

  async revokeDriver(did: string) {
    return this.request<{ user: any }>('/drivers/revoke', {
      method: 'POST',
      body: JSON.stringify({ did }),
    });
  }

  // Pricing
  async getPricingConfigs() {
    return this.request<{ configs: any[] }>('/', {}, '/api/pricing');
  }

  async getPricingConfig(citySlug: string) {
    return this.request<{ config: any }>(`/${citySlug}`, {}, '/api/pricing');
  }

  async updatePricingConfig(citySlug: string, config: any) {
    return this.request<{ config: any }>(`/${citySlug}`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    }, '/api/pricing');
  }
}

export const api = new ApiClient();
