const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

/**
 * Create and start mongod test server
 * @return {Object} out.mongod — instance of MongoMemoryServer, out.connectionString, out.port
 */
module.exports = async function runMongoTestServer() {
  if (!mongod) {
    mongod = new MongoMemoryServer({
      autoStart: false,
    });
    await mongod.start();
  }

  return {
    mongod,
    connectionString: await mongod.getConnectionString(),
    port: await mongod.getPort()
  };
};
