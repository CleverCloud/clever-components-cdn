import { CDN_HOST, getBody, getHeaders, getVersion, ONE_YEAR } from './common.js';

export const REQUEST_PATH_CSS = '/styles.css';
const CSS = 'text/css';

/**
 * @param {Request} request
 * @param {Function} getFile
 * @returns {Promise<Response>}
 */
export async function loadStyles (request, getFile) {

  const url = new URL(request.url);

  const versionsList = await getFile(`versions-list.json`, CDN_HOST);
  if (versionsList == null) {
    console.error('Cannot fetch versions-list.json');
    return { status: 500, body: '' };
  }

  const version = getVersion(versionsList, url.searchParams.get('version'));
  if (version.resolved == null) {
    return {
      status: 404,
      body: '/* Unknown version */',
      headers: getHeaders({ type: CSS, maxAge: 0 }),
    };
  }
  if (!version.isAvailableOnCdn) {
    return {
      status: 404,
      body: `/* This version is too old to be available on the CDN /*`,
      headers: getHeaders({ type: CSS, maxAge: 0 }),
    };
  }

  const depsManifest = await getFile(`deps-manifest-${version.resolved}.json`, CDN_HOST);
  if (depsManifest == null) {
    console.error(`Cannot fetch deps-manifest-${version.resolved}.json`);
    return { status: 500, body: '' };
  }

  return getResponse(version, depsManifest, getFile);
}

export async function getResponse (version, depsManifest, getFile) {

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
      return getFile(s.path, CDN_HOST);
    }));
  }
  catch (e) {
    return { status: 500, body: '' };
  }

  const headers = getHeaders({
    type: CSS,
    maxAge: (version.requested === version.resolved) ? ONE_YEAR : 0,
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
