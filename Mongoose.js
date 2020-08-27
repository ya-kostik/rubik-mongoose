const Rubik = require('rubik-main');
const mongoose = require('mongoose');
const querystring = require('querystring');
const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const isSet = require('lodash/isSet');
const delay = require('./lib/delay');

const DEFAULT_RECONNECT_INTERVAL = 1000;

/**
 * The MongoDB Storage kubik for the Rubik
 * @class Mongoose
 * @prop {Array<String>} volumes — directories with models
 * @prop {Object} models    — mongoose.models
 * @prop {Object} mongoose  — instance of mongoose
 * @prop {Mixed} connection — connection of mongoose, null before up
 * @prop {Mixed} db         — native MongoDB connection, null before up
 */
class Mongoose extends Rubik.Kubik {
  constructor(volumes) {
    super();
    // First init
    this.reset();

    if (Array.isArray(volumes)) {
      this.volumes = volumes;
    } else if (typeof volumes === 'string') {
      this.volumes.push(volumes);
    }
  }

  /**
   * Reset main fields
   */
  reset() {
    // For isolate mongoose and avoid collisions impact
    this.mongoose = new mongoose.constructor();
    // Alias (app.storage.models)
    this.models = this.mongoose.models;
    this.connection = null;
    this.db = null;
    this.plugins = [];
    this.volumes = [];
  }

  /**
   * Create connection string to MongoDB
   * @param  {Object} connConfig — configuration object (config.get(this.name).connection)
   * @return {String}              mongodb connection string
   */
  getConnectionUri(connConfig) {
    if (!connConfig) connConfig = this.config.get(this.name).connection;
    // Alias
    connConfig.username = connConfig.user && !connConfig.username
      ? connConfig.user
      : connConfig.username;

    let uri = 'mongodb://';
    if (connConfig.username) {
      uri = uri + connConfig.username;
      uri += connConfig.password ? `:${connConfig.password}` : '';
      uri += '@';
    }

    if (Array.isArray(connConfig.members)) {
      const members = connConfig.members.map((member) => {
        if (member.split(':').length === 2) return member;
        if (connConfig.port) return `${member}:${connConfig.port}`;
        return member;
      }).join(',');
      uri += members;
    } else {
      uri += connConfig.host;
      if (connConfig.port) uri = uri + ':' + connConfig.port;
    }
    uri += '/' + connConfig.database;

    if (connConfig.options) {
      uri += `?${querystring.stringify(connConfig.options)}`;
      this.isReplicaSet = !!connConfig.options.replicaSet;
    }
    return uri;
  }

  /**
   * Up kubik
   * @param  {Object} dependencies of kubik
   * @return {Promise}
   */
  async up(dependencies) {
    Object.assign(this, dependencies);

    if (this.db) return this.db;
    await this.processHooksAsync('before');

    for (const extension of this.extensions) {
      this.applyExtension(extension);
    }

    await this.readModels();
    await this.connect();
    // Add app alias
    if (!this.app[this.name]) this.app[this.name] = this;
    return this.db;
  }

  /**
   * Apply kubik extensions
   * @param  {Mixed} extension
   */
  applyExtension(extension) {
    if (isString(extension)) return this.volumes.push(extension);
    if (Array.isArray(extension)) {
      for (const subExtension of extension) {
        if (!subExtension) continue;
        if (isString(subExtension)) {
          this.volumes.push(subExtension);
          continue;
        }
        this.applyModel(subExtension);
      }
      return;
    }
    if (Array.isArray(extension.plugins)) {
      this.plugins = this.plugins.concat(extension.plugins);
      return;
    }
    return this.applyModel(extension);
  }

  /**
   * apply plugins to model
   * @param  {mongoose.Model} model
   */
  applyPlugins(model) {
    if (!this.plugins.length) return;
    if (!model.schema) return;

    this.plugins.forEach((plugin) => {
      // A plugin can be a simple function
      if (isFunction(plugin)) {
        return model.schema.plugin(plugin);
      }

      // Or object with fields:
      // Required plugin — should be a function
      if (!isFunction(plugin.plugin)) return;

      if (plugin.model && plugin.model !== model.name) return;

      if (isSet(plugin.models) && !plugin.models.has(model.name)) return;

      model.schema.plugin(plugin.plugin);
    });
  }

  /**
   * Read models from volumes
   * @return {Promise}
   */
  readModels() {
    const path = require('path');
    const apply = (value) => {
      if (isFunction(value)) return value(this, this.mongoose);
      if (value && value.name && value.schema) {
        return this.applyModel(value);
      }
    }

    for (const volume of this.volumes) {
      return Rubik.helpers.readdir(volume, (file, name) => {
        // ignore test files
        if (file.endsWith('.test.js')) return;
        const value = require(path.join(volume, file));
        if (Array.isArray(value)) return value.forEach(apply);
        if (value && value.constructor === this.mongoose.Schema) {
          return this.applyModel({ name, schema: value });
        }
        return apply(value);
      });
    }
  }

  /**
   * Apply model to mongoose
   * @param  {Object} model hash
   * @param {String} model.name — name of model
   * @param {mongoose.Schema} model.schema — schema of model
   * @param {String} [model.collection] — additional name for MongoDB's collection
   */
  applyModel(model) {
    if (!(model && model.name && model.schema)) return;
    const collection = model.collection || undefined;

    this.applyPlugins(model);

    this.mongoose.model(model.name, model.schema, collection);
  }

  /**
   * Connect mongoose to the MongoDB
   * @param  {Object} config config object
   * @return {Promise}       resolve => connection to MongoDB, reject => connection error
   */
  async connect() {
    const reg = /failed to connect to server \[.*?\] on first connect/;
    const config = this.config.get(this.name);

    const connect = () => {
      return this.mongoose.connect(
        this.getConnectionUri(config.connection),
        config.options
      ).catch(async (err) => {
        if (reg.test(err.message)) {
          // If error is «failed to connect to server on first connect»
          // delay and try again
          await delay(config.options.reconnectInterval || DEFAULT_RECONNECT_INTERVAL);
          return connect();
        }
        throw err;
      });
    }

    await connect();

    this.databaseName = config.connection.database;

    this.log.info('Storage connected to mongodb 🍔');
    this.log.info('Database: ' + this.databaseName);

    if (this.isReplicaSet) {
      this.log.info(
        `Connected to Replica Set: ${config.connection.members
                                    ? config.connection.members.join(', ')
                                    : config.connection.host}`
      );
    }

    this.db = this.mongoose.connection.db;
    this.connection = this.mongoose.connection;
    return this.connection;
  }

  /**
   * Get native collection by name
   * @param  {String} name — name of collection
   * @return {MongoDB.Collection}
   */
  collection(name) {
    if (!this.db) throw new Error('You should connect before get collection');
    return this.db.collection(name);
  }

  /**
   * down kubik
   * @return {Promise}
   */
  async down() {
    await this.mongoose.disconnect();
    this.reset();
  }

  /**
   * Add plugin for a Model or models
   * @param  {Function|Object} plugin plugin to add
   */
  plugin(plugin) {
    this.plugins.push(plugin);
    return this;
  }

  async after() {
    await this.processHooksAsync('after');
  }
}

Mongoose.prototype.name = 'storage';
Mongoose.prototype.dependencies = Object.freeze(['config', 'log']);

module.exports = Mongoose;
