/**
 * tickerHandlerRecord = {
 *   callbacks: [],
 *   currency: USD || BTC
 * }
 */
const tickerHandler = new Map();
export const CURRENCY = "USD";
const ALTERNATIVE_CURRENCY = "BTC";
const CURRENCY_MESSAGE = "5";
const ERROR_SUBSCRIPTION = "500";

let btcUsd = 0;

export const getCoinList = async () => {
  const headers = {
    Authorization: "Apikey " + process.env.VUE_APP_API_KEY
  };
  const result = await fetch(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true",
    { headers: headers }
  );
  const data = await result.json();
  const coinsData = data.Data;
  const values = Object.values(coinsData);

  const resultData = values.map(coin => coin.Symbol);
  return resultData;
};

const ws = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${process.env.VUE_APP_API_KEY}`
);

ws.onmessage = event => {
  const {
    TYPE: type,
    PRICE: price,
    FROMSYMBOL: currentTicker,
    TOSYMBOL: currency,
    PARAMETER: parameter
  } = JSON.parse(event.data);

  if (type == CURRENCY_MESSAGE && price !== undefined) {
    updateTickerData(currentTicker, price, currency);
  } else if (type === ERROR_SUBSCRIPTION) {
    errorSubscriptionProcessing(parameter);
  }
};

const setBtcUsdCourse = (_, { price }) => {
  btcUsd = price;
};

const convertPrice = value => {
  return value * btcUsd;
};

const updateTickerData = (currentTicker, price, currency) => {
  const { callbacks } = tickerHandler.get(currentTicker);
  if (callbacks) {
    let tickerPrice = price;
    if (currency === ALTERNATIVE_CURRENCY) {
      tickerPrice = convertPrice(price);
    }
    for (const callback of callbacks)
      callback(currentTicker, { price: tickerPrice });
  }
};

const errorSubscriptionProcessing = parameter => {
  const [, , tickerName, currency] = parameter.split("~");

  if (currency === CURRENCY) {
    // add subscription in WS with currency = BTC
    subscribeOnWS(tickerName, ALTERNATIVE_CURRENCY);
  } else {
    const { callbacks } = tickerHandler.get(tickerName);
    // send error for all callback
    tickerHandler.delete(tickerName);
    for (const callback of callbacks) callback(tickerName, { error: true });
    // remove subscription in WS
  }
};

const sendMessageToWS = message => {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  } else {
    // optional: implement backoff for interval here
    setTimeout(function() {
      sendMessageToWS(message);
    }, 500);
  }
};

const subscribeOnWS = (ticker, currency) => {
  sendMessageToWS({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${currency}`]
  });
};

const unsubscribeFromWS = (ticker, currency) => {
  sendMessageToWS({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${currency}`]
  });
};

export const subscribeToTickerDataUpdate = (ticker, callback) => {
  const tickerData = tickerHandler.get(ticker);
  if (!tickerData) {
    tickerHandler.set(ticker, {
      callbacks: [callback],
      currency: CURRENCY
    });
    // add subscription in WS
    subscribeOnWS(ticker, CURRENCY);
  } else {
    tickerData.callbacks.push(callback);
  }
};

export const unsubscribeFromTickerDataUpdate = (ticker, callback) => {
  const tickerData = tickerHandler.get(ticker);
  if (tickerData) {
    const newCallbacks = tickerData.callbacks.filter(t => t !== callback);
    if (newCallbacks.length === 0) {
      // remove subscription in WS
      unsubscribeFromWS(ticker, tickerData.currency);
      tickerHandler.delete(ticker);
    } else {
      tickerData.set(ticker, newCallbacks);
    }
  }
};

ws.onopen = function() {
  subscribeToTickerDataUpdate(ALTERNATIVE_CURRENCY, setBtcUsdCourse);
};
