import { expect } from '@esm-bundle/chai';
import { getFiles, getResponse, getTranslation, getVersion } from '../src/load-components.js';
import { versionsList } from './fixtures/versions-list.js';
import { depsManifest } from './fixtures/deps-manifest-5.3.1.js';

describe('getVersion()', () => {

  it('default to latest semver if not specified', () => {
    const version = getVersion(versionsList, null);
    expect(version.requested).to.equal(null);
    expect(version.resolved).to.equal('5.3.1');
  });

  it('resolve major semver', () => {
    const version = getVersion(versionsList, '4');
    expect(version.requested).to.equal('4');
    expect(version.resolved).to.equal('4.1.2');
  });

  it('resolve minor semver', () => {
    const version = getVersion(versionsList, '2.0');
    expect(version.requested).to.equal('2.0');
    expect(version.resolved).to.equal('2.0.2');
  });

  it('accept specific version', () => {
    const version = getVersion(versionsList, '3.0.1');
    expect(version.requested).to.equal('3.0.1');
    expect(version.resolved).to.equal('3.0.1');
  });

  it('return null if version cannot be found', () => {
    const version = getVersion(versionsList, '1.50.50');
    expect(version.requested).to.equal('1.50.50');
    expect(version.resolved).to.equal(null);
  });
});

describe('getTranslation()', () => {

  it('default to "en" if not specified', () => {
    const translation = getTranslation(depsManifest, null);
    expect(translation.lang).to.equal('en');
    expect(translation.file.path).to.equal('translations.en-849f0ec3.js');
    expect(translation.file.dependencies).to.deep.equal(['i18n-sanitize-84b9c15f.js']);
  });

  it('accept existing lang', () => {
    const translation = getTranslation(depsManifest, 'fr');
    expect(translation.lang).to.equal('fr');
    expect(translation.file.path).to.equal('translations.fr-6a82b1c2.js');
    expect(translation.file.dependencies).to.deep.equal(['i18n-sanitize-84b9c15f.js']);
  });

  it('return null if lang cannot be found', () => {
    const translation = getTranslation(depsManifest, 'es');
    expect(translation.lang).to.equal(null);
    expect(translation.file).to.equal(null);
  });
});

describe('getFiles()', () => {

  it('return empty lists and no i18n if nothing specified', () => {
    const files = getFiles(depsManifest, null);
    expect(files.paths).to.deep.equal([]);
    expect(files.i18nPath).to.equal(null);
    expect(files.unknownIds).to.deep.equal([]);
  });

  it('accept simple component no deps and no i18n', () => {
    const files = getFiles(depsManifest, 'cc-flex-gap');
    expect(files.paths).to.deep.equal([
      'cc-flex-gap-5abc665d.js',
    ]);
    expect(files.i18nPath).to.equal(null);
    expect(files.unknownIds).to.deep.equal([]);
  });

  it('accept simple component with deps and no i18n', () => {
    const files = getFiles(depsManifest, 'cc-img');
    expect(files.paths).to.deep.equal([
      'vendor-84c6bff5.js',
      'cc-img-52a99a4e.js',
    ]);
    expect(files.i18nPath).to.equal(null);
    expect(files.unknownIds).to.deep.equal([]);
  });

  it('accept simple component with deps and i18n', () => {
    const files = getFiles(depsManifest, 'cc-zone');
    expect(files.paths).to.deep.equal([
      'vendor-84c6bff5.js',
      'cc-img-52a99a4e.js',
      'cc-flex-gap-5abc665d.js',
      'cc-zone-7e7464bd.js',
    ]);
    expect(files.i18nPath).to.equal('i18n-446ebe81.js');
    expect(files.unknownIds).to.deep.equal([]);
  });

  it('accept multiple existing components with common deps and no i18n', () => {
    const files = getFiles(depsManifest, 'cc-toggle,cc-img');
    expect(files.paths).to.deep.equal([
      'vendor-84c6bff5.js',
      'repeat-852dfa4d.js',
      'cc-toggle-91ff39e1.js',
      'cc-img-52a99a4e.js',
    ]);
    expect(files.i18nPath).to.equal(null);
    expect(files.unknownIds).to.deep.equal([]);
  });

  it('accept multiple existing components with common deps and i18n', () => {
    const files = getFiles(depsManifest, 'cc-toggle,cc-zone');
    expect(files.paths).to.deep.equal([
      'vendor-84c6bff5.js',
      'repeat-852dfa4d.js',
      'cc-toggle-91ff39e1.js',
      'cc-img-52a99a4e.js',
      'cc-flex-gap-5abc665d.js',
      'cc-zone-7e7464bd.js',
    ]);
    expect(files.i18nPath).to.equal('i18n-446ebe81.js');
    expect(files.unknownIds).to.deep.equal([]);
  });

  it('return unknownIds with component IDs that are not listed in the manifest', () => {
    const files = getFiles(depsManifest, 'cc-toggle,cc-img,cc-foo,cc-bar');
    expect(files.unknownIds).to.deep.equal([
      'cc-foo',
      'cc-bar',
    ]);
  });
});

