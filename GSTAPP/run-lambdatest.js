import { execSync } from 'child_process';
import tunnel from '@lambdatest/node-tunnel';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const tunnelInstance = new tunnel();

const tunnelArguments = {
  user: process.env.LT_USERNAME,
  key: process.env.LT_ACCESS_KEY,
  tunnelName: 'GST-App-Tunnel'
};

async function runTests() {
  console.log('Starting LambdaTest Tunnel...');
  try {
    await new Promise((resolve, reject) => {
      tunnelInstance.start(tunnelArguments, (error, status) => {
        if (!status) {
          reject(error || 'Tunnel failed to start');
        } else {
          resolve();
        }
      });
    });
    console.log('LambdaTest Tunnel Started Successfully.');
    
    // Set tunnel name in env so playwright config uses it
    process.env.LT_TUNNEL_NAME = tunnelArguments.tunnelName;
    process.env.LAMBDATEST = 'true';

    console.log('Running Playwright tests...');
    execSync('npx playwright test', { stdio: 'inherit' });
    
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    console.log('Stopping LambdaTest Tunnel...');
    tunnelInstance.stop();
  }
}

runTests();
