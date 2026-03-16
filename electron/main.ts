import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sqlite3 from 'sqlite3'
import * as fs from 'fs/promises'
import { getStravaAuthUrl, exchangeCodeForToken, getActivities, getStravaActivityById, refreshStravaAccessToken } from './strava';
import { Workout, Nutrition, DailyWeight } from '../src/types'; // Import Workout from shared types

let win: BrowserWindow | null = null


const dbPath = path.join(app.getPath('userData'), 'workouts.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database opening error: ', err);
  } else {
    console.log('Database opened successfully');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT,
        targetPace TEXT,
        gymType TEXT,
        isCompleted INTEGER DEFAULT 0
      )`, (err) => {
        if (err) {
          console.error('Error creating workouts table:', err);
        } else {
          console.log('Workouts table checked/created successfully.');
          // Migration to add stravaActivityId column if it doesn't exist
          db.all("PRAGMA table_info(workouts)", (err, columns: { name: string }[]) => {
            if (err) {
              console.error("Error getting table info:", err);
              return;
            }
            if (Array.isArray(columns)) {
              const hasStravaId = columns.some(col => col.name === 'stravaActivityId');
              if (!hasStravaId) {
                db.run("ALTER TABLE workouts ADD COLUMN stravaActivityId TEXT", (err) => {
                  if (err) console.error("Error adding stravaActivityId column:", err);
                  else console.log("stravaActivityId column added successfully.");
                });
              }

              const hasIsDeleted = columns.some(col => col.name === 'isDeleted');
              if (!hasIsDeleted) {
                db.run("ALTER TABLE workouts ADD COLUMN isDeleted INTEGER DEFAULT 0", (err) => {
                  if (err) console.error("Error adding isDeleted column:", err);
                  else console.log("isDeleted column added successfully.");
                });
              }

              const hasActualDuration = columns.some(col => col.name === 'actualDuration');
              if (!hasActualDuration) {
                db.run("ALTER TABLE workouts ADD COLUMN actualDuration INTEGER", (err) => {
                  if (err) console.error("Error adding actualDuration column:", err);
                  else console.log("actualDuration column added successfully.");
                });
              }

              const hasDuration = columns.some(col => col.name === 'duration');
              if (!hasDuration) {
                db.run("ALTER TABLE workouts ADD COLUMN duration INTEGER", (err) => {
                  if (err) console.error("Error adding duration column:", err);
                  else console.log("duration column added successfully.");
                });
              }

              const hasCaloriesBurned = columns.some(col => col.name === 'caloriesBurned');
              if (!hasCaloriesBurned) {
                db.run("ALTER TABLE workouts ADD COLUMN caloriesBurned INTEGER", (err) => {
                  if (err) console.error("Error adding caloriesBurned column:", err);
                  else console.log("caloriesBurned column added successfully.");
                });
              }

              const hasRpe = columns.some(col => col.name === 'rpe');
              if (!hasRpe) {
                db.run("ALTER TABLE workouts ADD COLUMN rpe INTEGER", (err) => {
                  if (err) console.error("Error adding rpe column:", err);
                  else console.log("rpe column added successfully.");
                });
              }

              const hasNotes = columns.some(col => col.name === 'notes');
              if (!hasNotes) {
                db.run("ALTER TABLE workouts ADD COLUMN notes TEXT", (err) => {
                  if (err) console.error("Error adding notes column:", err);
                  else console.log("notes column added successfully.");
                });
              }

              const hasTotalWeightLifted = columns.some(col => col.name === 'totalWeightLifted');
              if (!hasTotalWeightLifted) {
                db.run("ALTER TABLE workouts ADD COLUMN totalWeightLifted INTEGER", (err) => {
                  if (err) console.error("Error adding totalWeightLifted column:", err);
                  else console.log("totalWeightLifted column added successfully.");
                });
              }

              const hasDistance = columns.some(col => col.name === 'distance');
              if (!hasDistance) {
                db.run("ALTER TABLE workouts ADD COLUMN distance REAL", (err) => {
                  if (err) console.error("Error adding distance column:", err);
                  else console.log("distance column added successfully.");
                });
              }
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS strava_tokens (
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          athlete_id TEXT PRIMARY KEY
        )`, (err) => {
            if (err) {
              console.error('Error creating strava_tokens table:', err);
            } else {
              console.log('strava_tokens table checked/created successfully.');
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS workout_type_colors (
          type TEXT PRIMARY KEY,
          color TEXT NOT NULL
        )`, (err) => {
            if (err) {
              console.error('Error creating workout_type_colors table:', err);
            } else {
              console.log('Workout_type_colors table checked/created successfully.');
              // Insert default colors if the table is empty
              db.get('SELECT COUNT(*) as count FROM workout_type_colors', (err, row: { count: number }) => {
                if (err) {
                  console.error('Error checking workout_type_colors count:', err);
                  return;
                }
                if (row.count === 0) {
                  db.run('INSERT INTO workout_type_colors (type, color) VALUES (?, ?)', ['gym', '#3f88c5']);
                  db.run('INSERT INTO workout_type_colors (type, color) VALUES (?, ?)', ['running', '#5cb85c']);
                  db.run('INSERT INTO workout_type_colors (type, color) VALUES (?, ?)', ['rest', '#757575']); // Default rest color
                  db.run('INSERT INTO workout_type_colors (type, color) VALUES (?, ?)', ['other', '#FFA726']); // Default other color
                  console.log('Default workout type colors inserted.');
                }
              });
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS nutritions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          energyTarget_kcal REAL,
          proteinTarget_g REAL,
          carbTarget_g REAL,
          fatTarget_g REAL,
          mealsPerDay INTEGER,
          preWorkoutCarbs_g REAL,
          postWorkoutProtein_g REAL,
          hydration_ml REAL,
          fiber_g REAL,
          bodyWeightTarget_kg REAL,
          notes TEXT
        )`, (err) => {
            if (err) {
              console.error('Error creating nutritions table:', err);
            } else {
              console.log('Nutritions table checked/created successfully.');
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS daily_weights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          weight REAL NOT NULL
        )`, (err) => {
            if (err) {
              console.error('Error creating daily_weights table:', err);
            } else {
              console.log('Daily_weights table checked/created successfully.');
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS workout_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`, (err) => {
            if (err) {
              console.error('Error creating workout_templates table:', err);
            } else {
              console.log('workout_templates table checked/created successfully.');
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS workout_template_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER NOT NULL,
          exercise_name TEXT NOT NULL,
          sets INTEGER,
          reps TEXT,
          notes TEXT,
          FOREIGN KEY (template_id) REFERENCES workout_templates(id)
        )`, (err) => {
            if (err) {
              console.error('Error creating workout_template_exercises table:', err);
            } else {
              console.log('workout_template_exercises table checked/created successfully.');
            }
          });

          db.run(`CREATE TABLE IF NOT EXISTS exercises (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    body_part TEXT NOT NULL
                  )`, (err) => {
                    // ... (keep existing exercise logic)
                  });

          db.run(`CREATE TABLE IF NOT EXISTS strava_cache (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL
          )`, (err) => {
            if (err) console.error('Error creating strava_cache table:', err);
            else console.log('strava_cache table checked/created successfully.');
          });        }
      });
    });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// Strava Token Management Functions
interface StravaTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  athlete_id: string;
}

async function getValidStravaAccessToken(): Promise<string | null> {
  let tokens = await getStravaTokens();
  if (!tokens) {
    return null;
  }

  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  if (tokens.expires_at > currentTime + 60) { // Check if token expires in more than 60 seconds
    return tokens.access_token;
  }

  // Token is expired or about to expire, try to refresh
  try {
    console.log('Refreshing Strava access token...');
    const refreshedTokens = await refreshStravaAccessToken(tokens.refresh_token);
    const expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in;
    const newTokens: StravaTokenData = {
      access_token: refreshedTokens.access_token,
      refresh_token: refreshedTokens.refresh_token || tokens.refresh_token, // Use new refresh token if provided, otherwise old one
      expires_at: expiresAt,
      athlete_id: tokens.athlete_id, // Athlete ID remains the same
    };
    await saveStravaTokens(newTokens);
    return newTokens.access_token;
  } catch (error) {
    console.error('Failed to refresh Strava access token:', error);
    // If refresh fails, clear tokens so user has to re-authenticate
    await deleteStravaTokens();
    return null;
  }
}

function saveStravaTokens(tokens: StravaTokenData): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO strava_tokens (access_token, refresh_token, expires_at, athlete_id)
       VALUES (?, ?, ?, ?)`,
      [tokens.access_token, tokens.refresh_token, tokens.expires_at, tokens.athlete_id],
      function (err) {
        if (err) {
          console.error('Error saving Strava tokens:', err);
          reject(err);
        } else {
          console.log('Strava tokens saved/updated.');
          resolve();
        }
      }
    );
  });
}

