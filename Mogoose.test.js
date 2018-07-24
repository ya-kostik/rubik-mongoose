/* global test expect */
const path = require('path');
const { createKubik, createApp } = require('rubik-main/tests/helpers/creators');
const { Kubiks } = require('rubik-main');
const Mongoose = require('./Mongoose');

const initApp = () => {
  const app = createApp();
  const config = createKubik(Kubiks.Config, app);
  config.volumes.push(path.join(__dirname, './default'));
  createKubik(Kubiks.Log, app);
  return app;
}

test('Create kubik and add it into rubik app', () => {
  const app = initApp();
  createKubik(Mongoose, app);
  expect(app.get('storage')).toBeDefined();
});

test('Connect to mongodb', () => {

});
