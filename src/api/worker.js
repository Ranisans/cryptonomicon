/* eslint-disable */
import { SUBSCRIBE, UNSUBSCRIBE } from "./constants";

const ws = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${process.env.VUE_APP_API_KEY}`
);

const ports = [];
const tickersSubscriptions = {};

onconnect = function(event) {
  const [newPort] = event.ports;
  ports.push(newPort);

  ws.onmessage = function(event) {
    for (const port of ports) {
      port.postMessage(event.data);
    }
  };

  const subscribeOnWS = ({ ticker, currency }, key) => {
    if (tickersSubscriptions[key]) {
      tickersSubscriptions[key] += 1;
    } else {
      tickersSubscriptions[key] = 1;

      sendMessageToWS(
        JSON.stringify({
          action: "SubAdd",
          subs: [`5~CCCAGG~${ticker}~${currency}`]
        })
      );
    }
  };

  const unsubscribeFromWS = ({ ticker, currency }, key) => {
    if (tickersSubscriptions[key] > 1) {
      tickersSubscriptions[key] -= 1;
    } else {
      delete tickersSubscriptions[key];
      sendMessageToWS(
        JSON.stringify({
          action: "SubRemove",
          subs: [`5~CCCAGG~${ticker}~${currency}`]
        })
      );
    }
  };

  const removeTickersSubscription = function(key) {
    if (tickersSubscriptions[key] > 1) {
      tickersSubscriptions[key] -= 1;
    } else {
      delete tickersSubscriptions[key];
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
    const { type, props } = e.data;

    const key = `${props.ticker}-${props.currency}`;

    if (type === SUBSCRIBE) {
      subscribeOnWS(props, key);
    } else if (type === UNSUBSCRIBE) {
      unsubscribeFromWS(props, key);
    } else {
      removeTickersSubscription(key);
    }
  };
};
