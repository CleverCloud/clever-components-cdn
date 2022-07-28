import { loadComponents, REQUEST_PATH_JS } from '../src/load-components.js';
import { getFile } from '../src/common.js';

function createResponse (rawResponse) {
  return new Response(rawResponse.body, {
    status: rawResponse.status,
    headers: rawResponse.headers,
  });
}

export default {
  async fetch (request) {

    const url = new URL(request.url);

    if (url.pathname === REQUEST_PATH_JS) {
      const response = await loadComponents(request, getFile);
      return createResponse(response);
    }

    return createResponse({ status: 404, body: '' });
  },
};
