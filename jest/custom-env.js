'use strict';

// Custom test environment that polyfills jest-mock@29 to be compatible with jest-runtime@30.
// jest@30 requires moduleMocker.clearMocksOnScope(), which was added in jest-mock@30.
// jest-expo@55 pulls in jest-environment-node@29 (via react-native), causing a mismatch.

const ReactNativeEnv = require('../node_modules/react-native/jest/react-native-env.js');

class CompatibleReactNativeEnv extends ReactNativeEnv {
  constructor(config, context) {
    super(config, context);
    // Polyfill clearMocksOnScope if not present (jest-mock@29 → jest@30 compat)
    if (this.moduleMocker && typeof this.moduleMocker.clearMocksOnScope !== 'function') {
      this.moduleMocker.clearMocksOnScope = function (scope) {
        let keys;
        try {
          keys = Object.keys(scope);
        } catch (_) {
          return;
        }
        for (const key of keys) {
          let value;
          try {
            value = scope[key];
          } catch (_) {
            // Some scope properties are getters that may throw (e.g. lazy require)
            continue;
          }
          try {
            if (
              value != null &&
              (typeof value === 'object' || typeof value === 'function') &&
              '_isMockFunction' in value &&
              this.isMockFunction(value) &&
              typeof value.mockClear === 'function'
            ) {
              value.mockClear();
            }
          } catch (_) {
            // Skip any property that causes issues when inspected
          }
        }
      }.bind(this.moduleMocker);
    }
  }
}

module.exports = CompatibleReactNativeEnv;
