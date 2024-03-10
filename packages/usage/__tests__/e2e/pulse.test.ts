import http from 'http';
// unsure right now why this import method is necessary, but it breaks otherwise
import { withPulse } from '../../node_modules/@prisma/extension-pulse/dist/cjs/entry.node';
import { handleRequest } from '../generated/bridg-pulse/server/request-handler';
import { PrismaClient } from '../generated/prisma-pulse';

jest.setTimeout(30000);

const sleep = (seconds: number) => new Promise((res) => setTimeout(res, seconds * 1000));

const prisma = new PrismaClient().$extends(
  withPulse({ apiKey: process.env.PULSE_API_KEY! })
) as unknown as PrismaClient;

let subscriptions: any[] = [];
const closeSubscriptions = () => subscriptions.forEach((s) => s?.stop());

beforeAll(async () => {
  // i work on hotspot sometimes.. so yeah..
  const isConnected = await isInternetConnected();
  if (!isConnected) throw new Error('No internet connection');
});

beforeEach(async () => {
  await prisma.user.deleteMany();
});

const FAKE_USER_EMAIL = 'newuser@gmail.com';

const createPulseListener = (
  request: {
    model: Parameters<typeof handleRequest>[0]['model'];
    args?: any;
    rules?: Parameters<typeof handleRequest>[1]['rules'];
    uid?: string;
  },
  pulseCallback: (data: any) => void
) =>
  handleRequest(
    { func: 'subscribe', model: request.model, args: request.args || {} },
    {
      rules: request.rules || { default: true },
      uid: request.uid || '',
      db: prisma,
      onSubscriptionEvent: (event) => pulseCallback(event),
      onSubscriptionCreated: (subscription) => subscriptions.push(subscription),
    }
  );

const runCreateUpdateDelete = async () => {
  await sleep(0.5);
  const userCreated = await prisma.user.create({ data: { email: FAKE_USER_EMAIL } });
  await prisma.user.update({ where: { id: userCreated.id }, data: { name: 'john' } });
  await prisma.user.delete({ where: { id: userCreated.id } });
  await sleep(3);
};

it('subscribe emits on creation, update, delete events', async () => {
  const callbacksHit: string[] = [];
  createPulseListener({ model: 'user' }, (newData) => callbacksHit.push(newData.action));

  await runCreateUpdateDelete();

  expect(callbacksHit.includes('create')).toBe(true);
  expect(callbacksHit.includes('update')).toBe(true);
  expect(callbacksHit.includes('delete')).toBe(true);
  expect(callbacksHit.length).toBe(3);
});

it('false rules prevent reading with pulse', async () => {
  let eventsEmitted = 0;

  const res = await createPulseListener(
    { model: 'user', rules: { user: { default: false } } },
    () => eventsEmitted++
  );

  await runCreateUpdateDelete();

  expect(res.status).toBe(401);
  expect(eventsEmitted).toBe(0);
  closeSubscriptions();
});

it('true rules allow reading with pulse', async () => {
  let eventsEmitted = 0;
  createPulseListener({ model: 'user', rules: { user: { default: true } } }, () => eventsEmitted++);
  await runCreateUpdateDelete();
  expect(eventsEmitted).toBe(3);
});

it('where clause rules prevent reading inaccessible data ', async () => {
  let eventsEmitted: string[] = [];

  createPulseListener(
    { model: 'user', rules: { user: { find: { email: 'nonmatch@gmail.com' } } } },
    (e) => eventsEmitted.push(e.action)
  );

  await runCreateUpdateDelete();

  expect(eventsEmitted.length).toBe(0);
  closeSubscriptions();
});

it('where clauses allow reading accessible data', async () => {
  let eventsEmitted: string[] = [];

  createPulseListener(
    {
      model: 'user',
      args: {
        create: {},
        update: {},
      },
      rules: { user: { find: { email: FAKE_USER_EMAIL } } },
    },
    (e) => eventsEmitted.push(e.action)
  );
  await runCreateUpdateDelete();
  expect(eventsEmitted.length).toBe(2);
  expect(eventsEmitted.includes('create')).toBe(true);
  expect(eventsEmitted.includes('update')).toBe(true);
});

it('user defined filters working with where clauses', async () => {
  let eventsEmitted: string[] = [];

  createPulseListener(
    {
      model: 'user',
      args: { create: { name: 'fake' }, delete: { name: 'john' } },
      rules: { user: { find: { email: FAKE_USER_EMAIL } } },
    },
    (e) => eventsEmitted.push(e.action)
  );
  await runCreateUpdateDelete();
  expect(eventsEmitted.length).toBe(1);
  expect(eventsEmitted.includes('delete')).toBe(true);
});

it('cannot run pulse queries against relational rules', async () => {
  let eventsEmitted = [];

  const res = await createPulseListener(
    {
      model: 'user',
      args: { create: { name: 'fake' }, delete: { name: 'john' } },
      rules: { user: { find: { email: FAKE_USER_EMAIL, blogs: { some: { title: 'hi' } } } } },
    },
    (e) => eventsEmitted.push(e.action)
  );
  await runCreateUpdateDelete();
  expect(res.status).toBe(500);
  expect(eventsEmitted.length).toBe(0);
});

afterEach(() => {
  closeSubscriptions();
});

afterAll(async () => {
  prisma.$disconnect();
  closeSubscriptions();
});

function isInternetConnected() {
  return new Promise((resolve) => {
    http
      .get('http://www.google.com', (res) =>
        resolve(res?.statusCode && res.statusCode >= 200 && res.statusCode < 300)
      )
      .on('error', () => resolve(false));
  });
}
