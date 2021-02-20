import { Engine } from 'eaciest';

export * from './context-update';

export enum EDirTypeContent {
  Systems = 'systems',
  Data = 'data'
}

/**
 * DOES NOT WORK. USE COMMENTS INSTEAD
 * Installs Webpack handlers to load contents of path
 * Requires Plugin to be enabled
 * @param engine
 * @param type
 * @param path
 */
export function setupContentPath(type: EDirTypeContent, path: string, engine: Engine) {
  throw new Error('Eacy plugin is not enabled.');
}
