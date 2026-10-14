import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAppUpdateConfig } from '../src/features/appUpdate/appUpdateSchema';
import { REMOTE_CONFIG_PATHS } from '../src/core/remoteConfig/constants';
import {
  APP_CONFIG_BASE_URL,
  APP_UPDATE_CONFIG_FILE,
  DEPLOY_VERIFY_ATTEMPTS,
  DEPLOY_VERIFY_DELAY_MS,
  REPO_ROOT,
} from './release/constants';

const expected = parseAppUpdateConfig(
  JSON.parse(readFileSync(resolve(REPO_ROOT, APP_UPDATE_CONFIG_FILE), 'utf8')) as unknown,
);
if (!expected) {
  console.error(`✗ ${APP_UPDATE_CONFIG_FILE} failed app-update schema validation.`);
  process.exit(1);
}

const url = `${process.env.APP_CONFIG_URL ?? APP_CONFIG_BASE_URL}${REMOTE_CONFIG_PATHS.appUpdate}`;
const want = JSON.stringify(expected);

async function main(): Promise<void> {
  let served = '';
  for (let attempt = 1; attempt <= DEPLOY_VERIFY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      served = JSON.stringify(response.ok ? parseAppUpdateConfig(await response.json()) : null);
      if (served === want) {
        console.log(`✓ ${url} serves the committed config.`);
        return;
      }
    } catch (error) {
      served = error instanceof Error ? error.message : String(error);
    }
    console.log(`… attempt ${attempt}/${DEPLOY_VERIFY_ATTEMPTS}: served ${served}`);
    await new Promise((done) => setTimeout(done, DEPLOY_VERIFY_DELAY_MS));
  }
  console.error(`✗ ${url} still serves ${served}, expected ${want}`);
  process.exit(1);
}

void main();
