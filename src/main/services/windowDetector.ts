import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WindowInfo {
  id: number;
  title: string;
  appName: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Detect all visible windows using AppleScript on macOS
 */
export async function detectWindows(): Promise<WindowInfo[]> {
  const script = `
    tell application "System Events"
      set windowList to {}
      set processList to every process whose background only is false

      repeat with proc in processList
        try
          set procName to name of proc
          if procName is not "Electron" then
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
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    const lines = stdout.trim().split(', ').filter(line => line.length > 0);

    return lines.map((line, index) => {
      const [appName, title, x, y, width, height] = line.split('|||');
      return {
        id: index + 1,
        appName: appName || 'Unknown',
        title: title || 'Untitled',
        bounds: {
          x: parseInt(x) || 0,
          y: parseInt(y) || 0,
          width: (parseInt(width) || 0) - (parseInt(x) || 0),
          height: (parseInt(height) || 0) - (parseInt(y) || 0),
        },
      };
    });
  } catch (error) {
    console.error('Error detecting windows:', error);
    return [];
  }
}

/**
 * Filter windows that are likely iPhone mirroring windows
 */
export function filterPhoneWindows(windows: WindowInfo[]): WindowInfo[] {
  const phoneKeywords = ['iphone', 'ipad', 'ios', 'mirroring', 'quicktime', 'airplay', 'airserver', 'reflector'];
  const phoneAppNames = ['QuickTime Player', 'AirServer', 'Reflector', 'LonelyScreen'];

  return windows.filter(
    win =>
      phoneAppNames.includes(win.appName) ||
      phoneKeywords.some(keyword =>
        win.title.toLowerCase().includes(keyword) ||
        win.appName.toLowerCase().includes(keyword)
      )
  );
}
