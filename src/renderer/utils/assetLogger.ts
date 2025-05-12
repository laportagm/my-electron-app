/**
 * Asset Logger - Specialized logger for asset and model loading
 * Handles controlled verbosity levels to prevent console flooding
 */
import { rendererConfig } from '@/utils/config';

// Log levels:
// - verbose: Show all logs including debug information and every path attempt
// - normal: Show important loading information and warnings/errors
// - quiet: Show only errors and critical warnings

export type LogLevel = 'verbose' | 'normal' | 'quiet';

class AssetLogger {
  private getLevel(category: 'assets' | 'models'): LogLevel {
    return rendererConfig.getLoggingLevel(category);
  }

  // Asset loading logs
  public assetInfo(message: string, ...args: any[]): void {
    const level = this.getLevel('assets');
    if (level !== 'quiet') {
      console.log(`[Assets] ${message}`, ...args);
    }
  }

  public assetDebug(message: string, ...args: any[]): void {
    const level = this.getLevel('assets');
    if (level === 'verbose') {
      console.debug(`[Assets] ${message}`, ...args);
    }
  }

  public assetWarn(message: string, ...args: any[]): void {
    const level = this.getLevel('assets');
    if (level !== 'quiet') {
      console.warn(`[Assets] ${message}`, ...args);
    }
  }

  public assetError(message: string, ...args: any[]): void {
    // Always log errors
    console.error(`[Assets] ${message}`, ...args);
  }

  // Model loading logs
  public modelInfo(message: string, ...args: any[]): void {
    const level = this.getLevel('models');
    if (level !== 'quiet') {
      console.log(`[Model] ${message}`, ...args);
    }
  }

  public modelDebug(message: string, ...args: any[]): void {
    const level = this.getLevel('models');
    if (level === 'verbose') {
      console.debug(`[Model] ${message}`, ...args);
    }
  }

  public modelWarn(message: string, ...args: any[]): void {
    const level = this.getLevel('models');
    if (level !== 'quiet') {
      console.warn(`[Model] ${message}`, ...args);
    }
  }

  public modelError(message: string, ...args: any[]): void {
    // Always log errors
    console.error(`[Model] ${message}`, ...args);
  }

  // Path testing logs - special case for the many path attempts
  public pathAttempt(path: string): void {
    const level = this.getLevel('assets');
    if (level === 'verbose') {
      console.debug(`[Path] Trying: ${path}`);
    }
  }

  public pathSuccess(path: string): void {
    const level = this.getLevel('assets');
    if (level === 'verbose') {
      console.log(`[Path] ✅ Success: ${path}`);
    } else if (level === 'normal') {
      // In normal mode, only log the first success
      if (!this.firstPathSuccessLogged) {
        console.log(`[Path] ✅ Found working path: ${path}`);
        this.firstPathSuccessLogged = true;
      }
    }
  }

  public pathFailure(path: string, error?: string): void {
    const level = this.getLevel('assets');
    if (level === 'verbose') {
      console.warn(`[Path] ❌ Failed: ${path}${error ? ` - ${error}` : ''}`);
    }
  }

  // Reset success flag between different model loads
  private firstPathSuccessLogged = false;
  public resetPathLogging(): void {
    this.firstPathSuccessLogged = false;
  }

  // Utility to render styled console messages for debugging
  public highlight(message: string, style: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    const styles = {
      success: 'background: #222; color: #bada55',
      warning: 'background: #f39c12; color: #000',
      error: 'background: #c0392b; color: #fff',
      info: 'background: #2980b9; color: #fff'
    };
    
    console.log(`%c${message}`, styles[style]);
  }
}

// Export a singleton instance
export const assetLogger = new AssetLogger();