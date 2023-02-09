import { getBody, getHeaders, ONE_YEAR, resolveSemverVersion, resolveVersion } from './common.js';

export const REQUEST_PATH_CSS = '/styles.css';
const CSS = 'text/css';

/**
 * @param {Request} request
 * @param {Function} getFile
 * @param {String} cdnHost
 * @returns {Promise<Response>}
 */
export async function loadStyles (request, getFile, cdnHost) {

  const url = new URL(request.url);

  const manifest = await getFile('manifest.json', cdnHost);
  if (manifest == null) {
    console.error(`Cannot find manifest.json`);
    return { status: 500, body: '' };
  }

  const versionsList = manifest.entries.map((e) => e.name);
  console.log({ versionsList });

  const requestedVersion = url.searchParams.get('version');
  const version = manifest.semver
    ? resolveSemverVersion(versionsList, requestedVersion)
    : resolveVersion(versionsList, requestedVersion);

  if (version.resolved == null) {
    return {
      status: 404,
      body: '/* Unknown version */',
      headers: getHeaders({ type: CSS, maxAge: 0 }),
    };
  }

  const depsManifest = await getFile(`deps-manifest-${version.resolved}.json`, cdnHost);
  if (depsManifest == null) {
    console.error(`Cannot fetch deps-manifest-${version.resolved}.json`);
    return { status: 500, body: '' };
  }

  return getResponse(version, depsManifest, getFile, cdnHost);
}

export async function getResponse (version, depsManifest, getFile, cdnHost) {

  if (depsManifest.manifestVersion !== '2') {
    return {
      status: 404,
      body: '/* No styles to load for this version /*',
      headers: getHeaders({ type: CSS, maxAge: 0 }),
    };
  }

  const versionComment = `/* VERSION: ${version.resolved} */`;

  let stylesBlocks;
  try {
    stylesBlocks = await Promise.all(depsManifest.styles.map((s) => {
      return getFile(s.path, cdnHost);
    }));
  }
  catch (e) {
    return { status: 500, body: '' };
  }

  const headers = getHeaders({
    type: CSS,
    maxAge: (version.immutable && version.requested === version.resolved) ? ONE_YEAR : 0,
  });

  return {
    status: 200,
    body: getBody([
      versionComment,
      ...stylesBlocks,
    ]),
    headers,
  };
}
