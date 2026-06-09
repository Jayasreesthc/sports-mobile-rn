class ApiClient {
  static baseUrl = 'http://187.77.189.31:7000/api/v1';
  
  constructor() {
    this.token = null;
  }

  setToken(newToken) {
    this.token = newToken;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          detail: errorData.detail || `HTTP error! status: ${response.status}`,
          status: response.status
        };
      }
      return await response.json();
    } catch (e) {
      console.error('API request failed:', e);
      return { detail: 'Could not connect to the backend server.' };
    }
  }

  // Auth Operations
  async login(email, password) {
    // Note: uses application/x-www-form-urlencoded format
    const searchParams = new URLSearchParams();
    searchParams.append('username', email);
    searchParams.append('password', password);

    return this.request(`${ApiClient.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: searchParams.toString(),
    });
  }

  async register(userData) {
    return this.request(`${ApiClient.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request(`${ApiClient.baseUrl}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async getUsersList(role) {
    return this.request(`${ApiClient.baseUrl}/auth/users?role=${role}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  // Seeding Helper
  async runDatabaseQuickSeed() {
    return this.request(`${ApiClient.baseUrl}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Super Admin
  async createDepartment(name) {
    return this.request(`${ApiClient.baseUrl}/superadmin/departments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    });
  }

  // Department Admin
  async createFederation(deptId, name, adminId) {
    return this.request(`${ApiClient.baseUrl}/departments/${deptId}/federations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name,
        admin_id: adminId,
      }),
    });
  }

  async getPendingUsers() {
    return this.request(`${ApiClient.baseUrl}/department/pending-registrations`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async approveUser(userId) {
    return this.request(`${ApiClient.baseUrl}/department/approve-registration/${userId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  async getPendingTournaments() {
    return this.request(`${ApiClient.baseUrl}/department/pending-tournaments`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async approveTournament(tourneyId) {
    return this.request(`${ApiClient.baseUrl}/department/approve-tournament/${tourneyId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  // Federation Admin
  async createTournament(tourneyData) {
    return this.request(`${ApiClient.baseUrl}/tournaments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(tourneyData),
    });
  }

  async scheduleMatch(tourneyId, teamA, teamB, scorerId) {
    return this.request(`${ApiClient.baseUrl}/tournaments/${tourneyId}/matches`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        team_a_id: teamA,
        team_b_id: teamB,
        scorer_id: scorerId,
      }),
    });
  }

  // Player Signup
  async registerTeam(tourneyId, name, coachId, playerIds) {
    return this.request(`${ApiClient.baseUrl}/tournaments/${tourneyId}/register-team`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name,
        coach_id: coachId,
        player_ids: playerIds,
      }),
    });
  }

  // Sponsor
  async sponsorTournament(tourneyId, amount) {
    return this.request(`${ApiClient.baseUrl}/tournaments/${tourneyId}/sponsor`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount }),
    });
  }

  // Scorer
  async updateLiveScore(matchId, team, runs, wickets, overs, performances = []) {
    return this.request(`${ApiClient.baseUrl}/matches/${matchId}/score`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        team,
        runs,
        wickets,
        overs,
        performances,
      }),
    });
  }

  async completeMatch(matchId, winnerId, performances) {
    return this.request(`${ApiClient.baseUrl}/matches/${matchId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        winner_id: winnerId,
        performances,
      }),
    });
  }

  async applyScorer(tourneyId) {
    return this.request(`${ApiClient.baseUrl}/tournaments/${tourneyId}/apply-scorer`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }


  // Dashboards & Logs
  async getPlayerDashboard() {
    return this.request(`${ApiClient.baseUrl}/dashboard/player`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async getCoachDashboard() {
    return this.request(`${ApiClient.baseUrl}/dashboard/coach`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async getSponsorDashboard() {
    return this.request(`${ApiClient.baseUrl}/dashboard/sponsor`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async getScorerDashboard() {
    return this.request(`${ApiClient.baseUrl}/dashboard/scorer`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async getNotificationLogs() {
    return this.request(`${ApiClient.baseUrl}/notifications/logs`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }
}

export default ApiClient;
