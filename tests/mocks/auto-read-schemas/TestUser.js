const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestUserSchema = Schema({
  login: String,
  passwordString: String
});

module.exports = TestUserSchema;
