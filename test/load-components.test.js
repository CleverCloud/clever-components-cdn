import { loadComponents } from '../src/load-components.js';
import { expect } from '@esm-bundle/chai';
import { versionsList } from './fixtures/versions-list.js';
import { depsManifest as depsManifest_800 } from './fixtures/deps-manifest-8.0.0.js';
import { depsManifest as depsManifest_900 } from './fixtures/deps-manifest-9.0.0.js';
import { dedent } from '../src/dedent.js';
import { assertResponse, expectLines } from './lib/test-utils.js';

const JS = 'application/javascript';
const MAX_AGE_ZERO = 'public,max-age=0';
const MAX_AGE_ONE_YEAR = 'public,max-age=31536000';

async function getFileMock (pathname, host) {
  if (pathname === 'versions-list.json') {
    return versionsList;
  }
  if (pathname.match('deps-manifest-8.0.0.json')) {
    return depsManifest_800;
  }
  if (pathname.match(/^deps-manifest-.*\.json$/)) {
    return depsManifest_900;
  }
}

async function testLoadComponents (version, lang, components, getFile = getFileMock) {

  const url = new URL('/load.js', 'http://example.com');

  if (version != null) {
    url.searchParams.set('version', version);
  }
  if (lang != null) {
    url.searchParams.set('lang', lang);
  }
  if (components != null) {
    url.searchParams.set('components', components);
  }

  const request = new Request(url.toString());
  const response = await loadComponents(request, getFile);

  return response;
}

