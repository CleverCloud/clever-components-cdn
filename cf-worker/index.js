import { handleLoadRequest } from '../src/load-components.js';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest (request) {

  const url = new URL(request.url);

  return handleLoadRequest({

    getQueryParam (name) {
      return url.searchParams.get(name);
    },

    getJson (path, origin) {
      return fetch(new URL(path, origin))
        .then((r) => r.json())
        .catch((e) => {
          console.error(e);
          return null;
        });
    },

    sendResponse (response) {
      return new Response(response.body, {
        status: response.status,
        headers: new Headers(response.headers),
      });
    },
  });
}
