import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// .env is in the root directory, so default config works.
dotenv.config();

const capabilities = {
  'browserName': 'Chrome', // This acts as a default but is overridden by project specific browserName in connectOptions if needed
  'browserVersion': 'latest',
  'LT:Options': {
    'platform': 'Windows 10',
    'build': 'GSTAPP Regression',
    'name': 'GST App E2E Tests',
    'user': process.env.LT_USERNAME,
    'accessKey': process.env.LT_ACCESS_KEY,
    'network': true,
    'video': true,
    'console': true,
    'tunnel': true, // Use LambdaTest Tunnel to test local application
    'tunnelName': process.env.LT_TUNNEL_NAME || '' 
  }
};

const isLambdaTest = process.env.LAMBDATEST === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    actionTimeout: 15000,
    trace: 'on-first-retry',
    baseURL: 'http://localhost:5173', // The frontend URL directly. No backend redirect is needed.
  },

  projects: [
    ...(isLambdaTest ? [
      {
        name: 'Chrome',
        use: {
          connectOptions: {
            wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify({
              ...capabilities,
              browserName: 'Chrome'
            }))}`
          }
        }
      },
      {
        name: 'Firefox',
        use: {
          connectOptions: {
            wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify({
              ...capabilities,
              browserName: 'pw-firefox'
            }))}`
          }
        }
      },
      {
        name: 'Edge',
        use: {
          connectOptions: {
            wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify({
              ...capabilities,
              browserName: 'MicrosoftEdge'
            }))}`
          }
        }
      },
      {
        name: 'Safari',
        use: {
          connectOptions: {
            wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify({
              ...capabilities,
              browserName: 'pw-webkit',
              'LT:Options': {
                ...capabilities['LT:Options'],
                platform: 'MacOS Sonoma'
              }
            }))}`
          }
        }
      }
    ] : [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      }
    ]),
  ],
});
