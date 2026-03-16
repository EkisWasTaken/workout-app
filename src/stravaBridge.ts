import { stravaWeb } from './stravaWeb';

const isElectron = () => {
  return typeof window !== 'undefined' && !!(window as any).ipcRenderer && !!(window as any).stravaApi;
};

export const stravaApi = {
  getAuthUrl: async () => {
    if (isElectron()) return (window as any).stravaApi.getAuthUrl();
    const url = stravaWeb.getAuthUrl();
    window.location.href = url; // In web, we redirect the whole page
  },

  exchangeCodeForToken: async (code: string) => {
    if (isElectron()) return (window as any).stravaApi.exchangeCodeForToken(code);
    return stravaWeb.exchangeCodeForToken(code);
  },

  getActivities: async (page?: number, perPage?: number) => {
    if (isElectron()) return (window as any).stravaApi.getActivities(page, perPage);
    return stravaWeb.getActivities(page, perPage);
  },

  getStravaActivityById: async (id: string) => {
    if (isElectron()) return (window as any).stravaApi.getStravaActivityById(id);
    return stravaWeb.getStravaActivityById(id);
  },

  linkStravaActivity: async (workoutId: number, stravaActivityId: string) => {
    if (isElectron()) return (window as any).stravaApi.linkStravaActivity(workoutId, stravaActivityId);
    return stravaWeb.linkStravaActivity(workoutId, stravaActivityId);
  },

  isStravaConnected: async () => {
    if (isElectron()) return (window as any).stravaApi.isStravaConnected();
    return stravaWeb.isStravaConnected();
  }
};
