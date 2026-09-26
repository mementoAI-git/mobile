import { describe, expect, test } from 'bun:test';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { installStoreKitConfiguration } = require('../../../plugins/with-storekit-config');

const MONTHLY_SKU = 'io.mymemento.app.pro.monthly';
const ANNUAL_SKU = 'io.mymemento.app.pro.annual';

describe('local StoreKit catalog', () => {
  test('contains the production subscription identifiers and periods', () => {
    const catalog = JSON.parse(readFileSync('storekit/Memento.storekit', 'utf8')) as {
      subscriptionGroups: Array<{
        subscriptions: Array<{
          productID: string;
          recurringSubscriptionPeriod: string;
          type: string;
        }>;
      }>;
    };

    const subscriptions = catalog.subscriptionGroups.flatMap(
      (group) => group.subscriptions,
    );

    expect(subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productID: MONTHLY_SKU,
          recurringSubscriptionPeriod: 'P1M',
          type: 'RecurringSubscription',
        }),
        expect.objectContaining({
          productID: ANNUAL_SKU,
          recurringSubscriptionPeriod: 'P1Y',
          type: 'RecurringSubscription',
        }),
      ]),
    );
  });

  test('is installed into the generated iOS project by a config plugin', () => {
    const appConfig = JSON.parse(readFileSync('app.json', 'utf8')) as {
      expo: { plugins: Array<string | unknown[]> };
    };
    expect(appConfig.expo.plugins).toContain('./plugins/with-storekit-config');

    const projectRoot = mkdtempSync(join(tmpdir(), 'memento-storekit-test-'));
    const platformRoot = join(projectRoot, 'ios');
    const schemeDirectory = join(
      platformRoot,
      'Memento.xcodeproj',
      'xcshareddata',
      'xcschemes',
    );
    const schemePath = join(schemeDirectory, 'Memento.xcscheme');

    try {
      mkdirSync(join(projectRoot, 'storekit'), { recursive: true });
      mkdirSync(schemeDirectory, { recursive: true });
      copyFileSync(
        'storekit/Memento.storekit',
        join(projectRoot, 'storekit', 'Memento.storekit'),
      );
      writeFileSync(
        schemePath,
        '<Scheme><LaunchAction>\n' +
          '  <StoreKitConfigurationFileReference identifier = "../../../Old.storekit">\n' +
          '  </StoreKitConfigurationFileReference>\n' +
          '</LaunchAction></Scheme>',
      );

      installStoreKitConfiguration(projectRoot, platformRoot, 'Memento');
      installStoreKitConfiguration(projectRoot, platformRoot, 'Memento');

      const scheme = readFileSync(schemePath, 'utf8');
      expect(existsSync(join(platformRoot, 'Memento.storekit'))).toBe(true);
      expect(scheme).toContain('<StoreKitConfigurationFileReference');
      expect(scheme).toContain('identifier = "../Memento.storekit"');
      expect(scheme.match(/StoreKitConfigurationFileReference/g)).toHaveLength(2);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
