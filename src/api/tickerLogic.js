import { CURRENCY } from "../constants";
import { ALTERNATIVE_CURRENCY } from "./constants";
const CURRENCY_MESSAGE = "5";
const ERROR_SUBSCRIPTION = "500";
const ERROR_SUBSCRIPTION_MESSAGE = "INVALID_SUB";

let btcUsd = 0;

const convertPrice = value => {
  return value * btcUsd;
};

/**
 * @param {event.data from ws.onmessage} data
 * @returns {
 *    ticker, - ticker name
 *    price?, - price in CURRENCY (or any of error)
 *    currencyError?, - boolean (have no price in CURRENCY)
 *    subscriptionError?, - boolean (wrong tickers)
 *  }
 */
export const getTickerDataFromResponse = data => {
  const {
    TYPE: type,
    PRICE: price,
    FROMSYMBOL: currentTicker,
    TOSYMBOL: currency,
    PARAMETER: parameter,
    MESSAGE: message
  } = JSON.parse(data);

  if (type == CURRENCY_MESSAGE && price !== undefined) {
    let tickerPrice = price;

    if (currentTicker === ALTERNATIVE_CURRENCY) btcUsd = price;
    else if (currency === ALTERNATIVE_CURRENCY)
      tickerPrice = convertPrice(price);

    return { ticker: currentTicker, price: tickerPrice };
  } else if (
    type === ERROR_SUBSCRIPTION &&
    message === ERROR_SUBSCRIPTION_MESSAGE
  ) {
    const [, , tickerName, currency] = parameter.split("~");
    const errorResult = { ticker: tickerName };

    if (currency === CURRENCY) errorResult.currencyError = true;
    else errorResult.subscriptionError = true;

    return errorResult;
  }
  return null;
};
