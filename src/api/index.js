import { SUBSCRIBE, UNSUBSCRIBE } from "./constants";
import { getSavedTickers, getTickerData } from "./storeLogic";

/**
 * tickerHandlerRecord = {
 *   callbacks: [],
 * }
 */
const tickerHandler = new Map();

const myWorker = new SharedWorker("./worker", { type: "module" });

myWorker.port.onmessage = event => {
  const { ticker, price, error } = event.data;

  if (price) {
    updateTickerData(ticker, price);
  } else if (error) {
    sendTickerError(ticker);
  }
};

const updateTickerData = (currentTicker, price) => {
  const tickerData = tickerHandler.get(currentTicker);
  if (tickerData) {
    const { callbacks } = tickerData;
    if (callbacks) {
      for (const callback of callbacks) callback(currentTicker, { price });
    }
  }
};

const sendTickerError = ticker => {
  const { callbacks } = tickerHandler.get(ticker);

  for (const callback of callbacks) callback(ticker, { error: true });
  tickerHandler.delete(ticker);
};

const sendMessageToWS = message => {
  myWorker.port.postMessage(message);
};

const subscribeOnWS = ticker => {
  sendMessageToWS({ type: SUBSCRIBE, ticker });
};

const unsubscribeFromWS = ticker => {
  sendMessageToWS({ type: UNSUBSCRIBE, ticker });
};

export const subscribeToTickerDataUpdate = async (ticker, callback) => {
  const currentValue = await getTickerData(ticker);
  let price = currentValue ? currentValue : "-";

  callback(ticker, { price });

  const tickerData = tickerHandler.get(ticker);
  if (!tickerData) {
    tickerHandler.set(ticker, {
      callbacks: [callback]
    });
    // add subscription in WS
    subscribeOnWS(ticker);
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
      unsubscribeFromWS(ticker);
      tickerHandler.delete(ticker);
    } else {
      tickerHandler.set(ticker, newCallbacks);
    }
  }
};

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

export const getStoredTickers = async () => {
  const tickers = await getSavedTickers();

  return tickers;
};
