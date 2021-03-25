import { CURRENCY } from "../constants";
import { REMOVE_WRONG_SUBSCRIPTION, SUBSCRIBE, UNSUBSCRIBE } from "./constants";

/**
 * tickerHandlerRecord = {
 *   callbacks: [],
 *   currency: USD || BTC
 * }
 */
const tickerHandler = new Map();
const ALTERNATIVE_CURRENCY = "BTC";
const CURRENCY_MESSAGE = "5";
const ERROR_SUBSCRIPTION = "500";
const ERROR_SUBSCRIPTION_MESSAGE = "INVALID_SUB";

let btcUsd = 0;

const myWorker = new SharedWorker("./worker", { type: "module" });

myWorker.port.onmessage = event => {
  const {
    TYPE: type,
    PRICE: price,
    FROMSYMBOL: currentTicker,
    TOSYMBOL: currency,
    PARAMETER: parameter,
    MESSAGE: message
  } = JSON.parse(event.data);

  if (type == CURRENCY_MESSAGE && price !== undefined) {
    updateTickerData(currentTicker, price, currency);
  } else if (
    type === ERROR_SUBSCRIPTION &&
    message === ERROR_SUBSCRIPTION_MESSAGE
  ) {
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
  const tickerData = tickerHandler.get(currentTicker);
  if (tickerData) {
    const { callbacks } = tickerData;
    if (callbacks) {
      let tickerPrice = price;
      if (currency === ALTERNATIVE_CURRENCY) {
        tickerPrice = convertPrice(price);
      }
      for (const callback of callbacks)
        callback(currentTicker, { price: tickerPrice });
    }
  }
};

const errorSubscriptionProcessing = parameter => {
  const [, , tickerName, currency] = parameter.split("~");

  removeWrongSubscription(tickerName, currency);
  if (currency === CURRENCY) {
    // add subscription in WS with currency = BTC
    subscribeOnWS(tickerName, ALTERNATIVE_CURRENCY);
  } else {
    const { callbacks } = tickerHandler.get(tickerName);
    // send error for all callback
    for (const callback of callbacks) callback(tickerName, { error: true });
    tickerHandler.delete(tickerName);
  }
};

const sendMessageToWS = message => {
  myWorker.port.postMessage(message);
};

const subscribeOnWS = (ticker, currency) => {
  sendMessageToWS({ type: SUBSCRIBE, props: { ticker, currency } });
};

const unsubscribeFromWS = (ticker, currency) => {
  sendMessageToWS({ type: UNSUBSCRIBE, props: { ticker, currency } });
};

const removeWrongSubscription = (ticker, currency) => {
  sendMessageToWS({
    type: REMOVE_WRONG_SUBSCRIPTION,
    props: { ticker, currency }
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
      tickerHandler.set(ticker, newCallbacks);
    }
  }
};

subscribeToTickerDataUpdate(ALTERNATIVE_CURRENCY, setBtcUsdCourse);

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
