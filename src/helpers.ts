import { platform } from 'os'
import { existsSync } from 'fs'
import { normalize, join } from 'path'

import { IPluginSettings } from './IPluginSettings'

/**
 *  Handles getting the jest runner, handling the OS and project specific work too
 *
 * @returns {string}
 */
export function pathToJest(pluginSettings: IPluginSettings) {
  const path = normalize(pluginSettings.pathToJest)

  const defaultPath = normalize('node_modules/.bin/jest')
  if (path === defaultPath && isBootstrappedWithCreateReactApp(pluginSettings.rootPath)) {
    // If it's the default, run the script instead
    return platform() === 'win32' ? 'npm.cmd test --' : 'npm test --'
  }

  // For windows support, see https://github.com/jest-community/vscode-jest/issues/10
  if (!path.includes('.cmd') && platform() === 'win32') {
    return path + '.cmd'
  }
  return path
}

function isBootstrappedWithCreateReactApp(rootPath: string): boolean {
  return (
    hasExecutable(rootPath, 'node_modules/.bin/react-scripts') ||
    hasExecutable(rootPath, 'node_modules/react-scripts/node_modules/.bin/jest') ||
    hasExecutable(rootPath, 'node_modules/react-native-scripts') ||
    hasExecutable(rootPath, 'node_modules/react-scripts-ts')
  )
}

function hasExecutable(rootPath: string, executablePath: string): boolean {
  const ext = platform() === 'win32' ? '.cmd' : ''
  const absolutePath = join(rootPath, executablePath + ext)
  return existsSync(absolutePath)
}

/**
 * Handles getting the path to config file
 *
 * @returns {string}
 */
export function pathToConfig(pluginSettings: IPluginSettings) {
  if (pluginSettings.pathToConfig !== '') {
    return normalize(pluginSettings.pathToConfig)
  }

  return ''
}

export function pathToJestPackageJSON(pluginSettings: IPluginSettings): string | null {
  let pathToNodeModules = join(pluginSettings.rootPath, 'node_modules')

  if (pluginSettings.pathToJest) {
    const relativeJestCmd = removeSurroundingQuotes(pluginSettings.pathToJest.split(' ')[0])
    const relativePathToNodeModules = relativeJestCmd.replace(/node_modules.+$/i, 'node_modules')

    pathToNodeModules = join(pluginSettings.rootPath, relativePathToNodeModules)
  }

  const defaultPath = normalize(join(pathToNodeModules, 'jest/package.json'))
  const craPath = normalize(join(pathToNodeModules, 'react-scripts/node_modules/jest/package.json'))
  const paths = [defaultPath, craPath]
  let updir = ''

  let max_levels = 20
  do {
    for (const i in paths) {
      const absolutePath = join(pluginSettings.rootPath, updir, paths[i])
      if (existsSync(absolutePath)) {
        return absolutePath
      }
    }
    updir += '../'
    max_levels--
  } while (max_levels > 0 && join(pluginSettings.rootPath, updir) !== join(pluginSettings.rootPath, updir, '../'))

  return null
}

function removeSurroundingQuotes(str) {
  return str.replace(/^['"`]/, '').replace(/['"`]$/, '')
}
