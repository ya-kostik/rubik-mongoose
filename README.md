# rubik-mongoose
Mongose's kubik for rubik

## Install

### npm
```bash
npm i mongoose
npm i rubik-mongoose
```

### yarn
```bash
yarn add mongoose
yarn add rubik-mongoose
```

# Use
```javascript
const { App, Kubiks } = require('rubik-main');
const Mongoose = require('rubik-mongoose');
const path = require('path');

// create rubik app
const app = new App();
// config need for most modules
const config = new Kubiks.Config(path.join(__dirname, './config/'));
// you can use any logger you want, just create kubik with it
// default Kubiks.Log use console for logging
const log = new Kubiks.Log();
// argument is a path to the models or schemas directory
const storage = new Mongoose(path.join(__dirname, './storage/models/'));

// Add some extensions if you need
storage.use({
  name: 'User',
  schema: require('./storage/schemas/User.js'),
  collection: 'Users'
});
storage.use(path.join(__dirname, './additional-models/'))

app.add([ config, log, storage ]);

app.up().
then(() => console.info('App started')).
catch(err => console.error(err));
```

## Config
`storage.js` config in configs volume should contain `connection` — is a connection options and `options` — native driver settings.

For example:
`config/storage.js`
```javascript
module.exports = {
  connection: {
    host: 'localhost',
    port: '27017',
    database: 'test',
    username: null,
    password: null,
    options: null
  },
  options: {
    poolSize: 15,
    keepAlive: 500,
    autoReconnect: true,
    reconnectTries: 120,
    reconnectInterval: 1000,
    useNewUrlParser: true
  }
};
/**
 * Some additional available options for ”connection“ section:
  members: [
    '127.0.0.1',
    '127.0.0.2',
    '127.0.0.3',
  ],
  options: {
    replicaSet: 'rs0'
  }
 * for ”options“ section: http://mongodb.github.io/node-mongodb-native/3.1/reference/connecting/connection-settings/
 */
```

## Extensions
1. One object with model's desctiption:
```javascript
storage.use({
  name: 'User',
  schema: require('./storage/schemas/User.js'),
  collection: 'Users'
});
```
- `name` — model name for `mongoose.models`
- `schema` — mongoose Schema instance
- `collection` — optional, MongoDB collection name

2. Array of model's objects
```javascript
storage.use([{
  name: 'User',
  schema: require('./storage/schemas/User.js'),
  collection: 'Users'
}, {
  name: 'UserTag',
  schema: require('./storage/schemas/UserTag.js')
}]);
```

3. Single path to directory with models
```javascript
storage.use(path.join(__dirname, './storage/models/'));
```

4. Array of paths to directory with models
```javascript
storage.use([
  path.join(__dirname, './storage/models/'),
  path.join(__dirname, './additional-models/')
]);
```

5. Mixed array of paths and models
```javascript
storage.use([
  {
    name: 'UserTag',
    schema: require('./storage/schemas/UserTag.js')
  },
  path.join(__dirname, './additional-models/')
]);
```

# Use kubik with different name, or kubiks with different databases
By default Mongoose kubik has `storage` name, and the same config filename.

If you need different name, or use two Mongoose kubiks with different databases, you can change name of kubik.
```js
const pathToModels = path.join(__dirname, './storage/models/');

const storage = new Mongoose(pathToModels);

const first = new Mongoose(pathToModels);
first.name = 'first';

const second = new Mongoose(pathToModels);
second.name = 'second';

app.add([storage, first, second]);
// now you should create first.js and second.js files in config directories, and set configuration for different connections
```

# Add plugins for Models
You can add one or more mongooses plugins for all models, or selected ones.
### For all
```js
// fn is a plugin function
storage.plugin(fn);
```
### For selected
```js
// fn is a plugin function
// models is a set of names
storage.plugin({ plugin: fn, models })
```

You should add all your plugins before models.
