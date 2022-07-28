import { loadComponents, REQUEST_PATH_JS } from '../src/load-components.js';
import { getFile } from '../src/common.js';
import { loadStyles, REQUEST_PATH_CSS } from '../src/load-styles.js';

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

    if (url.pathname === REQUEST_PATH_CSS) {
      const response = await loadStyles(request, getFile);
      return createResponse(response);
    }

    return createResponse({ status: 404, body: '' });
  },
};
