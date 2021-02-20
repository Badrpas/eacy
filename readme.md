# Eacy

Helper package for [eaciest](https://github.com/badrpas/eaciest)

Currently, provides HMR support for systems and data.

#### Example usage:

Add `eacy` loader to webpack config:
```js
// webpack.config.js

module.exports = {
  module: {
    rules: [
      {
        // using specific filename here to limit the loader runs
        test: /hmr\.js$/,
        loader: 'eacy',
      }
    ]
  },
};
```

Define HMR setup function:
```js
// hmr.js

export const initHMR = (engine) => {
  // Following comments will be substituted with HMR code

  // setupContentPath systems ./systems engine
  // setupContentPath data ./data engine
}

```

The comments will result in import of all the systems placed under `./systems/**` path
and also all the data files from `./data/**` path.

Note the `engine` argument.
It has to be defined in the comments to generate proper HRM code.
It will be used for (un)registering all the systems and data entries.


After that create your system and data files:
```js
// systems/my-system.js

import { System } from 'eaciest';

export default class MySystem extends System {

  constructor () {
    super([
      'position',
      'velocity'
    ]);
  }


  update (dt) {
    for (const entity of this.getEntities()) {
      entity.position.x += entity.velocity.x * dt;
      entity.position.y += entity.velocity.y * dt;
    }
  }

}

```
```js
// data/player.js

const playerData = {
  position: { x: 100, y: 100 },
  velocity: { x: 0, y: 10 },
}

export default playerData;
```


Lastly, call the `initHMR` we defined earlier, with your `engine` instance.
This will load the system and the player data to your it.
Try changing them to see the changes being hot-reloaded.
