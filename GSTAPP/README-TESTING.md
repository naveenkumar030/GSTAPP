# GSTAPP Automated Testing

This repository uses **Playwright** for End-to-End (E2E) testing, configured to run locally or across a cloud grid using **LambdaTest (TestMu AI)**.

The E2E tests are located in `tests/e2e/` and cover the following critical flows:
1. **Registration & OTP Mocking** (`register.spec.js`)
2. **Login valid/invalid credentials** (`login.spec.js`)
3. **GSTR-2B File Upload** (`upload.spec.js`)
4. **Smoke testing for Graph Pages** (`graphs.spec.js`)

**Note:** All tests utilize Playwright's network interception (`page.route`) to mock backend API responses. This guarantees that the UI tests are fast, reliable, and do not pollute the database with dummy test records or trigger real emails during CI/CD.

## Pre-requisites

Ensure you have your environment variables set up in the `.env` file at the root of the project:

```env
LT_USERNAME=your_lambdatest_username
LT_ACCESS_KEY=your_lambdatest_access_key
```

Also, install dependencies:
```bash
npm install
```

## Running Tests Locally

To run the tests locally using the standard Playwright Chromium/Firefox/WebKit browsers (without connecting to LambdaTest):

```bash
npm run test:e2e
```
*Note: Make sure your local frontend (http://localhost:5173) is running.*

## Running Cross-Browser Tests on LambdaTest

To execute the tests on LambdaTest's cloud grid across Chrome, Firefox, MicrosoftEdge, and Safari (macOS), run:

```bash
npm run test:lambdatest
```

**How it works:**
1. The `run-lambdatest.js` script automatically starts a **LambdaTest Tunnel** using the `@lambdatest/node-tunnel` package. This creates a secure connection so the cloud browsers can access your local `http://localhost:5173`.
2. It sets the required environment variables (e.g. `LAMBDATEST=true`) and invokes Playwright.
3. `playwright.config.js` routes the test execution to LambdaTest WebSocket endpoints, grouped under the build name `"GSTAPP Regression"`.
4. It captures videos, network logs, and console logs, which you can view on your LambdaTest Web Dashboard.
5. The script shuts down the tunnel gracefully when the tests complete.

## Viewing Results

After running `npm run test:lambdatest`, log in to your LambdaTest (TestMu) account and navigate to the **Automation > Web Automation** or **Builds** dashboard. Look for the build named `GSTAPP Regression` to see detailed execution videos, logs, and tracebacks for each browser.
