/**
 * Despite this is working solution, it has to change later on.
 */
const chalk = require('chalk');
const HMR_IDENTIFIER = /\/\/\s*setupContentPath (\w+) ([\w.\/-]+)(?:\s*([\w.]+))?$/;

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

const unknownType = type => `
  console.warn('Unknown type: ${type}. No removal code specified');
  function removeOld () {}`;

module.exports = async function (source) {
  return source.replace(new RegExp(HMR_IDENTIFIER, 'gm'), (match, type, path, engine) => {
    console.log(`${chalk.grey('[Eacy]')} Adding ${chalk.blueBright(type)} HMR for ${chalk.greenBright(path)}`);

    const removalCode = removes[type] ?? unknownType(type);
    const pathString = JSON.stringify(path);
    const engineIdentifier = engine || 'engine';

    return template(removalCode, pathString, engineIdentifier);
  });
};
