import Hapi from '@hapi/hapi';
import { loadComponents, REQUEST_PATH_JS } from './load-components.js';
import { loadStyles, REQUEST_PATH_CSS } from './load-styles.js';
import { getFile } from './common.js';

const {
  PORT = 8080,
  CDN_HOST,
} = process.env;

/**
 * @param {Object} hapiRequest
 * @param {String} hapiRequest.path
 * @param {Object} hapiRequest.query
 * @param {String} hapiRequest.method
 * @param {Object} hapiRequest.headers
 * @param {string} serverUri
 * @returns {Request}
 */
function createRequestFromHapi (hapiRequest, serverUri) {
  const url = new URL(hapiRequest.path, serverUri);
  for (const [name, value] of Object.entries(hapiRequest.query)) {
    url.searchParams.set(name, value);
  }
  const request = new Request(url.toString(), {
    method: hapiRequest.method,
    headers: hapiRequest.headers,
  });
  return request;
}

/**
 * @param {Response} response
 * @param {Object} h - the Hapi.js response helper
 * @returns {*} a Hapi.js response object
 */
function createHapiResponse (response, h) {

  const hapiResponse = h
    .response(response.body)
    .code(response.status);

  for (const [name, value] of Object.entries(response.headers ?? {})) {
    hapiResponse.header(name, value);
  }

  return hapiResponse;
}

async function startServer () {

  const server = Hapi.server({
    port: PORT,
  });

  server.route({
    method: 'GET',
    path: REQUEST_PATH_JS,
    handler: async function (hapiRequest, h) {

      const request = createRequestFromHapi(hapiRequest, server.info.uri);
      const response = await loadComponents(request, getFile, CDN_HOST);
      const hapiResponse = createHapiResponse(response, h);

      return hapiResponse;
    },
  });

  server.route({
    method: 'GET',
    path: REQUEST_PATH_CSS,
    handler: async function (hapiRequest, h) {

      const request = createRequestFromHapi(hapiRequest, server.info.uri);
      const response = await loadStyles(request, getFile, CDN_HOST);
      const hapiResponse = createHapiResponse(response, h);

      return hapiResponse;
    },
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
}

function onError (err) {
  console.log(err);
  process.exit(1);
}

process.on('unhandledRejection', onError);
startServer().catch(onError);
