<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <app-spinner :isVisible="!coins" />

    <div class="container">
      <app-new-ticker-block
        :tickerName="tickerName"
        :tickerError="tickerError"
        :coinsHints="coinsHints"
        :addTicker="addTicker"
        @update="updateTickerValue"
      />
      <template v-if="tickers.length > 0">
        <hr class="w-full border-t border-gray-600 my-4" />
        <div>
          <app-button @click="() => (page -= 1)" :disabled="page <= 1">
            Назад
          </app-button>

          <app-button @click="() => (page += 1)" :disabled="!hasNextPage">
            Вперед
          </app-button>

          <div>Фильтр: <input v-model="filter" /></div>
        </div>
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <app-ticker-block
            v-for="ticker in showedTickers"
            :key="ticker.name"
            :ticker="ticker"
            :currency="currency"
            @active="setActiveTicker"
            @remove="removeTicker"
          />
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <app-ticker-chart
        :activeTicker="activeTicker"
        :graphData="normalizedGraph"
        :currency="currency"
        @clear="clearActive"
      />
    </div>
  </div>
</template>

<script src="./app.js"></script>

<style></style>
