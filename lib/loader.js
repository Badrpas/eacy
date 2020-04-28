/**
 * Despite this is working solution, it has to change later on.
 */

const {parse} = require("acorn");
const DATA_IDENTIFIER = /\/\/\s*setupContentPath (\w+) ([\w.\/-]+)(?:\s*([\w.]+))?$/;
const IGNORE_MARK = `throw new Error('Eacy plugin is not enabled.')`;

const removes = {
  data  : `
    function removeOld (old, engine) {
      engine.removeEntity(old);
    }`,
  systems: `
    function removeOld (old, engine) {
      engine.removeSystem(old);
    }`,
};

const template = (remove, path, engine) => `
(() => { 
  import('eacy').then(({HMR}) => {
    const updateModules = HMR.createContextUpdateHandler({ removeOld });
    
    const context = require.context(${path}, true);
    updateModules(${engine}, context);
    
    if (module.hot) {
      module.hot.accept(context.id, () => {
        const context = require.context(${path}, true);
        updateModules(${engine}, context);
      });
    }
  });
  
  ${remove}
})();`;

module.exports = (source) => {
  return source.replace(new RegExp(DATA_IDENTIFIER, 'gm'), (match, type, path, engine) => {
    return template(removes[type], JSON.stringify(path), engine || 'engine');
  });
};