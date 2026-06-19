const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase 10 ships separate CJS/ESM builds and a React Native-specific build.
// Metro can resolve @firebase/app to the ESM build (via firebase/app wrapper) and
// @firebase/app via CJS (from within the RN auth build), creating TWO separate
// module instances with separate component registries → "Component auth has not
// been registered yet".
//
// Fix: pin every @firebase/* import to a single CJS file so the registry is unified.
const firebaseAppCjs = path.resolve(
  __dirname,
  'node_modules/@firebase/app/dist/index.cjs.js'
);
const firebaseAuthRn = path.resolve(
  __dirname,
  'node_modules/@firebase/auth/dist/rn/index.js'
);


const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force the React Native auth build (has getReactNativePersistence)
  if (moduleName === '@firebase/auth') {
    return { filePath: firebaseAuthRn, type: 'sourceFile' };
  }
  // Force a single CJS instance of @firebase/app so both firebase/app (ESM wrapper)
  // and the RN auth build (CJS require) share the same component registry.
  if (moduleName === '@firebase/app') {
    return { filePath: firebaseAppCjs, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
