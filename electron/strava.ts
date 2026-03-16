import { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } from './strava-env';
import axios from 'axios';
import type { StravaActivity } from '../src/types'; // Import StravaActivity

const STRAVA_REDIRECT_URI = 'http://localhost:5173/strava-callback';

export function getStravaAuthUrl() {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'force', // Changed to force to ensure fresh scope approval
    scope: 'read,activity:read,activity:read_all',
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  try {
    console.log('Strava: Exchanging code for token...');
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });
    return response.data;
  } catch (error: any) {
    console.error('Strava: Error exchanging code for token:', error.response?.data || error.message);
    throw error;
  }
}

export async function getActivities(accessToken: string, page: number = 1, per_page: number = 30): Promise<StravaActivity[]> {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page, per_page },
    });
    return response.data;
  } catch (error: any) {
    console.error('Strava: Error fetching athlete activities:', error.response?.data || error.message);
    throw error;
  }
}

export async function getStravaActivityById(accessToken: string, activityId: string): Promise<StravaActivity> {
  try {
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching Strava activity ${activityId}:`, error);
    throw error;
  }
}

export async function refreshStravaAccessToken(refreshToken: string) {
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return response.data; // Return full response data including new access_token and refresh_token
  } catch (error) {
    console.error('Error refreshing Strava access token:', error);
    throw error;
  }
}
