# Clever Components smart CDN

Small endpoint to serve Clever Cloud components dynamically.

## What is this project?

The Clever Components is a collection of Web Components made by Clever Cloud.

It's available as a [Node.js package](https://www.npmjs.com/package/@clevercloud/components).
User can npm install the package and import the modules they need in their own site/app.

It's also available via a dedicated smart CDN.
The idea is to provide users with a plug-and-play system, so they can load the components and the theme with a small snippet of code like this:

```html
<script type="module" src="https://components.clever-cloud.com/load.js?version=9&lang=fr&components=cc-toggle,cc-beta"></script>
<link rel="stylesheet" href="https://components.clever-cloud.com/styles.css?version=9">
```

The most important part of this smart CDN system is to serve static JavaScript files (as ES modules) along with CSS files and SVG files.
Those assets are prepared by a specific Rollup build and published on cellar along with a JSON manifest (listing the dependencies).

This project provides the two dynamic entrypoints of the system:

* One to load the scripts: `/load.js`.
* and another one to load the styles: `/styles.css`.

## How to use this smart CDN

You can find docs about usage of this smart CDN on the clever components' site: https://www.clever-cloud.com/doc/clever-components/?path=/docs/%F0%9F%93%8C-docs-how-to-load-components-via-smart-cdn--page
