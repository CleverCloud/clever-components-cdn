# Clever Components smart CDN releases

This project is deployed as a [Cloudflare worker](https://workers.cloudflare.com/).

You need to install the `wrangler` command line to run the worker locally or to deploy it.
Follow the official documentation: https://developers.cloudflare.com/workers/wrangler/get-started/

## Deployment

### Development

Without any authorization, you should be able to run the worker in dev mode with this command:

```bash
# Don't forget to run this from the cf-worker directory
wrangler dev
```

### Staging

We have a staging environement to test changes before deploying the worker to production.

To deploy the to the stating environment, you will need to be authorized by an admin of the project.
Then you will need to authenticate with wrangler:

```bash
wrangler login
```

Once you're logged in, you can deploy to the staging environment with this command:

```bash
# Don't forget to run this from the cf-worker directory
wrangler publish --env staging
```

### Staging

We have a preview environement to publish WIP components and use them through the CDN before reaching production.

To deploy the to the preview environment, you will need to be authorized by an admin of the project.
Then you will need to authenticate with wrangler:

```bash
wrangler login
```

Once you're logged in, you can deploy to the preview environment with this command:

```bash
# Don't forget to run this from the cf-worker directory
wrangler publish --env preview
```

The preview is deployed to this URL: https://preview-components.clever-cloud.com/

### Production

Once you tested your worker on the staging environment, you can deploy it to production with this command:

```bash
# Don't forget to run this from the cf-worker directory
wrangler publish --env production
```

The production is deployed to this URL: https://components.clever-cloud.com/

## Configuration

Most of the configuration (environment variables or routes) are in the wrangler config file at `cf-worker/wrangler.toml`.
