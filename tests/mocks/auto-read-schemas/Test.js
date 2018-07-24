const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestSchema = Schema({
  name: String
});

module.exports = {
  name: 'Test', schema: TestSchema, collection: 'Tests'
};
