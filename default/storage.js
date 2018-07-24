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
  },
  chunkSize: 8 * 1024 * 1024
}


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
