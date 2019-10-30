const every = require('../lib/every-chunk');

async function everyChunk(query, cb, fields, options = {}) {
  const { limit, skip, chunkSize } = options;
  let find = this.find(query, fields);
  if (skip) find = find.skip(skip);
  if (limit) find = find.limit(limit);

  const cursor = find.cursor();

  return every(cursor, cb, chunkSize);
}

module.exports = function(Schema) {
  Schema.static('every', everyChunk);
}
