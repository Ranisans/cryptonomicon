/* eslint-disable no-undef */
const ws = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${process.env.VUE_APP_API_KEY}`
);

const ports = [];

onconnect = function(event) {
  const newPort = event.ports[0];
  ports.push(newPort);

  ws.onmessage = function(event) {
    for (port of ports) {
      port.postMessage(event.data);
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
    sendMessageToWS(e.data.message);
  };
};
