# راه‌بندون: 3D look prototype

Procedural, real-dimension models of Iranian vehicles (Peykan, Pride, Peugeot 405, Samand taxi, Zamyad pickup, Tehran BRT bus) in three.js, plus a gameplay mock scene.

- `cars.js`: the parametric car builder (swept body and cabin, glass and trim classification, decals stuck on by raycast, Iranian plates)
- `env.js`: the outdoor reflection environment
- `showroom.html?view=lineup|peykan|pride|p405|samand|zamyad|bus`: a turntable render of the lineup or of one car
- `index.html`: the gameplay mock screen

To run it, put `three@0.169.0` in `node_modules/` and a `vazir.woff2` (Vazirmatn) font next to the HTML, serve the folder over HTTP, and open the page. `snap.cjs` and `shot.cjs` render headless screenshots with Playwright.