function getStravaTokens(): Promise<StravaTokenData | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT access_token, refresh_token, expires_at, athlete_id FROM strava_tokens LIMIT 1`,
      (err, row: StravaTokenData) => {
        if (err) {
          console.error('Error retrieving Strava tokens:', err);
          reject(err);
        } else {
          if (row) {
            resolve(row);
          } else {
            resolve(null);
          }
        }
      }
    );
  });
}

function deleteStravaTokens(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM strava_tokens`, function (err) {
      if (err) {
        console.error('Error deleting Strava tokens:', err);
        reject(err);
      } else {
                  console.log('Strava tokens deleted.');
                  resolve();      }
    });
  });
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '.', 'electron-vite.svg'),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

function createStravaAuthWindow() {
  console.log('Creating Strava auth window...');
  const authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  authWindow.loadURL(getStravaAuthUrl());
  console.log('Strava auth window loading URL:', getStravaAuthUrl());

  const handleNavigation = (_event: Electron.Event, url: string) => {
    console.log('Auth window navigation:', url);
    const stravaRedirectUri = 'http://localhost:5173/strava-callback';
    if (url.startsWith(stravaRedirectUri)) {
      console.log('Strava redirect intercepted:', url);
      if (win) {
        win.focus();
        win.webContents.send('strava-auth-callback', url);
      }
      authWindow.close();
      console.log('Strava auth window closed.');
    }
  };

  authWindow.webContents.on('will-navigate', handleNavigation);
  authWindow.webContents.on('did-navigate', handleNavigation);

  authWindow.on('closed', () => {
    console.log('Strava auth window was closed by user or script.');
  });
}
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  createWindow();

  // Load existing Strava tokens on startup
  try {
    const tokens = await getStravaTokens();
    if (tokens) {
      console.log('Strava tokens loaded from DB.');
    }
  } catch (error) {
    console.error('Error loading Strava tokens on startup:', error);
  }

  ipcMain.handle('get-strava-auth-url', () => {
    createStravaAuthWindow();
  });

  ipcMain.handle('strava-exchange-code', async (_event, code) => {
    try {
      const tokenResponse = await exchangeCodeForToken(code);
      const expiresAt = Math.floor(Date.now() / 1000) + tokenResponse.expires_in; // Calculate expiration timestamp

      const tokensToSave: StravaTokenData = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: expiresAt,
        athlete_id: tokenResponse.athlete.id.toString(), // Assuming athlete.id exists and is unique
      };
      await saveStravaTokens(tokensToSave);
      return tokenResponse.access_token;
    } catch (error: any) {
      console.error('Failed to exchange code for token:', error);
      return null;
    }
  });

