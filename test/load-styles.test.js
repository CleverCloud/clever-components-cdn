import { expect } from '@esm-bundle/chai';
import { depsManifest as depsManifest_800 } from './fixtures/deps-manifest-8.0.0.js';
import { depsManifest as depsManifest_900 } from './fixtures/deps-manifest-9.0.0.js';
import { depsManifest as depsManifest_multiple } from './fixtures/deps-manifest-9.0.0-multiple.js';
import { versionsList } from './fixtures/versions-list.js';
import { loadStyles } from '../src/load-styles.js';
import { dedent } from '../src/dedent.js';
import { assertResponse, expectLines } from './lib/test-utils.js';

const CSS = 'text/css';
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
  if (pathname === 'assets/default-theme-1c68a163.css') {
    return ':host { --some-color: red }';
  }
}

async function testLoadStyles (version, getFile = getFileMock) {

  const url = new URL('/styles.css', 'http://example.com');

  if (version != null) {
    url.searchParams.set('version', version);
  }

  const request = new Request(url.toString());
  const response = await loadStyles(request, getFile);

  return response;
}

describe('loadStyles()', () => {

  describe('version', () => {

    it('default to latest semver (if not specified)', async () => {
      const response = await testLoadStyles(null);
      assertResponse(response, 200, CSS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal('/* VERSION: 9.0.0 */');
    });

    it('resolve major semver', async () => {
      const response = await testLoadStyles('6');
      assertResponse(response, 200, CSS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal('/* VERSION: 6.10.0 */');
    });

    it('resolve minor semver', async () => {
      const response = await testLoadStyles('6.7');
      assertResponse(response, 200, CSS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal('/* VERSION: 6.7.2 */');
    });

    it('exact semver', async () => {
      const response = await testLoadStyles('7.2.1');
      assertResponse(response, 200, CSS, MAX_AGE_ONE_YEAR);
      expectLines(response.body, 0, 1).to.equal('/* VERSION: 7.2.1 */');
    });

    it('error 404 if version cannot be found', async () => {
      const response = await testLoadStyles('1.50.50');
      assertResponse(response, 404, CSS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal(`/* Unknown version */`);
    });

    it('error 404 if version is lower than first one supported by the smart CDN', async () => {
      const response = await testLoadStyles('3.0.0');
      assertResponse(response, 404, CSS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal(`/* This version is too old to be available on the CDN /*`);
    });

    it('error 404 if version does not support styles', async () => {
      const response = await testLoadStyles('8.0.0');
      assertResponse(response, 404, CSS, MAX_AGE_ZERO);
      expectLines(response.body, 0, 1).to.equal(`/* No styles to load for this version /*`);
    });
  });

  describe('styles', () => {

    it('with just one style', async () => {
      const response = await testLoadStyles('9.0.0');
      assertResponse(response, 200, CSS, MAX_AGE_ONE_YEAR);
      expect(response.body).to.equal(dedent`
        /* VERSION: 9.0.0 */
        :host { --some-color: red }
      `);
    });

    it('with multiple styles', async () => {
      const response = await testLoadStyles('9.0.0', (pathname) => {
        if (pathname.match('deps-manifest-9.0.0.json')) {
          return depsManifest_multiple;
        }
        if (pathname === 'assets/awesome-theme-22c9efe8.css') {
          return ':host { --some-color: green }';
        }
        return getFileMock(pathname);
      });
      assertResponse(response, 200, CSS, MAX_AGE_ONE_YEAR);
      expect(response.body).to.equal(dedent`
        /* VERSION: 9.0.0 */
        :host { --some-color: red }
        :host { --some-color: green }
      `);
    });
  });

  describe('general errors', () => {

    it('error 500 if versions-list.json cannot be retrieved', async () => {
      const response = await testLoadStyles('9.0.0', (pathname) => {
        if (pathname === 'versions-list.json') {
          return null;
        }
      });
      expect(response.status).to.equal(500);
      expect(response.body).to.equal('');
    });

    it('error 500 if deps-manifest-x.y.z.json cannot be retrieved', async () => {
      const response = await testLoadStyles('9.0.0', (pathname) => {
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