describe('getResponse()', () => {

  const unknownVersion = { requested: '4.10.27', resolved: null };
  const version = { requested: '5.3.1', resolved: '5.3.1' };
  const versionSemver = { requested: '5', resolved: '5.3.1' };

  const unknownTranslation = { lang: null, file: null };
  const enTranslation = {
    lang: 'en',
    file: {
      'id': 'translations.en',
      'path': 'translations.en-849f0ec3.js',
      'dependencies': [
        'i18n-sanitize-84b9c15f.js',
      ],
      'sources': [
        'src/translations/translations.en.js',
      ],
    },
  };

  const emptyFiles = { paths: [], i18nPath: null, unknownIds: [] };

  it('unknown version', () => {
    const response = getResponse(unknownVersion, unknownTranslation, emptyFiles);
    expect(response.status).to.equal(400);
    expect(response.body).to.equal([
      `console.warn('Unknown version');`,
    ].join('\n'));
    expect(response.headers['cache-control']).to.include('max-age=0');
  });

  it('unknown lang', () => {
    const response = getResponse(version, unknownTranslation, emptyFiles);
    expect(response.status).to.equal(400);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `console.warn('Unknown lang');`,
    ].join('\n'));
    expect(response.headers['cache-control']).to.include('max-age=0');
  });

  it('no components', () => {
    const response = getResponse(version, enTranslation, emptyFiles);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `console.warn('No components to load');`,
    ].join('\n'));
    expect(response.headers['cache-control']).not.to.include('max-age=0');
  });

  it('simple component', () => {
    const files = {
      paths: [
        'vendor-00000000.js',
        'one-one-11111111.js',
      ],
      i18nPath: null,
      unknownIds: [],
    };
    const response = getResponse(version, enTranslation, files);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `import('./vendor-00000000.js');`,
      `import('./one-one-11111111.js');`,
    ].join('\n'));
    expect(response.headers['cache-control']).not.to.include('max-age=0');

  });

  it('simple component with i18n', () => {
    const files = {
      paths: [
        'vendor-00000000.js',
        'one-one-11111111.js',
      ],
      i18nPath: 'i18n-98765432.js',
      unknownIds: [],
    };
    const response = getResponse(version, enTranslation, files);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `import { addTranslations, setLanguage } from './i18n-98765432.js';`,
      `import './i18n-sanitize-84b9c15f.js';`,
      `import { lang, translations } from './translations.en-849f0ec3.js';`,
      `addTranslations(lang, translations);`,
      `setLanguage(lang);`,
      `import('./vendor-00000000.js');`,
      `import('./one-one-11111111.js');`,
    ].join('\n'));
    expect(response.headers['cache-control']).not.to.include('max-age=0');
  });

  it('simple component with i18n (semver => no cache)', () => {
    const files = {
      paths: [
        'vendor-00000000.js',
        'one-one-11111111.js',
      ],
      i18nPath: 'i18n-98765432.js',
      unknownIds: [],
    };
    const response = getResponse(versionSemver, enTranslation, files);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `import { addTranslations, setLanguage } from './i18n-98765432.js';`,
      `import './i18n-sanitize-84b9c15f.js';`,
      `import { lang, translations } from './translations.en-849f0ec3.js';`,
      `addTranslations(lang, translations);`,
      `setLanguage(lang);`,
      `import('./vendor-00000000.js');`,
      `import('./one-one-11111111.js');`,
    ].join('\n'));
    expect(response.headers['cache-control']).to.include('max-age=0');
  });

  it('multiple components with JS and SVG deps', () => {
    const files = {
      paths: [
        'vendor-00000000.js',
        'one-one-11111111.js',
        'foo-12345678.svg',
        'bar-abcdef01.svg',
        'two-two-22222222.js',
      ],
      unknownIds: [],
      i18nPath: null,
    };
    const response = getResponse(version, enTranslation, files);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `import('./vendor-00000000.js');`,
      `import('./one-one-11111111.js');`,
      `(new Image()).src = new URL('./foo-12345678.svg', import.meta.url);`,
      `(new Image()).src = new URL('./bar-abcdef01.svg', import.meta.url);`,
      `import('./two-two-22222222.js');`,
    ].join('\n'));
    expect(response.headers['cache-control']).not.to.include('max-age=0');
  });

  it('unknown components', () => {
    const files = {
      paths: [],
      unknownIds: ['cc-foo', 'cc-bar'],
      i18nPath: null,
    };
    const response = getResponse(version, enTranslation, files);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `console.warn('No components to load');`,
      `console.warn('Unknown components: cc-foo, cc-bar');`,
    ].join('\n'));
    expect(response.headers['cache-control']).not.to.include('max-age=0');
  });

  it('known AND unknown components', () => {
    const files = {
      paths: [
        'vendor-00000000.js',
        'one-one-11111111.js',
      ],
      unknownIds: ['cc-foo', 'cc-bar'],
      i18nPath: null,
    };
    const response = getResponse(version, enTranslation, files);
    expect(response.status).to.equal(200);
    expect(response.body).to.equal([
      `// VERSION: 5.3.1`,
      `// LANG: en`,
      `import('./vendor-00000000.js');`,
      `import('./one-one-11111111.js');`,
      `console.warn('Unknown components: cc-foo, cc-bar');`,
    ].join('\n'));
    expect(response.headers['cache-control']).not.to.include('max-age=0');
  });
});
