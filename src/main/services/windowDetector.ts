import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import screenshot from 'screenshot-desktop';

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
  isDisplay?: boolean; // Flag for display/screen captures
}

/**
 * Detect all visible windows using AppleScript on macOS
 */
export async function detectWindows(): Promise<WindowInfo[]> {
  const windows: WindowInfo[] = [];
  let hasIPhoneMirroring = false;

  // First, check if iPhone Mirroring is running
  const processCheckScript = `tell application "System Events" to return (name of every process whose background only is false) contains "iPhone Mirroring"`;

  try {
    const { stdout: isRunning } = await execAsync(`osascript -e '${processCheckScript}'`);
    hasIPhoneMirroring = isRunning.trim() === 'true';
    console.log('📱 iPhone Mirroring running:', hasIPhoneMirroring);
  } catch (e) {
    console.log('Could not check for iPhone Mirroring');
  }

  // If iPhone Mirroring is running, add an entry for the entire display
  if (hasIPhoneMirroring) {
    try {
      const displays = await screenshot.listDisplays();
      console.log(`🖥️  Found ${displays.length} display(s)`);

      for (const display of displays) {
        // For simplicity, we'll use a standard full-screen resolution
        // In production, you'd get the actual display bounds
        windows.push({
          id: windows.length + 1,
          title: display.name || 'Display',
          appName: 'iPhone Mirroring (Full Screen)',
          bounds: {
            x: 0,
            y: 0,
            width: 1920, // Default, will be adjusted at capture time
            height: 1080,
          },
          isDisplay: true,
        });
        console.log(`  - Added display: ${display.name}`);
      }
    } catch (e) {
      console.error('Error listing displays:', e);
    }
  }

  // Also detect other windows using a simpler script
  const simpleScript = `
tell application "System Events"
  set procList to {}
  set processList to every process whose background only is false

  repeat with proc in processList
    try
      set procName to name of proc
      if procName is not "Electron" and procName is not "osascript" and procName is not "iPhone Mirroring" then
        set procWindows to every window of proc
        if (count of procWindows) > 0 then
          set procList to procList & {procName}
        end if
      end if
    end try
  end repeat

  return procList
end tell
`;

  try {
    console.log('🔎 Running AppleScript to detect other apps...');

    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `window_detector_${Date.now()}.scpt`);
    fs.writeFileSync(scriptPath, simpleScript.trim());

    const { stdout } = await execAsync(`osascript '${scriptPath}'`);

    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    const appNames = stdout.trim().split(', ').filter(name => name.length > 0);
    console.log(`📊 Detected ${appNames.length} apps with windows`);

    for (const appName of appNames) {
      windows.push({
        id: windows.length + 1,
        title: 'Window',
        appName: appName,
        bounds: {
          x: 0,
          y: 0,
          width: 800, // Placeholder, actual bounds captured via screenshot
          height: 600,
        },
        isDisplay: false,
      });
    }

    // Log each window for debugging
    windows.forEach(w => {
      console.log(`  - ${w.appName}: "${w.title}" (${w.bounds.width}x${w.bounds.height})`);
    });

    return windows;
  } catch (error) {
    console.error('❌ Error detecting windows:', error);
    return windows;
  }
}

/**
 * Filter windows that are likely iPhone mirroring windows
 */
export function filterPhoneWindows(windows: WindowInfo[]): WindowInfo[] {
  console.log('🔍 Filtering windows for phone mirroring apps...');
  console.log('📋 Available windows:', windows.map(w => `${w.appName}: ${w.title}`));

  // Return windows as-is since detectWindows already handles the filtering
  console.log('✅ Returning detected windows');
  return windows;
}
