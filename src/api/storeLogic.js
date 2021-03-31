const DB_NAME = "TickerDB";
const STORE_NAME = "Tickers";
const DB_VERSION = 1;

let db = null;

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
    db = event.target.result;
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

const getStore = (readonly = false) => {
  const tickerTransaction = db.transaction(
    STORE_NAME,
    readonly ? "readonly" : "readwrite"
  );
  return tickerTransaction.objectStore(STORE_NAME);
};

export const getTickerData = async tickerName => {
  if (!db) return null;
  try {
    const tickerStore = getStore(true);
    const ticker = await tickerStore.get(tickerName);
    return new Promise((resolve, reject) => {
      ticker.onsuccess = event => {
        resolve(event.target.result);
      };

      ticker.onerror = () => {
        reject([]);
      };
    });
  } catch (error) {
    return null;
  }
};

export const setTickerData = ({ name, price }) => {
  if (!db) return;
  try {
    const tickerStore = getStore();
    tickerStore.add({ name, price });
  } catch (error) {
    return;
  }
};

export const removeTicker = async name => {
  const tickerTransaction = db.transaction(STORE_NAME, "readwrite");
  const tickerStore = tickerTransaction.objectStore(STORE_NAME);
  await tickerStore.delete(name);
};

// get all tickers for new session (from previous session or tab)
export const getSavedTickers = async () => {
  if (!db) return [];
  try {
    const tickerTransaction = db.transaction(STORE_NAME, "readwrite");
    const tickerStore = tickerTransaction.objectStore(STORE_NAME);
    const tickers = await tickerStore.getAll();

    return new Promise((resolve, reject) => {
      tickers.onsuccess = event => {
        resolve(event.target.result);
      };

      tickers.onerror = () => {
        reject([]);
      };
    });
  } catch (error) {
    return [];
  }
};
