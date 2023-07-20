require('dotenv').config();
const express = require('express');
const newCacheXchange = require('../src');

const httpPort = process.env.PORT || '8080';

const app = express();

const cacheXchange = newCacheXchange({
  cache: {
    stdTTL: 60, // 1 minute
  },
  amqp: {
    url: process.env.AMQP_URL,
    exchangeName: process.env.AMQP_EXCHANGE_NAME,
    prefetchMessageCount: 100, // default is 1
  },
  onAmqpSetup: async ({ queueName, exchangeName }) => {
    console.info('amqp ready', { queueName, exchangeName });
  },
  onAmqpError: (err) => { console.error(err); },
});

app.use(express.json());

async function handlePost(req, res) {
  const ts = Date.now();
  const tsStr = String(ts);
  // last 2 digits so that we can hit cache sometimes
  const { id = tsStr.substring(tsStr.length - 2) } = req.params || req.query || {};

  const cached = await cacheXchange.getItem(id);
  if (cached) {
    res.json({ data: cached, cacheHit: true });
  } else {
    const data = { ts, id, message: 'Hello World!' };
    res.json({ data, cacheMiss: true });
    await cacheXchange.setItem(id, data);
  }
}

async function handleGet(req, res) {
  const ts = Date.now();
  const tsStr = String(ts);
  // last 2 digits so that we can hit cache sometimes
  const { id = tsStr.substring(tsStr.length - 2) } = req.params || req.query || {};

  const cached = await cacheXchange.getItem(id);
  res.json({ data: cached, cacheHit: !!cached, cacheMiss: !cached });
}

app.post('/:id', handlePost);
app.post('/', handlePost);
app.get('/:id', handleGet);
app.get('/', handleGet);

app.listen(httpPort, () => {
  console.log('Sample service for cacheXchange is ready at', httpPort, 'id', cacheXchange._id);
});
