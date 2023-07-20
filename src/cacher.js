const NodeCache = require('node-cache');
const { cacherConfig } = require('./constants');

function makeCacher({
  stdTTL = cacherConfig.stdTTL,
  checkperiod = cacherConfig.checkperiod,
}) {
  const _cacher = new NodeCache({
    stdTTL, // (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
    checkperiod, // (default: 600) 
  });

  return {
    _cacher,
    setItem: async (k, v) => Promise.resolve(_cacher.set(k, v)),
    getItem: async (k) => Promise.resolve(_cacher.get(k)),
    delItem: async (k) => Promise.resolve(_cacher.del(k)),
  };
}

module.exports = {
  makeCacher,
};
