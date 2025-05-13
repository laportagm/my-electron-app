// Custom reporter for Vitest to filter React warning output
// This reporter is used to filter out React warnings related to React Three Fiber JSX elements
// which are expected in a test environment but don't affect test results

import { Reporter, TaskResultPack, ErrorWithDiff } from 'vitest';

// Track if warnings have already been seen to avoid duplicates
const r3fWarningsSeen = new Set<string>();

// List of patterns to filter out from stderr
const r3fWarningPatterns = [
  'The tag <group>',
  'The tag <mesh>',
  'The tag <sphereGeometry>',
  'The tag <meshBasicMaterial>',
  'The tag <meshStandardMaterial>',
  'The tag <line>',
  'The tag <bufferGeometry>',
  'The tag <bufferAttribute>',
  'The tag <lineDashedMaterial>',
  'The tag <pointLight>',
  'is using incorrect casing',
  'Received `true` for a non-boolean attribute',
  'Received `false` for a non-boolean attribute',
  'React does not recognize the `userData` prop'
];

// Custom reporter that filters out R3F related warnings
class R3FFilterReporter implements Reporter {
  private baseReporter: Reporter;

  constructor(baseReporter: Reporter) {
    this.baseReporter = baseReporter;
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    // Filter each pack to remove R3F-related warnings
    const filteredPacks = packs.map(pack => {
      if (pack.result && pack.result.stderr) {
        let filteredStderr = pack.result.stderr;
        
        // Check if the stderr contains any of our warning patterns
        r3fWarningPatterns.forEach(pattern => {
          if (filteredStderr.includes(pattern)) {
            // Generate a simple hash for the warning to track duplicates
            const hash = `${pack.taskId}:${pattern}`;
            
            // Only log this once to avoid spam
            if (!r3fWarningsSeen.has(hash)) {
              r3fWarningsSeen.add(hash);
              // Optional: log that we're filtering warnings
              // console.log(`[R3F Warnings] Filtered warnings for "${pattern}" in ${pack.taskId}`);
            }
            
            // Filter out all lines containing the pattern
            filteredStderr = filteredStderr
              .split('\n')
              .filter(line => !pattern.split(' ').some(p => line.includes(p)))
              .join('\n');
          }
        });
        
        // Update the pack with filtered stderr
        pack.result.stderr = filteredStderr;
      }
      return pack;
    });
    
    // Pass the filtered packs to the base reporter
    this.baseReporter.onTaskUpdate(filteredPacks);
  }

  // Passthrough for all other methods
  onFinished(...args: any[]): void {
    this.baseReporter.onFinished(...args);
  }
  
  onCollected(...args: any[]): void {
    this.baseReporter.onCollected(...args);
  }
  
  onWatcherStart?(...args: any[]): void {
    if (this.baseReporter.onWatcherStart) {
      this.baseReporter.onWatcherStart(...args);
    }
  }
  
  onWatcherRerun?(...args: any[]): void {
    if (this.baseReporter.onWatcherRerun) {
      this.baseReporter.onWatcherRerun(...args);
    }
  }
  
  onUserConsoleLog?(...args: any[]): void {
    if (this.baseReporter.onUserConsoleLog) {
      this.baseReporter.onUserConsoleLog(...args);
    }
  }
}

// Function to create a new reporter that wraps the base reporter
function createR3FFilterReporter(baseReporter: Reporter): Reporter {
  return new R3FFilterReporter(baseReporter);
}

// Default export for Vitest to use
export default {
  name: 'r3f-filter-reporter',
  factory: (baseReporter: Reporter) => createR3FFilterReporter(baseReporter)
};