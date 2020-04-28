import { Engine } from 'eaciest';

export * from './context-update';

export enum EDirTypeContent {
  Systems = 'systems',
  Data = 'data'
}

/**
 * Installs Webpack handlers to load contents of path
 * Requires Plugin to be enabled
 * @param engine
 * @param type
 * @param path
 */
export function setupContentPath(engine: Engine, type: EDirTypeContent, path: string) {
  throw new Error('Eacy plugin is not enabled.');
}
