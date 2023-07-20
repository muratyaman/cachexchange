const { randomUUID } = require('crypto');
const { OPS, amqpConfig, cacherConfig, amqpSettings } = require('./constants');
const { makeAmqpClient } = require('./amqpClient');
const { makeCacher } = require('./cacher');

function makeCacheXchange({
  amqp = { ...amqpConfig, prefetchMessageCount: amqpSettings.prefetchMessageCount  },
  cache = cacherConfig,
  onAmqpSetup = async ({ queueName, exchangeName }) => {},
  onAmqpError = (err) => { throw err; },
}) {

  const sid = randomUUID(); // for sender ID

  const _cacher = makeCacher(cache);

  const _amqpClient = makeAmqpClient({
    ...amqp,
    onSetup: onAmqpSetup,
    onError: onAmqpError,
    onMessage: async (message) => {
      // console.info('message received at', sid, message);
      const contentStr = message.content.toString();
      const content = JSON.parse(contentStr);
      // console.info('message content received at', sid, content);

      // sender does it first
      if (content.sid === sid) return;

      const { op, k, v } = content;
      if (op === OPS.SET) {
        await _cacher.setItem(k, v);
      } else if (op === OPS.DEL) {
        await _cacher.delItem(k);
      }
    },
  });

  async function getItem(k) {
    return _cacher.getItem(k);
  }

  async function setItem(k, v) {
    // do it
    await _cacher.setItem(k, v);
    // inform others
    try {
      await _amqpClient.publish({ op: OPS.SET, k, v, sid });
      return Promise.resolve(true);
    } catch (err) {
      onAmqpError(err);
      return Promise.resolve(false);
    }
  }

  async function delItem(k) {
    // do it
    await _cacher.delItem(k);
    // inform others
    try {
      await _amqpClient.publish({ op: OPS.DEL, k, sid });
      return Promise.resolve(true);
    } catch (err) {
      onAmqpError(err);
      return Promise.resolve(false);
    }
  }

  return {
    _amqpClient,
    _cacher,
    _id: sid,
    setItem,
    getItem,
    delItem,
  };
}

module.exports = {
  makeCacheXchange,
};
