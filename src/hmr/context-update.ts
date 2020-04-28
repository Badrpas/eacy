import { mapValues } from 'lodash';
import { difference } from 'lodash';
import { Engine, System, IEntity } from 'eaciest';


const IGNORE_KEY = '__ignore__';
export const IGNORE_MARK = Symbol.for('Eacy ignore file mark');

interface IModuleData {
  [IGNORE_KEY]?: any
  [key: string]: any
}
interface RequireContext {
  keys(): string[];
  (id: string): any;
  <T>(id: string): T;
  resolve(id: string): string;
  /** The module id of the context module. This may be useful for module.hot.accept. */
  id: string;
}
type TPath = string;
type IEngineAddResults = Array<IEntity | System>;
interface TResultsMap {
  [key: string]: IEngineAddResults
}
type TCacheData = {
  moduleData: IModuleData
  addResults: TResultsMap
};
export type TRemoveOldFn = (old: any, engine: Engine) => any;
export type TOptions = {
  removeOld: TRemoveOldFn
};


const REGISTERED_RE = [
  /\.js$/,
  /\.ts$/
];

function isViablePath (path = '') {
  return REGISTERED_RE.some(re => path.match(re));
}

export function getModuleList (context: RequireContext): Array<string> {
  return context.keys().filter(key => {
    if (!isViablePath(key)) return false;

    const m = context(key);
    return !(IGNORE_KEY in m)
    //TODO enable it later
    // && !Object.values(m).some(x => x === IGNORE_MARK);
  });
}

export const asArray = (x: any) => x instanceof Array ? x : [x];

export const createContextUpdateHandler = ({ removeOld }: TOptions) => {
  let lastModules: Array<string> = [];
  const cache = new Map<TPath, TCacheData>();

  const loadModule = (engine: Engine, context: RequireContext, path: TPath) => {
    const moduleData = context(path);

    if (cleanModule(removeOld, engine, path, moduleData)) {
      return; // module didn't change
    }

    const addResults: TResultsMap = mapValues(moduleData, (rawData) => {
      return asArray(rawData).map(data => engine.add(data));
    });

    cache.set(path, {
      moduleData,
      addResults
    });
  };

  function cleanModule (removeOld: TRemoveOldFn, engine: Engine, path: TPath, moduleData?: any) {
    const cached = cache.get(path);

    if (cached) {
      const {
        moduleData: oldModuleData,
        addResults: oldAddResults,
      } = cached;

      if (oldModuleData === moduleData) {
        return true;
      }

      for (const list of Object.values(oldAddResults)) {
        for (const old of list) {
          removeOld(old, engine);
        }
      }
    }
  }

  return function updateModules (engine: Engine, context: RequireContext) {
    const moduleList = getModuleList(context);

    for (const module of moduleList) {
      loadModule(engine, context, module);
    }

    const disbandedModules = difference(lastModules, moduleList);
    for (const path of disbandedModules) {
      cleanModule(removeOld, engine, path);
    }

    lastModules = moduleList;
  };
};