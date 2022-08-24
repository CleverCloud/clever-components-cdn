import { expect } from '@esm-bundle/chai';

/**
 * @param {Response} response
 * @param {Number} expectedStatus
 * @param {String} expectedContentType
 * @param {String} expectedCacheControl
 */
export function assertResponse (response, expectedStatus, expectedContentType, expectedCacheControl) {
  expect(response.status).to.equal(expectedStatus);
  expect(response.headers['access-control-allow-origin']).to.equal('*');
  expect(response.headers['content-type']).to.equal(expectedContentType);
  expect(response.headers['cache-control']).to.equal(expectedCacheControl);
}

/**
 * @param {String} string
 * @param {Number} startIndex
 * @param {Number} endIndex
 * @returns {Chai.Assertion}
 */
export function expectLines (string, startIndex, endIndex) {
  return expect(string.split('\n').slice(startIndex, endIndex).join('\n'));
}
