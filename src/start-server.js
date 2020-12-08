import Hapi from '@hapi/hapi';
import superagent from 'superagent';
import { handleLoadRequest } from './load-components.js';

const { PORT = 8080 } = process.env;

async function startServer () {

  const server = Hapi.server({
    port: PORT,
  });

  server.route({
    method: 'GET',
    path: '/load.js',
    handler: async function (request, h) {

      return handleLoadRequest({

        getQueryParam (name) {
          return request.query[name];
        },

        getJson (path, origin) {
          return superagent.get(new URL(path, origin))
            .then((r) => r.body)
            .catch((e) => {
              console.error(e);
              return null;
            });
        },

        sendResponse (response) {

          const hapiResponse = h
            .response(response.body)
            .code(response.status);

          for (const [name, value] of Object.entries(response.headers)) {
            hapiResponse.header(name, value);
          }

          return hapiResponse;
        },
      });
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
