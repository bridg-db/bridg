import path from 'path';
import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';
import { capitalize, uncapitalize } from '../../utils/string.util';

const generateExports = (models: string[]) => {
  const exports = models.reduce(
    (acc, model) => `${acc}\n  ${uncapitalize(model)}:${uncapitalize(model)}Client,`,
    ``
  );

  return `
type WebsocketFunctions = { $sendWebsocketMessage: (data: any) => Promise<any> };
const wsTypedObj = (
  config.apiIsWebsocket ? { $sendWebsocketMessage: (data: any) => exec(data) } : {}
) as typeof config.apiIsWebsocket extends true ? WebsocketFunctions : {};

const bridg = {${exports}\n...wsTypedObj,\n};\nexport default bridg;`;
};

const getHead = () => `
import config from './bridg.config';
import { type ModelName } from './server';
import { type PulseSubscribe } from './server/request-handler';

export const exec = (
  request: { model: string; args?: {}; func: string },
  subscriptionCallback?: (e: any) => void
) => {
  if (!config.apiIsWebsocket) {
    return fetch(config.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(async (res) => {
      const json = await res.json();
      if (res.status !== 200) throw new Error(json?.error || '');

      return json;
    });
  } else {
    return request.func === 'subscribe' && subscriptionCallback
      ? websocketListener(request, subscriptionCallback)
      : websocketPromiseReq(request);
  }
};

const generateClient = (model: string): Record<string, (args: any) => void> => ({
  aggregate: (args) => exec({ func: 'aggregate', model, args }),
  count: (args) => exec({ func: 'count', model, args }),
  create: (args) => exec({ func: 'create', model, args }),
  delete: (args) => exec({ func: 'delete', model, args }),
  deleteMany: (args) => exec({ func: 'deleteMany', model, args }),
  findFirst: (args) => exec({ func: 'findFirst', model, args }),
  findFirstOrThrow: (args) => exec({ func: 'findFirstOrThrow', model, args }),
  findMany: (args) => exec({ func: 'findMany', model, args }),
  findUnique: (args) => exec({ func: 'findUnique', model, args }),
  findUniqueOrThrow: (args) => exec({ func: 'findUniqueOrThrow', model, args }),
  groupBy: (args) => exec({ func: 'groupBy', model, args }),
  update: (args) => exec({ func: 'update', model, args }),
  updateMany: (args) => exec({ func: 'updateMany', model, args }),
  upsert: (args) => exec({ func: 'upsert', model, args }),
  // pulse-only
  subscribe: (args) => {
    const que = new AsyncBlockingQueue();
    que.stop = exec({ func: 'subscribe', model, args }, (event) =>
      que.enqueue(event)
    ) as () => Promise<void>;

    return que;
  },
});

type BridgSubscribe<model extends ModelName> = {
  subscribe: (
    // @ts-ignore
    ...args: Parameters<PulseSubscribe<model>>
  ) => // @ts-ignore
  Promise<Exclude<Awaited<ReturnType<PulseSubscribe<model>>>, Error>>;
};
type BridgModel<PrismaDelegate, model extends ModelName> = Omit<
  PrismaDelegate,
  'createMany' | 'fields'
> &
  (typeof config.pulseEnabled extends true ? BridgSubscribe<model> : {});

// Websocket helpers, needed for Pulse enabled projects
const messageCallbacks: Record<string, (data: any) => void> = {};
let ws: WebSocket | undefined;
const getWebsocket = (): Promise<WebSocket> =>
  new Promise((resolve) => {
    if (ws && ws.readyState === ws.OPEN) {
      resolve(ws);
    } else if (ws && ws.readyState === ws.CONNECTING) {
      ws.addEventListener('open', () => ws && resolve(ws));
    } else {
      ws = new WebSocket(config.api);
      ws.addEventListener('message', (event) => {
        const data: { id: string; payload: any } = JSON.parse(event.data || '{}');
        messageCallbacks[data.id]?.(data.payload);
      });
      ws.addEventListener('open', () => ws && resolve(ws));
    }
  });

class WsMessage {
  id: string;
  payload: {};
  type?: string;
  constructor(payload: {}, type?: string) {
    this.id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    this.payload = payload;
    this.type = type;
  }
}

const sendWsMsg = (msg: WsMessage) => getWebsocket().then((ws) => ws.send(JSON.stringify(msg)));

// subscription, with callback
const websocketListener = (msg: {}, cb: (data: any) => void) => {
  const message = new WsMessage(msg, 'subscribe');
  messageCallbacks[message.id] = cb;
  sendWsMsg(message);

  return () => sendWsMsg({ id: message.id, payload: { func: 'unsubscribe' } });
};
// 1 time http-esque request
const websocketPromiseReq = (msg: {}) =>
  new Promise((resolve, reject) => {
    const message = new WsMessage(msg);
    messageCallbacks[message.id] = ({ data, status }) => {
      status === 200 ? resolve(data) : reject(data);
      delete messageCallbacks[message.id];
    };
    sendWsMsg(message);
  });

// needed for .subscribe AsyncIterable
// https://stackoverflow.com/a/47157577/6791815
class AsyncBlockingQueue<T> {
  private resolvers: Array<(value: T | PromiseLike<T>) => void> = [];
  private promises: Promise<T>[] = [];
  private _add() {
    this.promises.push(
      new Promise((resolve) => {
        this.resolvers.push(resolve);
      })
    );
  }

  stop() {}
  enqueue(t: T) {
    if (!this.resolvers.length) this._add();
    this.resolvers.shift()!(t);
  }
  dequeue(): Promise<T> {
    if (!this.promises.length) this._add();
    return this.promises.shift()!;
  }
  isEmpty(): boolean {
    return !this.promises.length;
  }
  isBlocked(): boolean {
    return !!this.resolvers.length;
  }
  get length(): number {
    return this.promises.length - this.resolvers.length;
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return {
      next: () => this.dequeue().then((value) => ({ done: false, value })),
      [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this;
      },
    };
  }
}
`;

const MODEL_TEMPLATE = `const *{model}Client = generateClient('*{model}') as BridgModel<Prisma.*{Model}Delegate, '*{model}'>;\n`;

const genModelClient = (model: string) =>
  MODEL_TEMPLATE.replaceAll(`*{model}`, uncapitalize(model)).replaceAll(
    `*{Model}`,
    capitalize(model)
  );

export const generateClientDbFile = ({
  modelNames,
  outputLocation,
  prismaLocation,
}: {
  modelNames: string[];
  outputLocation: string;
  prismaLocation?: string;
}) => {
  const filePath = path.join(outputLocation, 'index.ts');

  const prismaImportPath = prismaLocation
    ? getRelativeImportPath(filePath, prismaLocation)
    : `@prisma/client`;

  const importStatement = `import { Prisma } from '${prismaImportPath}';`;
  const modelClients = modelNames.reduce((acc, model) => `${acc}${genModelClient(model)}`, ``);
  const clientDbCode = `${importStatement}${getHead()}${modelClients}${generateExports(
    modelNames
  )}`;

  //   writeFileSafely(`${'./node_modules/bridg/dist/package'}/client/db.ts`, clientDbCode);
  writeFileSafely(`${outputLocation}/index.ts`, clientDbCode);
  return clientDbCode;
};