describe('loadComponents()', () => {

  describe('version', () => {

    it('default to latest semver (if not specified)', async () => {
      const response = await testLoadComponents(null, 'en', 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal('// VERSION: 9.0.0');
    });

    it('resolve major semver', async () => {
      const response = await testLoadComponents('6', 'en', 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal('// VERSION: 6.10.0');
    });

    it('resolve minor semver', async () => {
      const response = await testLoadComponents('6.7', 'en', 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal('// VERSION: 6.7.2');
    });

    it('exact semver', async () => {
      const response = await testLoadComponents('7.2.1', 'en', 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 0, 1).to.equal('// VERSION: 7.2.1');
    });

    it('error 404 if version cannot be found', async () => {
      const response = await testLoadComponents('1.50.50', 'en', 'cc-toggle');
      assertResponse(response, 404, JS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal(`console.warn('Unknown version');`);
    });

    it('error 404 if version is lower than first one supported by the smart CDN', async () => {
      const response = await testLoadComponents('3.0.0', 'en', 'cc-toggle');
      assertResponse(response, 404, JS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal(`console.warn('This version is too old to be available on the CDN');`);
    });
  });

  describe('lang', () => {

    it('default to english (if not specified)', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 1, 2).to.equal(`// LANG: en`);
    });

    it('english', async () => {
      const response = await testLoadComponents('9.0.0', 'en', 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 1, 2).to.equal(`// LANG: en`);
    });

    it('french', async () => {
      const response = await testLoadComponents('9.0.0', 'fr', 'cc-toggle');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 1, 2).to.equal(`// LANG: fr`);
    });

    it('error 404 if lang cannot be found', async () => {
      const response = await testLoadComponents('9.0.0', 'es', 'cc-toggle');
      assertResponse(response, 404, JS, MAX_AGE_ZERO);
      expect(response.body).to.equal(dedent`
        // VERSION: 9.0.0
        console.warn('Unknown lang');
      `);
    });
  });

  describe('components', () => {

    it('empty list and no i18n (if nothing is specified)', async () => {
      const response = await testLoadComponents('9.0.0', null, null);
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(`console.warn('No components to load');`);
    });

    it('single component no deps and no i18n', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-flex-gap');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(`import('./cc-flex-gap-4e6ab5ba.js');`);
    });

    it('simple component with deps and no i18n', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-img');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
        import('./vendor-a9a067b7.js');
        import('./cc-img-c9dc7fc8.js');
      `);
    });

    it('simple component with deps and i18n (v9.0.0)', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-zone');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
        import { addTranslations, setLanguage } from './i18n-c01b14e6.js';
        import './i18n-string-245486dd.js';
        import { lang, translations } from './translations.en-3abf14d8.js';
        addTranslations(lang, translations);
        setLanguage(lang);
        import('./cc-flex-gap-4e6ab5ba.js');
        import('./vendor-a9a067b7.js');
        import('./cc-img-c9dc7fc8.js');
        import('./cc-zone-5b0bb9fe.js');
      `);
    });

    it('simple component with deps and i18n (v8.0.0)', async () => {
      const response = await testLoadComponents('8.0.0', null, 'cc-zone');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
        import { addTranslations, setLanguage } from './i18n-446ebe81.js';
        import './i18n-string-245486dd.js';
        import { lang, translations } from './translations.en-e0aa3e77.js';
        addTranslations(lang, translations);
        setLanguage(lang);
        import('./cc-flex-gap-4e6ab5ba.js');
        import('./vendor-1830b857.js');
        import('./cc-img-51c80eb9.js');
        import('./default-theme-d5149511.js');
        import('./cc-zone-da6c7089.js');
      `);
    });

    it('multiple components with common deps and no i18n', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-toggle,cc-img');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
        import('./vendor-a9a067b7.js');
        import('./repeat-7aa4e4a8.js');
        import('./cc-toggle-b14fd703.js');
        import('./cc-img-c9dc7fc8.js');
      `);
    });

    it('multiple components with common deps and i18n', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-toggle,cc-zone');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
        import { addTranslations, setLanguage } from './i18n-c01b14e6.js';
        import './i18n-string-245486dd.js';
        import { lang, translations } from './translations.en-3abf14d8.js';
        addTranslations(lang, translations);
        setLanguage(lang);
        import('./vendor-a9a067b7.js');
        import('./repeat-7aa4e4a8.js');
        import('./cc-toggle-b14fd703.js');
        import('./cc-flex-gap-4e6ab5ba.js');
        import('./cc-img-c9dc7fc8.js');
        import('./cc-zone-5b0bb9fe.js');
      `);
    });

    it('warning if some unknown components', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-toggle,cc-img,cc-foo,cc-bar');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
        import('./vendor-a9a067b7.js');
        import('./repeat-7aa4e4a8.js');
        import('./cc-toggle-b14fd703.js');
        import('./cc-img-c9dc7fc8.js');
        console.warn('Unknown components: cc-foo, cc-bar');
      `);
    });

    it('warning if all unknown components', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-foo,cc-bar');
      assertResponse(response, 200, JS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 2).to.equal(dedent`
      console.warn('Unknown components: cc-foo, cc-bar');
    `);
    });
  });

  describe('magic mode', () => {

    it('default', async () => {

      const url = new URL('/load.js', 'http://example.com');
      url.searchParams.set('magic-mode', 'dont-use-this-in-prod');
      const request = new Request(url.toString());

      const response = await loadComponents(request, getFileMock);

      assertResponse(response, 200, JS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal(`// MAGIC MODE (don't use this in production)`);
    });
  });

  describe('general errors', () => {

    it('error 500 if versions-list.json cannot be retrieved', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-toggle', (pathname) => {
        if (pathname === 'versions-list.json') {
          return null;
        }
      });
      expect(response.status).to.equal(500);
      expect(response.body).to.equal('');
    });

    it('error 500 if deps-manifest-x.y.z.json cannot be retrieved', async () => {
      const response = await testLoadComponents('9.0.0', null, 'cc-toggle', (pathname) => {
        if (pathname === 'deps-manifest-9.0.0.json') {
          return null;
        }
        return getFileMock(pathname);
      });
      expect(response.status).to.equal(500);
      expect(response.body).to.equal('');
    });
  });
});
