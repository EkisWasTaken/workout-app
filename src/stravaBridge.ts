import { stravaWeb } from './stravaWeb';

export const stravaApi = {
  getAuthUrl: async () => {
    const url = stravaWeb.getAuthUrl();
    window.location.href = url;
  },

  exchangeCodeForToken: async (code: string) => {
    return stravaWeb.exchangeCodeForToken(code);
  },

  getActivities: async (page?: number, perPage?: number) => {
    return stravaWeb.getActivities(page, perPage);
  },

  getStravaActivityById: async (id: string) => {
    return stravaWeb.getStravaActivityById(id);
  },

  linkStravaActivity: async (workoutId: number, stravaActivityId: string) => {
    return stravaWeb.linkStravaActivity(workoutId, stravaActivityId);
  },

  isStravaConnected: async () => {
    return stravaWeb.isStravaConnected();
  }
};
