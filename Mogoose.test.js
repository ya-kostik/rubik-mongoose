/* eslint-disable */
/* global test expect jest */
/* eslint-enable */

const path = require('path');
const mongoose = require('mongoose');
const { createKubik, createApp } = require('rubik-main/tests/helpers/creators');
const { Kubiks } = require('rubik-main');

const runMongoTestServer = require('./tests/helpers/runMongoTestServer');

const Mongoose = require('./Mongoose');
const everyChunk = require('./plugins/every-chunk.js');

/**
 * Up MongoDB in memory server
 * @param  {App} app
 * @return {Promise}
 */
async function upMongoDB(app) {
  //  MongoDB in memory section
  console.info('Test on in memory MongoDB.');
  console.info('When it starts first time, it downloads mongod binary, and tests may fail. Restart them after download is complete');
  const { port, mongod } = await runMongoTestServer();
  app.get('config').get('storage').connection.port = port;
  app.hook('afterDown', async () => {
    await mongod.stop();
  });
  //   MongoDB in memory section end
}


function initApp() {
  const app = createApp();
  const config = createKubik(Kubiks.Config, app);
  config.volumes.push(path.join(__dirname, './default/'));
  createKubik(Kubiks.Log, app);
  return app;
}

async function generateTestData(count, Model) {
  while(count--) {
    await Model.create({ text: `Ping ${count}`, index: count });
  }
}

test('Create kubik and add it into rubik app', () => {
  const app = initApp();
  const storage = createKubik(Mongoose, app);
  expect(app.get('storage')).toBe(storage);
});

test('Add extensions and connect to MongoDB', async () => {
  /*
      If you want to test first connection error:
        1. Shutdown MongoDB
        2. Uncomment lines below, and comment `await runMongoTestServer()`
        3. Start test, wait, and start MongoDB server
        It is tricky hack, I know, but have no idea to make it another way
  */

  // jest.setTimeout(200000);
  // console.info('Test on native MongoDB');

  const app = initApp();
  const storage = createKubik(Mongoose, app);
  storage.use(path.join(__dirname, './tests/mocks/auto-read-schemas/'));
  storage.use([
    path.join(__dirname, './tests/empty/one/'),
    path.join(__dirname, './tests/empty/two/')
  ]);
  storage.use(require('./tests/mocks/models'));
  storage.use(require('./tests/mocks/models/one.js'));

  /**
      Comment line below, if you want to test first connection error
  */
  await upMongoDB(app);

  await app.up();
  expect(app.get('storage').db).toBeDefined();
  expect(storage.mongoose.models.TestA).toBe(app.storage.models.TestA);
  expect(storage.collection('TestsA')).toBeDefined();

  await app.down();
});

test('Сonnection url', () => {
  const app = initApp();
  const storage = createKubik(Mongoose, app);
  const config = app.get('config');
  // read initial storage config
  config.get('storage');
  expect(storage.getConnectionUri(config.configs.storage.connection)).
  toBe('mongodb://localhost:27017/test');
  Object.assign(config.configs.storage.connection, {
    members: [
      '127.0.0.1',
      '127.0.0.2',
      '127.0.0.3'
    ],
    user: 'user',
    password: 'password'
  });
  expect(storage.getConnectionUri(config.configs.storage.connection)).
  toBe('mongodb://user:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/test');
  Object.assign(config.configs.storage.connection, {
    options: {
      replicaSet: 'rs0'
    }
  });
  expect(storage.getConnectionUri(config.configs.storage.connection)).
  toBe('mongodb://user:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/test?replicaSet=rs0');
});

test('Add plugins', async () => {
  const app = initApp();
  const storage = createKubik(Mongoose, app);

  const Schema = mongoose.Schema();

  const hello = function() {};

  const plugin = (schema) => {
    expect(schema).toBe(Schema);
    schema.static('hello', hello);
  };

  const fnPlugin = jest.fn(plugin);
  const objPlugin = { plugin: fnPlugin };

  const objPluginWithModels = {
    plugin: fnPlugin,
    models: new Set(['B', 'C'])
  }
  const objPluginWithModel = {
    plugin: fnPlugin,
    model: 'B'
  }

  storage.plugin(fnPlugin);
  storage.plugin(objPlugin);

  storage.use({ plugins: [objPluginWithModels] });
  app.use({ storage: { plugins: [objPluginWithModel] } });

  storage.use([
    { name: 'B', schema: Schema },
    { name: 'C', schema: Schema }
  ]);

  storage.applyModel({ name: 'A', schema: Schema });

  await upMongoDB(app)
  await app.up();

  expect(storage.models.A).toBeDefined();
  expect(storage.models.A.hello).toBe(hello);

  expect(storage.models.B.hello).toBe(hello);
  expect(storage.models.C.hello).toBe(hello);


  expect(fnPlugin.mock.calls.length).toBe(9);

  await app.down();
});

test('Every plugin', async () => {
  const app = initApp();
  const storage = createKubik(Mongoose, app);

  const Schema = mongoose.Schema({ text: String, index: Number });

  storage.plugin(everyChunk);
  storage.applyModel({ name: 'Test', schema: Schema, collection: 'Tests' });

  await upMongoDB(app);
  await app.up();

  const count = 109;

  await generateTestData(count, storage.models.Test);

  expect(storage.models.Test.every).toBeDefined();

  const cbMany = jest.fn();
  const cbOne = jest.fn((doc) => {
    expect(doc.index).toBe(1);
    expect(doc.text).not.toBeDefined();
  });

  const limit = 5;
  const cbWithLimit = jest.fn();

  const skipCalls = 9;
  const cbWithSkip = jest.fn();

  const limitWithSkipCalls = 3;
  let counter = 0;
  // Limits with skip should work good
  const cbWithLimitWithSkip = jest.fn((doc, index) => {
    // test index cb argument
    // It should be 0, 1, ... limitWithSkipCalls - 1
    expect(index).toBe(counter);
    counter += 1;
  });

  const { Test } = storage.models;

  await Test.every({}, cbMany);
  await Test.every(
    { index: 1 },
    cbOne,
    { index: 1 },
    { chunkSize: 1 }
  );
  await Test.every({}, cbWithLimit, null, { limit });
  await Test.every({}, cbWithSkip, null, {
    skip: count - skipCalls
  });
  await Test.every({}, cbWithLimitWithSkip, null, {
    skip: count - skipCalls,
    limit: limitWithSkipCalls
  });

  expect(cbMany.mock.calls.length).toBe(count);
  expect(cbOne.mock.calls.length).toBe(1);
  expect(cbWithLimit.mock.calls.length).toBe(limit);
  expect(cbWithSkip.mock.calls.length).toBe(skipCalls);

  expect(cbWithLimitWithSkip.mock.calls.length).toBe(limitWithSkipCalls);
  expect(counter).toBe(limitWithSkipCalls);

  await app.down();
});
