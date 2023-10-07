import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper';
import { renameSync, rmSync } from 'fs';
import path from 'path';
import * as ts from 'typescript';
import { compileTsDir } from './compileTsDir';
import { GENERATOR_NAME, VERSION } from './constants';
import {
  generateBridgTsFiles,
  generateRulesFile,
} from './generator/ts-generation';
import {
  deleteDirSafely,
  deleteFileSafely,
  moveDirContentsToDirectory,
} from './utils/file.util';

generatorHandler({
  onManifest() {
    console.info(`${GENERATOR_NAME}:Registered`);
    return {
      version: VERSION,
      prettyName: GENERATOR_NAME,
      defaultOutput: './node_modules/bridg',
      requiresGenerators: ['prisma-client-js'],
      example: 'hello',
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    const api = (options.generator.config.api as string) || '/api/bridg';
    const debug = options.generator.config.debug === 'true';
    const outRoot = options.generator.output?.value || './node_modules/bridg';

    const schemaPath = options.schemaPath;
    const tempDir = path.join(outRoot, 'tmp');
    const tsOutDir = path.join(tempDir, 'output');

    cleanupPreviouslyGeneratedFiles(outRoot);
    generateBridgTsFiles(schemaPath, tempDir, api);
    compileBridgFiles(tempDir, tsOutDir, debug);
    generateRulesFile(options, outRoot);

    // move files to desired output location, cleanup temp dir
    await moveDirContentsToDirectory(path.join(tsOutDir, 'client'), outRoot);
    renameSync(path.join(tsOutDir, 'server'), path.join(outRoot, 'server'));
    rmSync(tempDir, { recursive: true, force: true });

    return;
  },
});

const compileBridgFiles = (
  sourceDir: string,
  outDir: string,
  debug = false
) => {
  // capture meaningless error output
  const originalConsoleLog = console.log;
  if (debug) console.log = function () {};
  compileTsDir(sourceDir, {
    outDir,
    declaration: true,
    // noEmitOnError: true, // breaks compilation for some reason
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    skipLibCheck: true,
    assumeChangesOnlyAffectDirectDependencies: true,
    maxNodeModuleJsDepth: 0,
    strict: false,
  });
  console.log = originalConsoleLog;
};

const cleanupPreviouslyGeneratedFiles = (baseDir: string) => {
  deleteDirSafely(path.join(baseDir, 'server'));
  deleteDirSafely(path.join(baseDir, 'tmp'));
  deleteFileSafely(path.join(baseDir, 'index.js'));
  deleteFileSafely(path.join(baseDir, 'index.ts'));
};
