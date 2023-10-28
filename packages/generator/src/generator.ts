import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper';
import path from 'path';
import * as ts from 'typescript';
import { compileTsDir } from './compileTsDir';
import { GENERATOR_NAME, VERSION } from './constants';
import { generateBridgTsFiles, generateRulesFile } from './generator/ts-generation';
import { deleteDirSafely, deleteFileSafely } from './utils/file.util';

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
    const debug = options.generator.config.debug === 'true';
    const outRoot = options.generator.output?.value || './node_modules/bridg';
    // keep at same level, dont make /tmp a subdirectory
    // causes issues when trying to import custom prisma output paths
    const tempDir = outRoot + '_tmp';

    cleanupPreviouslyGeneratedFiles(outRoot);
    generateBridgTsFiles(options, tempDir);
    compileBridgFiles(tempDir, outRoot, debug);
    deleteDirSafely(tempDir);
    generateRulesFile(options, outRoot);

    return;
  },
});

const compileBridgFiles = (sourceDir: string, outDir: string, debug = false) => {
  // capture unimportant ts error output
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
  deleteDirSafely(baseDir + '_tmp');
  deleteFileSafely(path.join(baseDir, 'index.js'));
  deleteFileSafely(path.join(baseDir, 'index.ts'));
};
