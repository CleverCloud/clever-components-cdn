# Clever Components smart CDN

Small endpoint to serve Clever Cloud components dynamicly.

## What is this project?

The Clever Components is a collection of Web Components made by Clever Cloud.

It's available as an [Node.js package](https://www.npmjs.com/package/@clevercloud/components).
User can npm install the package and import the modules they need in their own site/app.

It's also available via a dedicated smart CDN.
The idea is to provide users a single plug-and-play system, so they can load the components they need with just one script tag:

```html
<script type="module" src="https://components.clever-cloud.com/load.js?version=5&lang=fr&components=cc-toggle,cc-beta"></script>
```

More details and docs here: https://www.clever-cloud.com/doc/clever-components/?path=/docs/%F0%9F%93%8C-docs-how-to-load-components-via-smart-cdn--page

The most part of this smart CDN system consists of serving static JavaScript (as ES modules) and SVG files.
Those files are prepared by a specific Rollup build and published on cellar along with a JSON manifest (listing the dependencies).

This project is the dynamic entrypoint of the system.
It is what is executed behind https://components.clever-cloud.com/load.js.

When you load this dynamic script:

* it loads the JSON manifest corresponding to the version (using the `version` query string)
* it lists the files and their respective dependencies from the component IDs (listed in the `components` query string)
* it determines if the i18n is required
* it returns a JavaScript file containing the optional i18n system setup + a list of JS dynamic imports and SVG image preloads.

Example with this script tag:

```html
<script  type="module" src="https://components.clever-cloud.com/load.js?version=5&lang=fr&components=cc-toggle,cc-input-text"></script>
```

you get this:

```js
// VERSION: 5.3.1
// LANG: fr
import { addTranslations, setLanguage } from './i18n-446ebe81.js';
import './i18n-sanitize-84b9c15f.js';
import { lang, translations } from './translations.fr-6a82b1c2.js';
addTranslations(lang, translations);
setLanguage(lang);
import('./vendor-84c6bff5.js');
import('./repeat-852dfa4d.js');
import('./cc-toggle-91ff39e1.js');
(new Image()).src = new URL('./assets/clipboard-bf8d5491.svg', import.meta.url);
(new Image()).src = new URL('./assets/eye-closed-390597cc.svg', import.meta.url);
(new Image()).src = new URL('./assets/eye-open-d3ed151c.svg', import.meta.url);
(new Image()).src = new URL('./assets/tick-a5247ce9.svg', import.meta.url);
import('./cc-input-text-cd7e2c5d.js');
```
