#!/usr/bin/env node
/**
 * SynapseTrader Autonomous Improvement Agent
 * 
 * Integrates with existing cron jobs to continuously improve
 * the trading bot and track revenue for API costs.
 * 
 * Based on Karpathy's AutoML loop principles:
 * - Edit one file
 * - Run experiment (5 min budget)
 * - Measure val_bpb
 * - Commit if improved
 * - Broadcast to Cortex
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AUTORESEARCH_PATH = 'E:\\scripts-python\\autoresearch';
const CORTEX_URL = 'http://localhost:8003';
const CORTEX_TOKEN = 'dev-token';

// Configuration
const CONFIG = {
  budgetMinutes: 5,
  improvementThreshold: 0.01, // 1% improvement needed to notify
  trainPath: path.join(AUTORESEARCH_PATH, 'train.py'),
  lastValBpbPath: path.join(AUTORESEARCH_PATH, '.last_val_bpb')
};

/**
 * Log with timestamp
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Save to Cortex
 */
async function saveToCortex(key, data) {
  try {
    const body = JSON.stringify({
      path: `synapse/trading/${key}`,
      content: JSON.stringify(data),
      metadata: {
        type: 'trading-metrics',
        saved_at: new Date().toISOString()
      }
    });
    
    const temp = path.join(process.env.TEMP || '/tmp', 'cortex_body.json');
    fs.writeFileSync(temp, body);
    
    execSync(`curl -s -X POST "${CORTEX_URL}/memory/add" -H "X-Cortex-Token: ${CORTEX_TOKEN}" -H "Content-Type: application/json" --data-binary "@${temp}"`, { stdio: 'pipe' });
    
    fs.unlinkSync(temp);
  } catch (e) {
    log('warn', `Failed to save to Cortex: ${e.message}`);
  }
}

/**
 * Read last val_bpb
 */
function readLastValBpb() {
  try {
    if (fs.existsSync(CONFIG.lastValBpbPath)) {
      return parseFloat(fs.readFileSync(CONFIG.lastValBpbPath, 'utf8').trim());
    }
  } catch (e) {}
  return null;
}

/**
 * Save current val_bpb
 */
function saveCurrentValBpb(valBpb) {
  fs.writeFileSync(CONFIG.lastValBpbPath, valBpb.toString());
}

/**
 * Run training experiment
 */
