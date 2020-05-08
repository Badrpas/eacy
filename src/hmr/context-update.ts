import { mapValues, difference, pick, isEqual } from 'lodash';
import { Engine, System, IEntity } from 'eaciest';


const IGNORE_KEY = '__ignore__';
export const IGNORE_MARK = Symbol.for('Eacy ignore file mark');

export const IMPORTED_FROM = Symbol.for('File which produced this entity');
const CLEANUP_KEY = '__ON_CLEANUP';

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
type TAddVariant = IEntity | System | Array<IEntity | System>;
type TEngineAddResults = Array<TAddVariant | Promise<TAddVariant>>;
interface IResultsMap {
  [key: string]: TEngineAddResults
}
interface IResultsAsyncMap {
  [key: string]: Promise<TEngineAddResults>
}
type TCacheData = {
  moduleData: IModuleData
  addResults: IResultsMap,
  onCleanupFn?: Function
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

function getModuleList (context: RequireContext): { accepted: Array<string>, errored: Array<string> } {
  const errored: Array<string> = [];
  const accepted = context.keys().filter(key => {
    if (!isViablePath(key)) return false;

    try {
      const m = context(key);
      return !(IGNORE_KEY in m)
        && !Object.values(m).some(x => x === IGNORE_MARK);
    } catch (err) {
      console.warn('Error while loading ' + key);
      console.warn(err);
      errored.push(key);
      return false;
    }
  });

  return {
    accepted,
    errored,
  };
}

export const createContextUpdateHandler = ({ removeOld }: TOptions) => {
  let lastModules: Array<string> = [];
  const cache = new Map<TPath, TCacheData>();

  const loadModule = async (engine: Engine, context: RequireContext, path: TPath) => {
    const module = context(path);
    const moduleData = pick(module, 'default');
    const { [CLEANUP_KEY]: onCleanupFn } = module;

    if (cleanModule(removeOld, engine, path, moduleData)) {
      return; // module didn't change
    }

    const addResultsAsync: IResultsAsyncMap = mapValues(moduleData, async (rawData): Promise<Array<Promise<TAddVariant>>> => {
      return asArray(await rawData)
              .map(async data => {
                return (await engine.add(await data));
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

    for (const value of Object.values(addResults)) {
      // @ts-ignore
      for (const data of value) {
        data[IMPORTED_FROM] = path;
      }
    }

    cache.set(path, {
      moduleData,
      addResults,
      onCleanupFn
    });
  };

  function cleanModule (removeOld: TRemoveOldFn, engine: Engine, path: TPath, moduleData?: any) {
    const cached = cache.get(path);

    if (cached) {
      const {
        moduleData: oldModuleData,
        addResults: oldAddResults,
        onCleanupFn,
      } = cached;

      if (isEqual(oldModuleData, moduleData)) {
        return true;
      }
      if (typeof onCleanupFn === 'function') {
        onCleanupFn(oldAddResults);
      }
      for (const list of Object.values(oldAddResults)) {
        for (const old of list) {
          removeOld(old, engine);
        }
      }
    }
  }

  return function updateModules (engine: Engine, context: RequireContext) {
    const {
      accepted,
      errored
    } = getModuleList(context);
    const updated = [...accepted, ...errored];

    for (const module of accepted) {
      loadModule(engine, context, module);
    }

    const disbandedModules = difference(lastModules, updated);
    for (const path of disbandedModules) {
      cleanModule(removeOld, engine, path);
    }

    lastModules = updated;
  };
};
