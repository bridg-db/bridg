import path from 'path';
import { writeFileSafely } from '../../utils/file.util';

export type BridgConfigOptions = {
  pulse?: boolean;
  debug?: boolean;
  edge?: boolean;
  output?: string;
  api?: string;
};

const getConfigFileContent = ({
  pulse = false,
  debug = false,
  output,
  api = '/api/bridg',
}: BridgConfigOptions) => `
const bridgConfig = {
    pulseEnabled: ${pulse},
    debug: ${debug},
    output: ${output ? `'${output}'` : `undefined`},
    api: ${api ? `'${api}'` : `undefined`},
    apiIsWebsocket: ${api?.startsWith('ws:') || api?.startsWith('wss:')},
} as const;
  
export default bridgConfig;
`;

export const generateBridgConfigFile = ({
  bridgConfig,
  outputLocation,
}: {
  bridgConfig: BridgConfigOptions;
  outputLocation: string;
}) => {
  const fileContent = getConfigFileContent(bridgConfig);
  const filePath = path.join(outputLocation, 'bridg.config.ts');
  writeFileSafely(filePath, fileContent);

  return fileContent;
};
