import AppButton from "./components/AppButton.vue";
import AppTickerBlock from "./components/AppTickerBlock.vue";
import AppSpinner from "./components/AppSpinner.vue";
import AppNewTickerBlock from "./components/AppNewTickerBlock.vue";
import AppTickerChart from "./components/AppTickerChart.vue";

const headers = {
  Authorization: "Apikey " + process.env.VUE_APP_API_KEY
};

const CURRENCY = "USD";
const REFRESH_PERIOD = 3000;
const MAX_TICKER_PER_PAGE = 6;
const LOCAL_STORAGE = "cryptonomicon_key";
const MAX_PRICES_IN_GRAPH = 50;

export default {
  name: "App",
  components: {
    AppButton,
    AppTickerBlock,
    AppSpinner,
    AppNewTickerBlock,
    AppTickerChart
  },
  data: function() {
    return {
      intervalId: null,
      tickerName: "",
      tickerError: false,
      tickers: [],
      activeTicker: null,
      graph: [],
      coins: null,
      coinsExample: [],
      page: 1,
      filter: "",
      currency: CURRENCY
    };
  },
  created() {
    async function getCoinList() {
      const result = await fetch(
        "https://min-api.cryptocompare.com/data/all/coinlist?summary=true",
        { headers: headers }
      );
      const data = await result.json();
      const coinsData = data.Data;
      const values = Object.values(coinsData);

      this.coins = values.map(coin => coin.Symbol);
    }

    this.intervalId = setInterval(async () => {
      if (this.tickersString) {
        const result = await fetch(
          `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${this.tickersString}&tsyms=${CURRENCY}&api_key=${process.env.VUE_APP_API_KEY}`
        );
        const data = await result.json();

        this.tickersArray.forEach(tickerName => {
          const tickerData = data[tickerName];
          if (tickerData) {
            this.updateTicker(tickerName, tickerData);
          }
        });
      }
    }, REFRESH_PERIOD);

    getCoinList.call(this);

    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    if (windowData.filter) {
      if (this.filter !== windowData.filter) this.filter = windowData.filter;
    }

    if (windowData.page) {
      this.page = windowData.page;
    }

    const tickersData = localStorage.getItem(LOCAL_STORAGE);
    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
    }
  },
  beforeUnmount() {
    if (this.intervalId) clearInterval(this.intervalId);
  },
  computed: {
    coinsHints() {
      if (this.tickerName) {
        const filteredCoins = this.coins.filter(coin =>
          coin.toLowerCase().includes(this.tickerName.toLowerCase())
        );
        return filteredCoins.slice(0, 4);
      }
      return [];
    },

    tickersArray() {
      return this.tickers.map(ticker => ticker.name);
    },

    tickersString() {
      return this.tickersArray.join(",");
    },

    startIndex() {
      return (this.page - 1) * MAX_TICKER_PER_PAGE;
    },

    endIndex() {
      return this.page * MAX_TICKER_PER_PAGE;
    },

    filteredTickers() {
      return this.tickers.filter(ticker =>
        ticker.name.includes(this.filter.toUpperCase())
      );
    },

    showedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },

    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },

    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page
      };
    },

    normalizedGraph() {
      const maxValue = Math.max(...this.graph);

      const minValue = Math.min(...this.graph);

      return this.graph.map(price => {
        if (maxValue - minValue === 0) return 50;
        return 5 + ((price - minValue) * 95) / (maxValue - minValue);
      });
    }
  },
  watch: {
    filter() {
      this.page = 1;
    },

    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },

    showedTickers() {
      if (this.showedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },

    activeTicker() {
      this.graph = [];
    },

    tickers() {
      localStorage.setItem(LOCAL_STORAGE, JSON.stringify(this.tickers));
    }
  },
  methods: {
    clearActive() {
      this.activeTicker = null;
    },

    setActiveTicker(ticker) {
      this.activeTicker = ticker;
      this.graph = [];
    },

    updateTickerValue(value) {
      this.tickerError = false;
      this.tickerName = value;
    },

    addTicker() {
      if (this.tickerName) {
        const newTickerName = this.tickerName.toUpperCase();
        if (this.tickers.findIndex(t => t.name === newTickerName) >= 0) {
          this.tickerError = true;
          return;
        }
        this.coinsExample = [];
        const currentTickers = {
          name: newTickerName,
          price: "-"
        };

        this.tickers = [...this.tickers, currentTickers];
        this.tickerName = "";
      }
    },

    updateTicker(tickerName, tickerData) {
      this.tickers.find(t => t.name === tickerName).price =
        tickerData[CURRENCY];
      if (this.activeTicker && this.activeTicker.name === tickerName)
        this.graph.push(tickerData[CURRENCY]);
      if (this.graph.length > MAX_PRICES_IN_GRAPH) {
        this.graph = this.graph.slice(-MAX_PRICES_IN_GRAPH);
      }
    },

    removeTicker(ticker) {
      clearInterval(ticker.intervalId);
      if (this.activeTicker === ticker) {
        this.clearActive();
      }
      this.tickers = this.tickers.filter(t => t !== ticker);
    }
  }
};
