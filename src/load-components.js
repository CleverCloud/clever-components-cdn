import { getBody, getHeaders, getVersion, ONE_YEAR } from './common.js';
import { dedent } from './dedent.js';

export const REQUEST_PATH_JS = '/load.js';
const JS = 'application/javascript';

const MAGIC_MODE_NAME = 'magic-mode';
const MAGIC_MODE_VALUE = 'dont-use-this-in-prod';

/**
 * @param {Request} request
 * @param {Function} getFile
 * @param {String} cdnHost
 * @returns {Promise<Response>}
 */
export async function loadComponents (request, getFile, cdnHost) {

  const url = new URL(request.url);

  const versionsList = await getFile(`versions-list.json`, cdnHost);
  if (versionsList == null) {
    console.error('Cannot find versions-list.json');
    return { status: 500, body: '' };
  }

  const version = getVersion(versionsList, url.searchParams.get('version'));
  if (version.resolved == null) {
    return {
      status: 404,
      body: `console.warn('Unknown version');`,
      headers: getHeaders({ type: JS, maxAge: 0 }),
    };
  }
  if (!version.isAvailableOnCdn) {
    return {
      status: 404,
      body: `console.warn('This version is too old to be available on the CDN');`,
      headers: getHeaders({ type: JS, maxAge: 0 }),
    };
  }

  const depsManifest = await getFile(`deps-manifest-${version.resolved}.json`, cdnHost);
  if (depsManifest == null) {
    console.error(`Cannot find deps-manifest-${version.resolved}.json`);
    return { status: 500, body: '' };
  }

  const translation = getTranslation(depsManifest, url.searchParams.get('lang'));

  if (url.searchParams.get(MAGIC_MODE_NAME) === MAGIC_MODE_VALUE) {
    return getMagicModeResponse(version.resolved, translation.lang);
  }

  const files = getFiles(depsManifest, url.searchParams.get('components'));

  return getResponse(version, translation, files);
}

// Resolve translation file for given lang (defaults to "en")
function getTranslation (depsManifest, lang) {
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
// This function also lists the unknown IDs
function getFiles (depsManifest, components) {

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

function getResponse (version, translation, files) {

  const versionComment = `// VERSION: ${version.resolved}`;

  if (translation.lang == null) {
    return {
      status: 404,
      body: getBody([
        versionComment,
        `console.warn('Unknown lang');`,
      ]),
      headers: getHeaders({ type: JS, maxAge: 0 }),
    };
  }

  const maxAge = (version.requested === version.resolved) ? ONE_YEAR : 0;
  const headers = getHeaders({ type: JS, maxAge });

  const langComment = `// LANG: ${translation.lang}`;
  const noComponentsWarning = (files.paths.length === 0 && files.unknownIds.length === 0)
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
function getMagicModeResponse (version, lang) {

  const body = dedent`
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
    body,
    headers: getHeaders({ type: JS, maxAge: 0 }),
  };
}
