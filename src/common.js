import { gte, maxSatisfying } from 'es-semver';

export const CDN_HOST = 'https://components.clever-cloud.com';
export const ONE_YEAR = 365 * 24 * 60 * 60;

// Before this version, the assets aren't available on the CDN
const MINIMUM_VERSION_AVAILABLE_ON_CDN = '5.3.1';

/**
 * @param {String} path
 * @param {String} origin
 * @returns {Promise<String|null>}
 */
export function getFile (path, origin) {
  return fetch(new URL(path, origin).toString())
    .then((r) => {
      if (r.status === 200) {
        if (r.headers.get('content-type') === 'application/json') {
          return r.json();
        }
        return r.text();
      }
    })
    .catch((e) => null);
}

// Resolve latest possible version from versions list
export function getVersion (versionsList, requestedVersion) {
  // This code allows all the possible semver specifiers
  // We'll only test and document the short and simple use cases
  const resolvedVersion = maxSatisfying(versionsList, requestedVersion || '*');
  const isAvailableOnCdn = (resolvedVersion != null)
    ? gte(resolvedVersion, MINIMUM_VERSION_AVAILABLE_ON_CDN)
    : false;
  return {
    requested: requestedVersion,
    resolved: resolvedVersion,
    isAvailableOnCdn,
  };
}

export function getHeaders ({ type, maxAge }) {
  return {
    'content-type': type,
    'access-control-allow-origin': '*',
    'cache-control': `public,max-age=${maxAge}`,
  };
}

export function getBody (lines) {
  return lines
    .filter((a) => a !== '')
    .join('\n');
}
