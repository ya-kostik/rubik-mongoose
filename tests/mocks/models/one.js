const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestDSchema = Schema({ name: String });

module.exports = { name: 'TestD', schema: TestDSchema };
