const DEFAULT_CHUNK_SIZE = 10;

/**
 * Execute cb for each cursor element in parallel parts
 * The size of the part executed in parallel is determined by the chunkSize argument.
 * @param  {Cursor}   cursor
 * @param  {Function} cb is an async callback for element
 * @param  {Number}   chunkSize is a count of parallel callbacks
 * @return {Promise}
 */
async function every(cursor, cb, chunkSize = DEFAULT_CHUNK_SIZE) {
  let promisses = [];
  let index = 0;
  for await (const item of cursor) {
    if (promisses.length >= chunkSize) {
      await Promise.all(promisses);
      promisses = [];
    }
    promisses.push(cb(item, index++));
  }
  await Promise.all(promisses);
}

module.exports = every;
