import http from 'http';
// unsure right now why this import method is necessary, but it breaks otherwise
import { withPulse } from '../../node_modules/@prisma/extension-pulse/dist/cjs/entry.node';
import { handleRequest } from '../generated/bridg-pulse/server/request-handler';
// import { handleRequest } from '../generated/bridg-pulse_tmp/server/request-handler';
import { Prisma, PrismaClient } from '../generated/prisma-pulse';
import { TEST_TITLE, TEST_TITLE_2 } from '../utils/prisma.test-util';

jest.setTimeout(30000);

const sleep = (seconds: number) => new Promise((res) => setTimeout(res, seconds * 1000));

const prisma = new PrismaClient().$extends(
  withPulse({ apiKey: process.env.PULSE_API_KEY! }),
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

const USER_EMAIL = 'newuser@gmail.com';

const createPulseListener = (
  request: {
    model: Parameters<typeof handleRequest>[0]['model'];
    args?: any;
    rules?: Parameters<typeof handleRequest>[1]['rules'];
    uid?: string;
  },
  pulseCallback: (data: any) => void,
) =>
  handleRequest(
    { func: 'subscribe', model: request.model, args: request.args || {} },
    {
      rules: request.rules || { default: true },
      uid: request.uid || '',
      db: prisma,
      onSubscriptionEvent: (event) => pulseCallback(event),
      onSubscriptionCreated: (subscription) => subscriptions.push(subscription),
    },
  );

afterEach(async () => {
  closeSubscriptions();
  await sleep(2);
});

afterAll(async () => {
  closeSubscriptions();
  prisma.$disconnect();
});

const isInternetConnected = () =>
  new Promise((resolve) =>
    http
      .get('http://www.google.com', (res) =>
        resolve(res?.statusCode && res.statusCode >= 200 && res.statusCode < 300),
      )
      .on('error', () => resolve(false)),
  );

const runCreateUpdateDelete = async (userInput?: Prisma.UserCreateInput) => {
  await sleep(2);
  const userCreated = await prisma.user.create({ data: { email: USER_EMAIL, ...userInput } });
  await sleep(2);
  await prisma.user.update({ where: { id: userCreated.id }, data: { name: 'john' } });
  await sleep(2);
  await prisma.user.delete({ where: { id: userCreated.id } });
  await sleep(2);
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
    () => eventsEmitted++,
  );

  await runCreateUpdateDelete();

  expect(res?.status).toBe(401);
  expect(eventsEmitted).toBe(0);
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
    (e) => eventsEmitted.push(e.action),
  );

  await runCreateUpdateDelete();
  expect(eventsEmitted.length).toBe(0);
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
      rules: { user: { find: { email: USER_EMAIL } } },
    },
    (e) => eventsEmitted.push(e.action),
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
      rules: { user: { find: { email: USER_EMAIL } } },
    },
    (e) => eventsEmitted.push(e.action),
  );
  await runCreateUpdateDelete();
  expect(eventsEmitted.length).toBe(1);
  expect(eventsEmitted.includes('delete')).toBe(true);
});

it('Pulse queries working with OR rules', async () => {
  let eventsEmitted: string[] = [];
  const userCreated = await prisma.user.create({ data: { email: USER_EMAIL } });

  createPulseListener(
    {
      model: 'user',
      uid: userCreated.id,
      args: { update: {} },
      rules: {
        user: { find: (uid) => ({ OR: [{ email: 'wrong-email@yahoo.com' }, { id: uid }] }) },
      },
    },
    (e) => eventsEmitted.push(e.action),
  );
  await sleep(2);
  await prisma.user.update({ where: { id: userCreated.id }, data: { name: 'john' } });
  await sleep(2);
  expect(eventsEmitted.length).toBe(1);
  expect(eventsEmitted.includes('update')).toBe(true);
});

it('Blocked fields works with pulse', async () => {
  let eventsEmitted: string[] = [];
  const BLOCKED_FIELD = 'updatedAt';

  createPulseListener(
    {
      model: 'user',
      args: {},
      rules: {
        user: {
          default: true,
          blockedFields: [BLOCKED_FIELD],
        },
      },
    },
    (e) => eventsEmitted.push(e),
  );

  await runCreateUpdateDelete();
  expect(eventsEmitted.length).toBe(3);
  const valueKeys = ['created', 'after', 'before', 'deleted'];
  eventsEmitted.forEach((e: any) => {
    let hasId = false;
    valueKeys.forEach((k) => {
      const val = e[k] || {};
      // blocked field doesn't show up anywhere
      expect(val[BLOCKED_FIELD]).toBeUndefined();
      if (val.id) hasId = true;
    });
    // each event has some data (id), just not the blocked field
    expect(hasId).toBe(true);
  });
});

it('Allowed fields works with pulse', async () => {
  let eventsEmitted: string[] = [];
  const BLOCKED_FIELD = 'updatedAt';

  createPulseListener(
    {
      model: 'user',
      args: {},
      rules: {
        user: {
          default: true,
          allowedFields: ['createdAt', 'email', 'id', 'name', 'image'],
        },
      },
    },
    (e) => eventsEmitted.push(e),
  );

  await runCreateUpdateDelete();

  expect(eventsEmitted.length).toBe(3);
  const valueKeys = ['created', 'after', 'before', 'deleted'];
  eventsEmitted.forEach((e: any) => {
    let hasId = false;
    valueKeys.forEach((k) => {
      const val = e[k] || {};
      // non-allowed field doesn't show up anywhere
      expect(val[BLOCKED_FIELD]).toBeUndefined();
      if (val.id) hasId = true;
    });
    // each event has some data (id), just not the blocked field
    expect(hasId).toBe(true);
  });
});

it('pulse create, update events working with relational rules', async () => {
  let eventsEmitted: string[] = [];
  createPulseListener(
    {
      model: 'user',
      rules: { user: { find: { blogs: { some: { title: TEST_TITLE } } } } },
    },
    (e) => eventsEmitted.push(e.action),
  );

  await runCreateUpdateDelete({ blogs: { create: { title: TEST_TITLE_2 } } });

  expect(eventsEmitted.length).toBe(0);
  eventsEmitted = [];

  await runCreateUpdateDelete({ blogs: { create: { title: TEST_TITLE } } });

  // expecting 2 and not 3, bc delete event cannot be validated after the user is deleted
  expect(eventsEmitted.length).toBe(2);
  expect(eventsEmitted.includes('create')).toBe(true);
  expect(eventsEmitted.includes('update')).toBe(true);
});

it('relational pulse rules obey user sent query', async () => {
  let eventsEmitted: string[] = [];

  createPulseListener(
    {
      model: 'user',
      args: {
        create: { email: 'wrong_email' },
        update: { email: USER_EMAIL },
      },
      rules: { user: { find: { blogs: { some: { title: TEST_TITLE } } } } },
    },
    (e) => eventsEmitted.push(e.action),
  );

  await runCreateUpdateDelete({ blogs: { create: { title: TEST_TITLE_2 } } });
  // 0 bc blog title does not match the relational rule
  expect(eventsEmitted.length).toBe(0);

  eventsEmitted = [];

  await runCreateUpdateDelete({ blogs: { create: { title: TEST_TITLE } } });

  // 1 event. create query does not match, but update does, both pass relational rule
  expect(eventsEmitted.length).toBe(1);
  expect(eventsEmitted.includes('update')).toBe(true);
});
