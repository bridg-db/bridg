import path from 'path';
import { type PrismaDbProvider } from 'src/generator/ts-generation';
import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';
import { capitalize, uncapitalize } from '../../utils/string.util';

const generateExports = (models: string[]) => {
  const delegates = models.reduce(
    (acc, model) =>
      `${acc}\n  ${uncapitalize(model)}: BridgModel<Prisma.${capitalize(
        model,
      )}Delegate, '${uncapitalize(model)}'>;`,
    ``,
  );

  return `
type BridgClient = {${delegates}
} & (typeof config.apiIsWebsocket extends true ? WebsocketFunctions : {});

const baseFunctions = {
  $socket: {
    sendMessage: (data: any) => exec(data),
    authenticate: async (authData: any) => {
      const authRes = await exec({ auth: authData } as any);
      lastWsAuth = { auth: authData, createdAt: Date.now() };
      return authRes;
    },
  },
};

const bridg = createBridgProxy(baseFunctions) as BridgClient;

export default bridg;`;
};

const getHead = (dbProvider?: PrismaDbProvider) => `
import config from './bridg.config';
import { type ModelName } from './server';
import { type PulseSubscribe } from './server/request-handler';

export const exec = (
  request: { model: string; args?: {}; func: string },
  subscriptionCallback?: (e: any) => void,
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

// @ts-ignore
const getRandomId = () => crypto.randomUUID();

type BridgSubscribe<model extends ModelName> = {
  subscribe: (
    // @ts-ignore
    ...args: Parameters<PulseSubscribe<model>>
  ) => // @ts-ignore
  Promise<Exclude<Awaited<ReturnType<PulseSubscribe<model>>>, Error>>;
};
type BridgModel<PrismaDelegate, model extends ModelName> = Omit<PrismaDelegate, 'fields'> &
  (typeof config.pulseEnabled extends true ? BridgSubscribe<model> : {});

// Websocket helpers, needed for Pulse enabled projects
const outstandingSubscriptions: Record<string, () => void> = {};
let heartbeatInterval: NodeJS.Timeout | undefined;
const applyWsHealthCheck = () => {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    if (ws?.readyState === ws?.CLOSED || ws?.readyState === ws?.CLOSING) {
      getWebsocket();
    }
  }, 1000 * 5);
};
const messageCallbacks: Record<string, (data: any) => void> = {};
let ws: WebSocket | undefined;
let lastWsAuth: { auth: any; createdAt: number } | undefined;
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
      ws.addEventListener('open', async () => {
        if (lastWsAuth && Date.now() - lastWsAuth.createdAt < 1000 * 60) {
          await exec({ auth: lastWsAuth.auth } as any);
          // reapply any outstanding subscriptions
          Object.values(outstandingSubscriptions).forEach((sub) => sub());
        }
        applyWsHealthCheck();
        ws && resolve(ws);
      });
    }
  });

class WsMessage {
  id: string;
  payload: {};
  type?: string;
  constructor(payload: {}, type?: string) {
    this.id = getRandomId();
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
      }),
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

function createBridgProxy(defaultFncs: Record<string, any>, path = []): any {
  return new Proxy(() => {}, {
    get(target, property) {
      if (property === 'toString') return () => path.join('.');
      // @ts-ignore
      return createBridgProxy(defaultFncs, [...path, property]);
    },
    apply(target, thisArg, args) {
      const fn = path.reduce((acc, key) => (acc ? acc[key] : undefined), defaultFncs);
      if (typeof fn === 'function') return fn(...args);

      args = args?.at(0);
      const [model, func] = path;

      // pulse-only
      if (func === 'subscribe') {
        let subId = getRandomId();
        const que = new AsyncBlockingQueue();

        const applySubscription = () => {
          const stopSubscription = exec({ func: 'subscribe', model, args }, (event) => {
            que.enqueue(event);
          }) as () => Promise<void>;

          que.stop = () => {
            delete outstandingSubscriptions[subId];
            stopSubscription();
          };
        };

        outstandingSubscriptions[subId] = applySubscription;
        applySubscription();

        return que;
      }

      return exec({ func, model, args });
    },
  });
}

type WebsocketFunctions = {
  $socket: {
    sendMessage: (data: any) => Promise<any>;
    authenticate: (data: any) => Promise<any>;
  };
};
`;

export const generateClientDbFile = ({
  modelNames,
  outputLocation,
  prismaLocation,
  dbProvider,
}: {
  modelNames: string[];
  outputLocation: string;
  prismaLocation?: string;
  dbProvider?: PrismaDbProvider;
}) => {
  const filePath = path.join(outputLocation, 'index.ts');

  const prismaImportPath = prismaLocation
    ? getRelativeImportPath(filePath, prismaLocation)
    : `@prisma/client`;

  const importStatement = `import { Prisma } from '${prismaImportPath}';`;
  const clientDbCode = `${importStatement}${getHead(dbProvider)}${generateExports(modelNames)}`;

  //   writeFileSafely(`${'./node_modules/bridg/dist/package'}/client/db.ts`, clientDbCode);
  writeFileSafely(`${outputLocation}/index.ts`, clientDbCode);
  return clientDbCode;
};