function runExperiment() {
  log('info', 'Running training experiment...');
  const startTime = Date.now();
  
  try {
    // Run with timeout
    const output = execSync(`python "${CONFIG.trainPath}"`, {
      cwd: AUTORESEARCH_PATH,
      stdio: 'pipe',
      timeout: CONFIG.budgetMinutes * 60 * 1000,
      encoding: 'utf8'
    });
    
    const duration = Date.now() - startTime;
    log('info', `Training completed in ${duration / 1000}s`);
    
    // Parse val_bpb from output
    const match = output.match(/val_bpb[:\s=]+([0-9.]+)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    
    return null;
  } catch (e) {
    log('error', `Training failed: ${e.message}`);
    return null;
  }
}

/**
 * Make a small edit to train.py hyperparameters
 */
function makeModelEdit() {
  log('info', 'Making model/traint.py hyperparameter edit...');
  
  try {
    const content = fs.readFileSync(CONFIG.trainPath, 'utf8');
    
    // Hyperparameter edits — rotate through options
    const edits = [
      { find: /DEPTH\s*=\s*8/, replace: 'DEPTH = 10', desc: 'Increase DEPTH 8→10' },
      { find: /DEPTH\s*=\s*10/, replace: 'DEPTH = 12', desc: 'Increase DEPTH 10→12' },
      { find: /DEPTH\s*=\s*12/, replace: 'DEPTH = 8', desc: 'Reset DEPTH to 8' },
      { find: /ASPECT_RATIO\s*=\s*64/, replace: 'ASPECT_RATIO = 80', desc: 'Increase ASPECT_RATIO 64→80' },
      { find: /ASPECT_RATIO\s*=\s*80/, replace: 'ASPECT_RATIO = 96', desc: 'Increase ASPECT_RATIO 80→96' },
      { find: /ASPECT_RATIO\s*=\s*96/, replace: 'ASPECT_RATIO = 64', desc: 'Reset ASPECT_RATIO to 64' },
      { find: /MATRIX_LR\s*=\s*0\.04/, replace: 'MATRIX_LR = 0.05', desc: 'Increase MATRIX_LR 0.04→0.05' },
      { find: /MATRIX_LR\s*=\s*0\.05/, replace: 'MATRIX_LR = 0.03', desc: 'Decrease MATRIX_LR 0.05→0.03' },
      { find: /MATRIX_LR\s*=\s*0\.03/, replace: 'MATRIX_LR = 0.04', desc: 'Reset MATRIX_LR to 0.04' },
      { find: /WEIGHT_DECAY\s*=\s*0\.2/, replace: 'WEIGHT_DECAY = 0.15', desc: 'Decrease WEIGHT_DECAY 0.2→0.15' },
      { find: /WEIGHT_DECAY\s*=\s*0\.15/, replace: 'WEIGHT_DECAY = 0.25', desc: 'Increase WEIGHT_DECAY 0.15→0.25' },
      { find: /WEIGHT_DECAY\s*=\s*0\.25/, replace: 'WEIGHT_DECAY = 0.2', desc: 'Reset WEIGHT_DECAY to 0.2' },
      { find: /WINDOW_PATTERN\s*=\s*"SSSL"/, replace: 'WINDOW_PATTERN = "LLLL"', desc: 'Set WINDOW_PATTERN to LLLL' },
      { find: /WINDOW_PATTERN\s*=\s*"LLLL"/, replace: 'WINDOW_PATTERN = "SLSL"', desc: 'Set WINDOW_PATTERN to SLSL' },
      { find: /WINDOW_PATTERN\s*=\s*"SLSL"/, replace: 'WINDOW_PATTERN = "SSSL"', desc: 'Reset WINDOW_PATTERN to SSSL' },
    ];
    
    for (const edit of edits) {
      if (edit.find.test(content)) {
        const newContent = content.replace(edit.find, edit.replace);
        fs.writeFileSync(CONFIG.trainPath, newContent);
        log('info', `Edit: ${edit.desc}`);
        return true;
      }
    }
    
    log('warn', 'No known hyperparam match found — adding comment');
    fs.appendFileSync(CONFIG.trainPath, '\n# Auto-tuning adjustment\n');
    return true;
  } catch (e) {
    log('error', `Failed to edit train.py: ${e.message}`);
    return false;
  }
}

/**
 * Make a secondary config edit (depth + aspect ratio combos)
 */
function makeConfigEdit() {
  // Covered by makeModelEdit now — all hyperparameters in train.py
  return false;
}

/**
 * Revert edits
 */
function revertEdits() {
  log('info', 'Reverting edits...');
  try {
    execSync('git checkout -- train.py', { cwd: AUTORESEARCH_PATH, stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Commit improvement
 */
function commitImprovement(valBpb, improvement) {
  log('info', 'Committing improvement...');
  try {
    execSync('git add train.py', { cwd: AUTORESEARCH_PATH, stdio: 'pipe' });
    execSync(`git commit -m "feat(trading): val_bpb improved to ${valBpb} (+${(improvement * 100).toFixed(2)}%)"`, { cwd: AUTORESEARCH_PATH, stdio: 'pipe' });
    execSync('git push', { cwd: AUTORESEARCH_PATH, stdio: 'pipe' });
    return true;
  } catch (e) {
    log('error', `Commit failed: ${e.message}`);
    return false;
  }
}

/**
 * Check trading bot status
 */
function checkTradingBot() {
  log('info', 'Checking trading bot status...');
  
  try {
    const output = execSync('docker ps --format "{{.Names}} {{.Status}}"', { encoding: 'utf8' });
    const running = output.includes('moonshot');
    
    if (running) {
      log('info', 'Trading bot: Running');
    } else {
      log('warn', 'Trading bot: Not running');
    }
    
    return running;
  } catch (e) {
    log('error', `Docker check failed: ${e.message}`);
    return false;
  }
}

/**
 * Main loop
 */
async function main() {
  log('info', '===========================================');
  log('info', 'SynapseTrader Autonomous Improvement Agent');
  log('info', '===========================================');
  
  // 1. Check trading bot status
  const botRunning = checkTradingBot();
  await saveToCortex('status/bot', { running: botRunning, timestamp: new Date().toISOString() });
  
  // 2. Check last val_bpb
  const lastValBpb = readLastValBpb();
  log('info', `Last val_bpb: ${lastValBpb || 'N/A'}`);
  
  // 3. Make an edit
  let editMade = makeModelEdit();
  if (!editMade) {
    editMade = makeConfigEdit();
  }
  
  if (!editMade) {
    log('warn', 'No edit could be made - may need manual review');
    await saveToCortex('status/agent', { status: 'stuck', timestamp: new Date().toISOString() });
    return;
  }
  
  // 4. Run experiment
  const newValBpb = runExperiment();
  
  if (newValBpb === null) {
    log('error', 'Experiment failed - reverting');
    revertEdits();
    await saveToCortex('status/agent', { status: 'failed', timestamp: new Date().toISOString() });
    return;
  }
  
  // 5. Compare
  const improvement = lastValBpb ? (lastValBpb - newValBpb) / lastValBpb : 0;
  
  log('info', `New val_bpb: ${newValBpb}`);
  log('info', `Improvement: ${(improvement * 100).toFixed(2)}%`);
  
  // 6. Save current val_bpb
  saveCurrentValBpb(newValBpb);
  await saveToCortex('val_bpb/latest', { val_bpb: newValBpb, improvement, timestamp: new Date().toISOString() });
  
  // 7. If improved, commit
  if (improvement > 0) {
    log('info', '✅ Improvement detected!');
    
    if (commitImprovement(newValBpb, improvement)) {
      log('info', 'Committed and pushed');
      
      // Notify if significant improvement
      if (improvement > CONFIG.improvementThreshold) {
        log('info', '🎉 Significant improvement - notifying...');
        await saveToCortex('alerts/improvement', { 
          val_bpb: newValBpb, 
          improvement: improvement * 100,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else {
    log('info', 'No improvement - reverting');
    revertEdits();
  }
  
  // 8. Final status
  await saveToCortex('status/agent', { 
    status: 'completed', 
    val_bpb: newValBpb,
    improvement,
    bot_running: botRunning,
    timestamp: new Date().toISOString()
  });
  
  log('info', '===========================================');
  log('info', 'Agent cycle complete');
  log('info', '===========================================');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
