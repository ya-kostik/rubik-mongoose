/* global test expect jest */
const path = require('path');
const { createKubik, createApp } = require('rubik-main/tests/helpers/creators');
const { Kubiks } = require('rubik-main');
const Mongoose = require('./Mongoose');

const initApp = () => {
  const app = createApp();
  const config = createKubik(Kubiks.Config, app);
  config.volumes.push(path.join(__dirname, './default/'));
  createKubik(Kubiks.Log, app);
  return app;
}

test('Create kubik and add it into rubik app', () => {
  const app = initApp();
  const storage = createKubik(Mongoose, app);
  expect(app.get('storage')).toBe(storage);
});

test('Add extensions and connect to MongoDB', async () => {
  // If you want to test first connection error
  jest.setTimeout(200000);
  const app = initApp();
  const storage = createKubik(Mongoose, app);
  storage.use(path.join(__dirname, './tests/mocks/auto-read-schemas/'));
  storage.use([
    path.join(__dirname, './tests/empty/one/'),
    path.join(__dirname, './tests/empty/two/')
  ]);
  storage.use(require('./tests/mocks/models'));
  storage.use(require('./tests/mocks/models/one.js'));
  await app.up();
  expect(app.get('storage').db).toBeDefined();
  expect(storage.mongoose.models.TestA).toBe(app.storage.models.TestA);
  expect(storage.collection('TestsA')).toBeDefined();
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