// Strava activities cache (In-memory)
let cachedActivities: any = null;
let lastActivitiesFetchTime = 0;
const ACTIVITIES_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache for list

// Detailed activity cache (specific IDs)
const detailedActivityCache = new Map<string, { data: any, timestamp: number }>();
const DETAILED_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for detailed data in memory

// Global throttle to prevent rate limit bursts
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between ANY Strava API calls

async function throttleRequest() {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < MIN_REQUEST_INTERVAL) {
        const wait = MIN_REQUEST_INTERVAL - timeSinceLast;
        await new Promise(resolve => setTimeout(resolve, wait));
    }
    lastRequestTime = Date.now();
}

// Persistent cache helpers
async function getPersistentCache(id: string): Promise<any | null> {
    return new Promise((resolve) => {
        db.get('SELECT data, timestamp FROM strava_cache WHERE id = ?', [id], (err, row: any) => {
            if (err || !row) return resolve(null);
            
            const age = Date.now() - row.timestamp;
            // List cache is shorter (15 mins), Detail cache is long (7 days)
            const ttl = id.startsWith('list_') ? ACTIVITIES_CACHE_TTL : (7 * 24 * 60 * 60 * 1000);
            
            if (age < ttl) {
                try {
                    resolve(JSON.parse(row.data));
                } catch (e) {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

async function setPersistentCache(id: string, type: string, data: any) {
    const dataStr = JSON.stringify(data);
    const timestamp = Date.now();
    db.run('INSERT OR REPLACE INTO strava_cache (id, type, data, timestamp) VALUES (?, ?, ?, ?)', [id, type, dataStr, timestamp]);
}

  ipcMain.handle('strava-get-activities', async (_event, page?: number, per_page?: number) => {
    console.log('Main: strava-get-activities called', { page, per_page });
    const isDefaultRequest = (page === undefined || page === 1) && (per_page === undefined || per_page === 30);
    const cacheKey = `list_${page || 1}_${per_page || 30}`;

    // 1. Check in-memory cache
    if (isDefaultRequest && cachedActivities && (Date.now() - lastActivitiesFetchTime < ACTIVITIES_CACHE_TTL)) {
      console.log('Main: Returning in-memory cached activities.');
      return cachedActivities;
    }

    // 2. Check persistent cache
    const pCache = await getPersistentCache(cacheKey);
    if (pCache) {
        console.log('Main: Returning persistent cached activities.');
        if (isDefaultRequest) {
            cachedActivities = pCache;
            lastActivitiesFetchTime = Date.now();
        }
        return pCache;
    }

    const accessToken = await getValidStravaAccessToken();
    if (!accessToken) return { error: 'NO_ACCESS_TOKEN' };

    try {
      await throttleRequest();
      console.log('Main: Fetching activities from Strava API...');
      const activities = await getActivities(accessToken, page, per_page);
      
      if (Array.isArray(activities)) {
        await setPersistentCache(cacheKey, 'list', activities);
        if (isDefaultRequest) {
            cachedActivities = activities;
            lastActivitiesFetchTime = Date.now();
        }
      }
      return activities;
    } catch (error: any) {
      console.error('Main: Failed to fetch Strava activities:', error.message);
      return { error: 'API_ERROR', details: error.response?.data || error.message };
    }
  });

  ipcMain.handle('get-strava-activity-by-id', async (_event, activityId: string) => {
    console.log('Main: get-strava-activity-by-id called for', activityId);
    const currentTime = Date.now();

    // 1. Check in-memory detailed cache
    const memCached = detailedActivityCache.get(activityId);
    if (memCached && (currentTime - memCached.timestamp < DETAILED_CACHE_TTL)) {
      return memCached.data;
    }

    // 2. Check persistent cache
    const pCache = await getPersistentCache(activityId);
    if (pCache) {
        detailedActivityCache.set(activityId, { data: pCache, timestamp: currentTime });
        return pCache;
    }
    
    // 3. Check summary list (as fallback distance source)
    if (cachedActivities && Array.isArray(cachedActivities)) {
      const summary = cachedActivities.find((a: any) => a.id.toString() === activityId);
      if (summary) return summary;
    }

    const accessToken = await getValidStravaAccessToken();
    if (!accessToken) return { error: 'NO_ACCESS_TOKEN' };

    try {
      await throttleRequest();
      const activity = await getStravaActivityById(accessToken, activityId);
      await setPersistentCache(activityId, 'detail', activity);
      detailedActivityCache.set(activityId, { data: activity, timestamp: Date.now() });
      return activity;
    } catch (error: any) {
        console.error(`Main: Failed to fetch Strava activity ${activityId}:`, error.message);
        return { error: 'API_ERROR', details: error.response?.data || error.message };
    }
  });

  ipcMain.handle('strava-is-connected', async () => {
    const accessToken = await getValidStravaAccessToken();
    return !!accessToken;
  });

  ipcMain.handle('link-strava-activity', async (_event, { workoutId, stravaActivityId }) => {
    try {
        const accessToken = await getValidStravaAccessToken();
        if (!accessToken) {
            throw new Error('No valid Strava access token available.');
        }

        let distance = 0;
        let activityFound = false;

        // Check detailed cache
        const cachedDetailed = detailedActivityCache.get(stravaActivityId);
        if (cachedDetailed) {
            distance = cachedDetailed.data.distance;
            activityFound = true;
        }
        
        // Check summary cache
        if (!activityFound && cachedActivities && Array.isArray(cachedActivities)) {
            const activity = cachedActivities.find((a: any) => a.id.toString() === stravaActivityId.toString());
            if (activity) {
                distance = activity.distance;
                activityFound = true;
            }
        }

        if (!activityFound) {
            const activity = await getStravaActivityById(accessToken, stravaActivityId);
            distance = activity.distance / 1000; // Convert to KM
            // Cache it
            detailedActivityCache.set(stravaActivityId, { data: activity, timestamp: Date.now() });
        } else {
            // If found in cache, it might be in meters still if it came from summary list
            // Strava API always returns meters.
            distance = distance / 1000;
        }

        return new Promise((resolve, reject) => {
            db.run('UPDATE workouts SET stravaActivityId = ?, distance = ? WHERE id = ?', [stravaActivityId, distance, workoutId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    } catch (error) {
        console.error('Main: Failed to link Strava activity:', error);
        return { error: 'LINK_FAILED', message: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('get-workouts', async () => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM workouts WHERE isDeleted = 0';
      console.log('Executing SQL for get-workouts:', sql);
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error in get-workouts:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

    ipcMain.handle('add-workout', async (_event, workout: Workout) => {
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO workouts (name, date, type, targetPace, gymType, isCompleted, duration, caloriesBurned, actualDuration, rpe, notes, totalWeightLifted, distance, stravaActivityId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            workout.name,
            workout.date,
            workout.type,
            workout.targetPace,
            workout.gymType,
            workout.isCompleted ?? 0,
            workout.duration,
            workout.caloriesBurned,
            workout.actualDuration,
            workout.rpe,
            workout.notes,
            workout.totalWeightLifted,
            workout.distance,
            workout.stravaActivityId
          ],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          }
        );
      });
    });

  ipcMain.handle('update-workout', async (_event, workout: Workout) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE workouts SET name = ?, date = ?, type = ?, targetPace = ?, gymType = ?, isCompleted = ?, duration = ?, caloriesBurned = ?, actualDuration = ?, rpe = ?, notes = ?, totalWeightLifted = ?, distance = ?, stravaActivityId = ? WHERE id = ?',
        [
          workout.name,
          workout.date,
          workout.type,
          workout.targetPace,
          workout.gymType,
          workout.isCompleted ?? 0,
          workout.duration,
          workout.caloriesBurned,
          workout.actualDuration,
          workout.rpe,
          workout.notes,
          workout.totalWeightLifted,
          workout.distance,
          workout.stravaActivityId,
          workout.id
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  });

  ipcMain.handle('delete-workout', async (_event, id: number) => {
    console.log('Main process received delete-workout request for ID:', id);
    return new Promise((resolve, reject) => {
      db.run('UPDATE workouts SET isDeleted = 1 WHERE id = ?', id, function(err) {
        if (err) {
          console.error(`Error soft-deleting workout ${id}:`, err);
          reject(err);
        } else {
          console.log(`Workout ${id} soft-deleted. Changes: ${this.changes}`);
          resolve(this.changes);
        }
      });
    });
  });

  ipcMain.handle('delete-workouts', async (_event, ids: number[]) => {
    console.log('Main process received delete-workouts request for IDs:', ids);
    return new Promise((resolve, reject) => {
      if (!ids || ids.length === 0) {
        console.log('No IDs provided for bulk delete, resolving with 0 changes.');
        resolve(0); // No IDs to delete
        return;
      }
      const placeholders = ids.map(() => '?').join(',');
      db.run(`UPDATE workouts SET isDeleted = 1 WHERE id IN (${placeholders})`, ids, function(err) {
        if (err) {
          console.error(`Error soft-deleting workouts with IDs ${ids}:`, err);
          reject(err);
        } else {
          console.log(`Workouts with IDs ${ids} soft-deleted. Changes: ${this.changes}`);
          resolve(this.changes);
        }
      });
    });
  });

  ipcMain.handle('get-completed-workouts', async (_event, limit?: number, offset?: number) => {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM workouts WHERE isCompleted = 1 AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY date DESC';
      const params: any[] = [];
      
      if (limit !== undefined) {
        sql += ' LIMIT ?';
        params.push(limit);
      }
      if (offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(offset);
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('complete-workout', async (_event, data: {
    id: number;
    isCompleted: number;
    actualDuration?: number;
    rpe?: number;
    notes?: string;
    totalWeightLifted?: number;
    stravaActivityId?: string;
    distance?: number; // Added distance to the data payload
  }) => {
    const { id, isCompleted, actualDuration, rpe, notes, totalWeightLifted, stravaActivityId, distance: manualDistance } = data; // Deconstruct manualDistance

    let finalDistance: number | undefined = manualDistance; // Initialize finalDistance with manualDistance, if provided
    if (stravaActivityId) {
      console.log('Attempting to sync Strava activity:', stravaActivityId);
      try {
        const accessToken = await getValidStravaAccessToken();
        if (accessToken) {
          const activity = await getStravaActivityById(accessToken, String(stravaActivityId));
          console.log('Successfully fetched Strava activity. Distance (m):', activity.distance);
          finalDistance = activity.distance / 1000; // Convert meters to kilometers
        } else {
          console.error('No valid Strava access token found.');
        }
      } catch (error) {
        console.error('Failed to fetch Strava activity for distance:', error);
        // Don't block completion if Strava fetch fails
      }
    }

    return new Promise((resolve, reject) => {
      const columns: string[] = ['isCompleted = ?'];
      const values: any[] = [isCompleted];

      if (actualDuration !== undefined) { columns.push('actualDuration = ?'); values.push(actualDuration); }
      if (rpe !== undefined) { columns.push('rpe = ?'); values.push(rpe); }
      if (notes !== undefined) { columns.push('notes = ?'); values.push(notes); }
      if (totalWeightLifted !== undefined) { columns.push('totalWeightLifted = ?'); values.push(totalWeightLifted); }
      if (stravaActivityId !== undefined) { columns.push('stravaActivityId = ?'); values.push(stravaActivityId); }
      if (finalDistance !== undefined) { columns.push('distance = ?'); values.push(finalDistance); } // Use finalDistance here

      values.push(id);

      const sql = `UPDATE workouts SET ${columns.join(', ')} WHERE id = ?`;

      db.run(sql, values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });

  ipcMain.handle('open-file-dialog', async () => {
    if (!win) {
      return { canceled: true, filePaths: [] };
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return { canceled, filePaths };
  });

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, { encoding: 'utf-8' });
      return { success: true, content };
    } catch (error: any) {
      console.error('Failed to read file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-workout-by-id', async (_event, id: number) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM workouts WHERE id = ?', id, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row); // row will be undefined if no match
        }
      });
    });
  });

  ipcMain.handle('get-workout-type-colors', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT type, color FROM workout_type_colors', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('set-workout-type-color', async (_event, { type, color }) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO workout_type_colors (type, color) VALUES (?, ?)', [type, color], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });

  ipcMain.handle('get-nutritions', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM nutritions', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('add-nutrition', async (_event, nutrition: Nutrition) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO nutritions (name, date, energyTarget_kcal, proteinTarget_g, carbTarget_g, fatTarget_g, mealsPerDay, preWorkoutCarbs_g, postWorkoutProtein_g, hydration_ml, fiber_g, bodyWeightTarget_kg, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          nutrition.name,
          nutrition.date,
          nutrition.energyTarget_kcal,
          nutrition.proteinTarget_g,
          nutrition.carbTarget_g,
          nutrition.fatTarget_g,
          nutrition.mealsPerDay,
          nutrition.preWorkoutCarbs_g,
          nutrition.postWorkoutProtein_g,
          nutrition.hydration_ml,
          nutrition.fiber_g,
          nutrition.bodyWeightTarget_kg,
          nutrition.notes,
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  });

  ipcMain.handle('add-daily-weight', async (_event, dailyWeight: DailyWeight) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO daily_weights (date, weight) VALUES (?, ?)',
        [
          dailyWeight.date,
          dailyWeight.weight,
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  });

  ipcMain.handle('get-daily-weights', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM daily_weights', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('get-workout-templates', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM workout_templates', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('get-workout-template-exercises', async (_event, templateId: number) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM workout_template_exercises WHERE template_id = ?', [templateId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('add-workout-template', async (_event, { name, exercises }) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO workout_templates (name) VALUES (?)', [name], function(err) {
        if (err) {
          return reject(err);
        }
        const templateId = this.lastID;
        const exercisesPromises = exercises.map(ex => {
          return new Promise((resolveExercise, rejectExercise) => {
            db.run('INSERT INTO workout_template_exercises (template_id, exercise_name, sets, reps, notes) VALUES (?, ?, ?, ?, ?)',
              [templateId, ex.exercise_name, ex.sets, ex.reps, ex.notes],
              (err) => {
                if (err) {
                  rejectExercise(err);
                } else {
                  resolveExercise(this.lastID);
                }
              }
            );
          });
        });
        Promise.all(exercisesPromises)
          .then(() => resolve(templateId))
          .catch(reject);
      });
    });
  });

  ipcMain.handle('delete-workout-template', async (_event, templateId: number) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM workout_template_exercises WHERE template_id = ?', [templateId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
        });
        db.run('DELETE FROM workout_templates WHERE id = ?', [templateId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
        });
        db.run('COMMIT', (err) => {
          if(err) {
            reject(err)
          } else {
            resolve(true);
          }
        });
      });
    });
  });

  ipcMain.handle('get-exercises', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM exercises', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
});
