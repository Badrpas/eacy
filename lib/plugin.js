const PLUGIN_NAME = 'EacyPlugin';
const webpack = require('webpack');

class EacyPlugin {
  apply(compiler) {
    const definePlugin = new webpack.DefinePlugin({
      'setupContentPath': `import('./data-importer').then(x => x.initData(engine));`
    });
    definePlugin.apply(compiler);


    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
      console.log('qwe');
      compilation.hooks.buildModule.tap(PLUGIN_NAME,
        module => {
          console.log(module.resource);
          // debugger;
        }
      );

    });
  }
}

function setupDep(compiler) {
  const Dependency = require('webpack/lib/Dependency');

  class MyDependency extends Dependency {
    // Use the constructor to save any information you need for later
    constructor(module) {
      super();
      this.module = module;
    }
  }

  MyDependency.Template = class MyDependencyTemplate {
    apply(dep, source) {
      console.log('');
      // dep is the MyDependency instance, so the module is dep.module
      source.insert(0, 'console.log("Hello, plugin world!");');
    }
  };

  compiler.hooks.compilation.tap(
    PLUGIN_NAME,
    (compilation, { normalModuleFactory }) => {
      compilation.dependencyTemplates.set(MyDependency, new MyDependency.Template());
      compilation.hooks.buildModule.tap(PLUGIN_NAME, module => {
        module.addDependency(new MyDependency(module));
      });
    });

}

module.exports = EacyPlugin;


function green(str) {
  return "\u001b[1m\u001b[32m" + str + "\u001b[39m\u001b[22m";
}