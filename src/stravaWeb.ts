import axios from 'axios';

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = window.location.origin + window.location.pathname;

export const stravaWeb = {
  getAuthUrl: () => {
    return `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=activity:read_all`;
  },

  exchangeCodeForToken: async (code: string) => {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });
    
    const data = response.data;
    localStorage.setItem('strava_access_token', data.access_token);
    localStorage.setItem('strava_refresh_token', data.refresh_token);
    localStorage.setItem('strava_expires_at', (Math.floor(Date.now() / 1000) + data.expires_in).toString());
    return data.access_token;
  },

  getAccessToken: async () => {
    const expiresAt = parseInt(localStorage.getItem('strava_expires_at') || '0');
    const refreshToken = localStorage.getItem('strava_refresh_token');
    
    if (Date.now() / 1000 < expiresAt - 60) {
      return localStorage.getItem('strava_access_token');
    }

    if (!refreshToken) return null;

    // Refresh token
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });
      
      const data = response.data;
      localStorage.setItem('strava_access_token', data.access_token);
      localStorage.setItem('strava_refresh_token', data.refresh_token || refreshToken);
      localStorage.setItem('strava_expires_at', (Math.floor(Date.now() / 1000) + data.expires_in).toString());
      return data.access_token;
    } catch (e) {
      console.error("Failed to refresh Strava token", e);
      return null;
    }
  },

  getActivities: async (page = 1, perPage = 30) => {
    const token = await stravaWeb.getAccessToken();
    if (!token) throw new Error("Not authenticated with Strava");

    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page, per_page: perPage }
    });
    return response.data;
  },

  getStravaActivityById: async (id: string) => {
    const token = await stravaWeb.getAccessToken();
    if (!token) throw new Error("Not authenticated with Strava");

    const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  linkStravaActivity: async (_workoutId: number, _stravaActivityId: string) => {
    // On web, "linking" is just returning the ID to the frontend to save in Supabase.
    // The database logic in db.ts already handles saving the ID.
    // We just return true to confirm the Strava part is "done" (even though nothing happens on Strava API side).
    return true;
  },

  isStravaConnected: async () => {
    return !!localStorage.getItem('strava_refresh_token');
  }
};
