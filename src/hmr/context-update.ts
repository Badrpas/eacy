import { mapValues, difference, pick, isEqual } from 'lodash';
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
type TAddVariant = IEntity | System;
type TEngineAddResults = Array<TAddVariant | Promise<TAddVariant>>;
interface IResultsMap {
  [key: string]: TEngineAddResults
}
interface IResultsAsyncMap {
  [key: string]: Promise<TEngineAddResults>
}
type TCacheData = {
  moduleData: IModuleData
  addResults: IResultsMap
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

export const asArray = (x: any): Array<any> => x instanceof Array ? x : [x];

export function getModuleList (context: RequireContext): Array<string> {
  return context.keys().filter(key => {
    if (!isViablePath(key)) return false;

    try {
      const m = context(key);
      return !(IGNORE_KEY in m)
        && !Object.values(m).some(x => x === IGNORE_MARK);
    } catch (err) {
      console.warn('Error while loading ' + key);
      console.warn(err);
      return false;
    }
  });
}

export const createContextUpdateHandler = ({ removeOld }: TOptions) => {
  let lastModules: Array<string> = [];
  const cache = new Map<TPath, TCacheData>();

  const loadModule = async (engine: Engine, context: RequireContext, path: TPath) => {
    const module = context(path);
    const moduleData = pick(module, 'default');

    if (cleanModule(removeOld, engine, path, moduleData)) {
      return; // module didn't change
    }

    const addResultsAsync: IResultsAsyncMap = mapValues(moduleData, async (rawData): Promise<Array<Promise<TAddVariant>>> => {
      return asArray(await rawData)
              .map(async data => {
                return engine.add(await data);
              });
    });

    const addResults = await Promise.all(
      Object
        .entries(addResultsAsync)
        .map(async ([key, promisedValue]) => {
          return [key, await promisedValue];
        })
    ).then(pairs => Promise.all(pairs.map(async ([key, promises]) => {
      // @ts-ignore
      return [key, await Promise.all(promises)];
    }))).then(Object.fromEntries);

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

      if (isEqual(oldModuleData, moduleData)) {
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