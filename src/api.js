const tickerHandler = new Map();
export const CURRENCY = "USD";
const AGGREGATE_INDEX = "5";

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

const getCurrentPrice = async ticker => {
  const result = await fetch(
    `https://min-api.cryptocompare.com/data/price?fsym=${ticker}&tsyms=${CURRENCY}&api_key=${process.env.VUE_APP_API_KEY}`
  );
  const tickersData = await result.json();

  return tickersData[CURRENCY];
};

const ws = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${process.env.VUE_APP_API_KEY}`
);

ws.onmessage = event => {
  const { TYPE: type, PRICE: price, FROMSYMBOL: currentTicker } = JSON.parse(
    event.data
  );
  if (type !== AGGREGATE_INDEX || price === undefined) return;

  // sometimes cryptocompare return price=undefined
  const callback = tickerHandler.get(currentTicker);
  if (callback) callback(currentTicker, price);
};

const sendMessageToWS = message => {
  ws.send(JSON.stringify(message));
};

const subscribeToTickerDataOnServer = ticker => {
  sendMessageToWS({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
};

const unsubscribeFromTickerDataOnServer = ticker => {
  sendMessageToWS({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${CURRENCY}`]
  });
};

export const subscribeToTickerDataUpdate = async (ticker, callback) => {
  const subscribers = tickerHandler.get(ticker);
  if (!subscribers) {
    subscribeToTickerDataOnServer(ticker);
    tickerHandler.set(ticker, callback);

    // get current price (for slow updated tickers)
    const currentTickerPrice = await getCurrentPrice(ticker);
    callback(ticker, currentTickerPrice);
  }
};

export const unsubscribeFromTickerDataUpdate = ticker => {
  tickerHandler.delete(ticker);
  unsubscribeFromTickerDataOnServer(ticker);
};
