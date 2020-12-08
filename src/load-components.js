import { maxSatisfying } from 'es-semver';

const CDN_HOST = 'https://components.clever-cloud.com';
const ONE_YEAR = 365 * 24 * 60 * 60;

const MAGIC_MODE_NAME = 'magic-mode';
const MAGIC_MODE_VALUE = 'dont-use-this-in-prod';

export async function handleLoadRequest ({ getQueryParam, getJson, sendResponse }) {

  const versionsList = await getJson(`versions-list.json`, CDN_HOST);
  if (versionsList == null) {
    return sendResponse({ body: '', status: 500 });
  }

  const version = getVersion(versionsList, getQueryParam('version'));

  const depsManifest = await getJson(`deps-manifest-${version.resolved}.json`, CDN_HOST);
  if (depsManifest == null) {
    return sendResponse({ body: '', status: 500 });
  }

  const translation = getTranslation(depsManifest, getQueryParam('lang'));

  if (getQueryParam(MAGIC_MODE_NAME) === MAGIC_MODE_VALUE) {
    const magicModeResponse = getMagicModeResponse(version.resolved, translation.lang);
    return sendResponse(magicModeResponse);
  }

  const files = getFiles(depsManifest, getQueryParam('components'));
  const response = getResponse(version, translation, files);

  return sendResponse(response);
}

// Resolve latest possible version from versions list
export function getVersion (versionsList, requestedVersion) {
  // This code allows all the possible semver specifiers
  // We'll only test and document the short and simple use cases
  const resolvedVersion = maxSatisfying(versionsList, requestedVersion || '*');
  return {
    requested: requestedVersion,
    resolved: resolvedVersion,
  };
}

// Resolve translation file for given lang (defaults to "en")
export function getTranslation (depsManifest, lang) {
  if (lang == null) {
    return getTranslation(depsManifest, 'en');
  }
  // Is there a translation file for this lang?
  const file = depsManifest.files.find(({ id }) => {
    return id === `translations.${lang}`;
  });
  return (file == null)
    ? { lang: null, file: null }
    : { lang, file };
}

// Resolve paths to load from list of component IDs (coma separated string)
// If the i18n file is needed, its path is provided on `i18nPath` but won't be part of the list of `paths`
// This funciton also lists the unknown IDs
export function getFiles (depsManifest, components) {

  const componentIds = (typeof components === 'string')
    ? components.split(',')
    : [];

  const resolvedFiles = componentIds
    .map((componentId) => depsManifest.files.find(({ id }) => id === componentId))
    .filter((component) => component != null);

  // Files can have common dependencies so this list can contain duplicates
  const pathsWithDuplicates = resolvedFiles.flatMap((f) => [...f.dependencies, f.path]);
  const paths = Array.from(new Set(pathsWithDuplicates));

  const i18nFile = depsManifest.files.find(({ id }) => id === 'i18n');
  const needsI18n = paths.some((filepath) => filepath === i18nFile.path);
  const i18nPath = needsI18n ? i18nFile.path : null;

  const pathsWithoutI18n = paths.filter((p) => p !== i18nPath);

  const unknownIds = componentIds
    .map((componentId) => {
      const isComponentIdListed = depsManifest.files.some(({ id }) => id === componentId);
      return isComponentIdListed ? null : componentId;
    })
    .filter((componentId) => componentId != null);

  return { paths: pathsWithoutI18n, i18nPath, unknownIds };
}

const HEADERS_JS_CORS_NOCACHE = {
  'content-type': 'application/javascript',
  'access-control-allow-origin': '*',
  'cache-control': 'public,max-age=0',
};

const HEADERS_JS_CORS_ONEYEARCACHE = {
  'content-type': 'application/javascript',
  'access-control-allow-origin': '*',
  'cache-control': `public,max-age=${ONE_YEAR}`,
};

export function getResponse (version, translation, files) {

  if (version.resolved == null) {
    return {
      status: 400,
      body: getBody([
        `console.warn('Unknown version');`,
      ]),
      headers: HEADERS_JS_CORS_NOCACHE,
    };
  }

  const versionComment = `// VERSION: ${version.resolved}`;

  if (translation.lang == null) {
    return {
      status: 400,
      body: getBody([
        versionComment,
        `console.warn('Unknown lang');`,
      ]),
      headers: HEADERS_JS_CORS_NOCACHE,
    };
  }

  const headers = (version.requested === version.resolved)
    ? HEADERS_JS_CORS_ONEYEARCACHE
    : HEADERS_JS_CORS_NOCACHE;

  const langComment = `// LANG: ${translation.lang}`;
  const noComponentsWarning = (files.paths.length === 0)
    ? `console.warn('No components to load');`
    : '';

  const i18nStatements = getI18nStatements(translation, files);
  const loadStatements = getLoadStatements(files);

  const unknownIdsWarnings = (files.unknownIds.length > 0)
    ? `console.warn('Unknown components: ${files.unknownIds.join(', ')}');`
    : '';

  return {
    status: 200,
    body: getBody([
      versionComment,
      langComment,
      ...i18nStatements,
      ...loadStatements,
      noComponentsWarning,
      unknownIdsWarnings,
    ]),
    headers,
  };
}

function getBody (lines) {
  return lines
    .filter((a) => a !== '')
    .join('\n');
}

function getLoadStatements (files) {
  return files.paths.map((filepath) => {
    if (filepath.endsWith('.js')) {
      return `import('./${filepath}');`;
    }
    if (filepath.endsWith('.svg')) {
      return `(new Image()).src = new URL('./${filepath}', import.meta.url);`;
    }
    return '';
  });
}

function getI18nStatements (translation, files) {

  if (files.i18nPath == null || translation.file == null) {
    return [];
  }

  const i18nImport = `import { addTranslations, setLanguage } from './${files.i18nPath}';`;

  const translationDependencyImports = translation.file.dependencies.map((filepath) => {
    return `import './${filepath}';`;
  });

  const translationImport = `import { lang, translations } from './${translation.file.path}';`;

  return [
    i18nImport,
    ...translationDependencyImports,
    translationImport,
    `addTranslations(lang, translations);`,
    `setLanguage(lang);`,
  ];
}

// NOTE: Right now we filter by "cc-" prefix
export function getMagicModeResponse (version, lang) {

  const body = `

// MAGIC MODE (don't use this in production)
// Components will be loaded automatically on load and on DOM mutations
function loadComponents(nodes) {
  
  const componentNameList = nodes
    .filter(({ tagName }) => tagName != null)
    .map(({ tagName }) => tagName.toLowerCase())
    .filter((tagName) => tagName.startsWith('cc-'))
    .join(',');
  
  if (componentNameList !== '') {
    const importUrl = new URL('./load.js', import.meta.url);
    importUrl.searchParams.set('version', '${version}');
    importUrl.searchParams.set('lang', '${lang}');
    importUrl.searchParams.set('components', componentNameList);
    import(importUrl);
  }
}

const root = document.querySelector('html');
const observer = new MutationObserver((mutationsList) => {
  const nodes = mutationsList
    .filter(({ type }) => type === 'childList')
    .flatMap(({ addedNodes }) => Array.from(addedNodes));
  loadComponents(nodes);
});
  
observer.observe(root, { subtree: true, childList: true });
const allNodes = Array.from(document.querySelectorAll('*'));
loadComponents(allNodes);
  
  `;

  return {
    status: 200,
    body: body.trim(),
    headers: HEADERS_JS_CORS_NOCACHE,
  };
}
