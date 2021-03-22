const tickerHandler = new Map();
export const CURRENCY = "USD";
const CURRENCY_MESSAGE = "5";
const ERROR_SUBSCRIPTION = "500";

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
  const messageData = JSON.parse(event.data);
  const {
    TYPE: type,
    PRICE: price,
    FROMSYMBOL: currentTicker,
    PARAMETER: parameter
  } = messageData;
  if (
    (type === CURRENCY_MESSAGE && price !== undefined) ||
    type === ERROR_SUBSCRIPTION
  ) {
    // sometimes cryptocompare return price=undefined

    if (type === ERROR_SUBSCRIPTION) {
      // "5~CCCAGG~1231314~USD" - example
      const tickerName = parameter.split("~")[2];
      const callback = tickerHandler.get(tickerName);
      if (callback) {
        callback(tickerName, { error: true });
      }
      return;
    }

    const callback = tickerHandler.get(currentTicker);
    if (callback) {
      callback(currentTicker, { price });
    }
  }
};

const sendMessageToWS = message => {
  ws.send(JSON.stringify(message));
};

const subscribeToTickerDataOnServer = ticker => {
  sendMessageToWS({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${CURRENCY}`]
  });
};

const unsubscribeFromTickerDataOnServer = ticker => {
  sendMessageToWS({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${CURRENCY}`]
  });
};

export const subscribeToTickerDataUpdate = (ticker, callback) => {
  const subscribers = tickerHandler.get(ticker);
  if (!subscribers) {
    subscribeToTickerDataOnServer(ticker);
    tickerHandler.set(ticker, callback);
  }
};

export const unsubscribeFromTickerDataUpdate = ticker => {
  tickerHandler.delete(ticker);
  unsubscribeFromTickerDataOnServer(ticker);
};
