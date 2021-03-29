const DB_NAME = "TickerDB";
const STORE_NAME = "Tickers";
const DB_VERSION = 1;

let tickerStore = null;

/**
 * ticker data structure:
 * {
 *  name: String
 *  price: String
 * }
 */

const initializeDB = async () => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  // if DB is exist
  request.onsuccess = async event => {
    const db = event.target.result;

    const tickerTransaction = await db.transaction(STORE_NAME, "readwrite");
    tickerStore = tickerTransaction.objectStore(STORE_NAME);
    console.log(
      "🚀 ~ file: storeLogic.js ~ line 24 ~ tickerStore",
      tickerStore
    );
  };

  // if DB does not exist or the DB version is old
  request.onupgradeneeded = async event => {
    const db = event.target.result;
    await db.createObjectStore(STORE_NAME, { keyPath: "name" });
  };

  request.onerror = function(event) {
    console.log(event);
  };
};

if (indexedDB) {
  initializeDB();
}

export const getTickerData = async tickerName => {
  if (!tickerStore) return null;
  try {
    const ticker = await tickerStore.get(tickerName);
    return ticker;
  } catch (error) {
    return null;
  }
};

export const setTickerData = async ({ name, price }) => {
  if (!tickerStore) return;
  try {
    await tickerStore.put({ name, price });
  } catch (error) {
    return;
  }
};

export const removeTicker = async name => {
  await tickerStore.delete(name);
};

// get all tickers for new session (from previous session or tab)
export const getSavedTicker = async () => {
  if (!tickerStore) return null;
  try {
    const tickers = await tickerStore.getAll();
    return tickers;
  } catch (error) {
    return null;
  }
};
