/* eslint-disable */
import { CURRENCY } from "../constants";
import { ALTERNATIVE_CURRENCY, SUBSCRIBE } from "./constants";
import { removeTicker, setTickerData } from "./storeLogic";
import { getTickerDataFromResponse } from "./tickerLogic";

const ws = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${process.env.VUE_APP_API_KEY}`
);

const ports = [];
/**
 * tickersSubscriptions -
 * ticker: {
 *    currency: CURRENCY|ALTERNATIVE_CURRENCY
 *    count: number
 * }
 */
const tickersSubscriptions = {};

onconnect = function(event) {
  const [newPort] = event.ports;
  ports.push(newPort);

  ws.onmessage = function(event) {
    const { data } = event;
    const result = getTickerDataFromResponse(data);
    if (!result) return
    const { ticker, price, currencyError, subscriptionError } = result;

    let message = { ticker };

    if (currencyError) {
      // if currencyError
      // change currency
      tickersSubscriptions[ticker].currency = ALTERNATIVE_CURRENCY;
      // subscribe to the alternative exchange rate currency
      sendSubscriptionMessage(ticker, ALTERNATIVE_CURRENCY);
      return;
    } else if (subscriptionError) {
      // else if subscriptionError - post error, remove from store, tickersSubscriptions
      message.error = true;
      unsubscribeFromTicker(ticker, true);
    } else {
      // else - post currency data and update store
      message.price = price;

      // update store
      setTickerData({ name: ticker, price });
    }

    for (const port of ports) {
      port.postMessage(message);
    }
  };

  const subscribeOnWS = ticker => {
    if (tickersSubscriptions[ticker]) {
      tickersSubscriptions[ticker].count += 1;
    } else {
      tickersSubscriptions[ticker] = {
        currency: CURRENCY,
        count: 1
      };

      sendSubscriptionMessage(ticker, CURRENCY);
    }
  };

  const sendSubscriptionMessage = (ticker, currency) => {
    sendMessageToWS(
      JSON.stringify({
        action: "SubAdd",
        subs: [`5~CCCAGG~${ticker}~${currency}`]
      })
    );
  };

  const unsubscribeFromTicker = (ticker, isErrorSubscription = false) => {
    if (tickersSubscriptions[ticker].count > 1) {
      tickersSubscriptions[ticker].count -= 1;
    } else {
      const { currency } = tickersSubscriptions[ticker];
      delete tickersSubscriptions[ticker];
      removeTicker(ticker);

      if (!isErrorSubscription)
        sendMessageToWS(
          JSON.stringify({
            action: "SubRemove",
            subs: [`5~CCCAGG~${ticker}~${currency}`]
          })
        );
    }
  };

  const sendMessageToWS = function(message) {
    if (ws.readyState === 1) {
      ws.send(message);
    } else {
      // optional: implement backoff for interval here
      setTimeout(function() {
        sendMessageToWS(message);
      }, 500);
    }
  };

  newPort.onmessage = function(e) {
    const { type, ticker } = e.data;

    if (type === SUBSCRIBE) {
      subscribeOnWS(ticker);
    } else {
      unsubscribeFromTicker(ticker);
    }
  };
};
