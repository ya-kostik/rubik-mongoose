const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestASchema = Schema({ name: String });
const TestBSchema = Schema({ name: String });
const TestCSchema = Schema({ name: String });

module.exports = [
  { name: 'TestA', schema: TestASchema, collection: 'TestsA' },
  { name: 'TestB', schema: TestBSchema, collection: 'TestB' },
  { name: 'TestC', schema: TestCSchema }
];
