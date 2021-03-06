import * as Fs from 'fs'
import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
import { pathsToModuleNameMapper } from 'ts-jest/utils'
import * as TypeScript from 'typescript'

const tsconfig = TypeScript.readConfigFile('tsconfig.json', (path) =>
  Fs.readFileSync(path, { encoding: 'utf-8' })
)

const config: InitialOptionsTsJest = {
  preset: 'ts-jest',
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.config.compilerOptions.paths, {
    prefix: '<rootDir>',
  }),
  testEnvironment: 'jsdom',
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects',
    'jest-watch-suspend',
  ],
  globals: {
    'ts-jest': {
      diagnostics: Boolean(process.env.CI),
      // TODO bring back once working... prevents importing nexus etc.?
      // astTransformers: {
      //   before: ['ts-jest/dist/transformers/path-mapping'],
      // },
    },
  },
}

export default config
