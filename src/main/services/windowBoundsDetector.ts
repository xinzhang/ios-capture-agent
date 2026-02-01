import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInfo {
  appName: string;
  title: string;
  bounds: WindowBounds;
}

/**
 * Get window bounds using macOS Accessibility API via AppleScript
 * This works better than System Events for apps like iPhone Mirroring
 */
export async function getWindowBounds(appName: string): Promise<WindowBounds | null> {
  const script = `
    tell application "System Events"
      try
        set appProc to first process whose name is "${appName}"
        tell appProc
          set appWindow to first window
          set winBounds to bounds of appWindow
          return winBounds
        end tell
      on error errMsg
        return "error: " & errMsg
      end try
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    const result = stdout.trim();

    if (result.startsWith('error:')) {
      return null;
    }

    // Parse bounds: {x, y, x2, y2}
    const match = result.match(/\{(-?\d+), (-?\d+), (-?\d+), (-?\d+)\}/);
    if (match) {
      const [, x, y, x2, y2] = match.map(Number);
      return {
        x,
        y,
        width: x2 - x,
        height: y2 - y,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting window bounds:', error);
    return null;
  }
}

/**
 * Alternative: Use CGWindowListCopyWindowInfo via a native command
 */
export async function getAllWindowsBounds(): Promise<WindowInfo[]> {
  const script = `
    tell application "System Events"
      set windowList to {}
      set processList to every process whose background only is false

      repeat with proc in processList
        try
          set procName to name of proc
          if procName is not "Electron" and procName is not "osascript" then
            set procWindows to every window of proc
            repeat with win in procWindows
              try
                set winTitle to title of win
                set winBounds to bounds of win
                set windowList to windowList & {procName & "|||" & winTitle & "|||" & (item 1 of winBounds) & "|||" & (item 2 of winBounds) & "|||" & (item 3 of winBounds) & "|||" & (item 4 of winBounds)}
              end try
            end repeat
          end if
        end try
      end repeat

      return windowList
    end tell
  `;

  try {
    const tempDir = require('os').tmpdir();
    const path = require('path');
    const fs = require('fs');

    const scriptPath = path.join(tempDir, `window_bounds_${Date.now()}.scpt`);
    fs.writeFileSync(scriptPath, script.trim());

    const { stdout } = await execAsync(`osascript '${scriptPath}'`);

    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {}

    const lines = stdout.trim().split(', ').filter(line => line.length > 0);

    return lines.map((line) => {
      const [appName, title, x, y, x2, y2] = line.split('|||');
      return {
        appName,
        title,
        bounds: {
          x: parseInt(x) || 0,
          y: parseInt(y) || 0,
          width: (parseInt(x2) || 0) - (parseInt(x) || 0),
          height: (parseInt(y2) || 0) - (parseInt(y) || 0),
        },
      };
    });
  } catch (error) {
    console.error('Error getting all windows bounds:', error);
    return [];
  }
}

/**
 * Try to get iPhone Mirroring window bounds using a different method
 */
export async function getPhoneMirroringBounds(): Promise<WindowBounds | null> {
  // First try direct approach
  const directBounds = await getWindowBounds('iPhone Mirroring');
  if (directBounds) {
    return directBounds;
  }

  // Then try getting all windows and find iPhone Mirroring
  const allWindows = await getAllWindowsBounds();
  const phoneWindow = allWindows.find(w => w.appName === 'iPhone Mirroring');

  if (phoneWindow) {
    return phoneWindow.bounds;
  }

  return null;
}
