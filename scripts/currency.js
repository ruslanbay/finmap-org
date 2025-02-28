async function getExchangeRates(currency) {
  let exchangeRates;
  
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/finmap-org/data-currency/refs/heads/main/marketdata/${currency}perUSD.json?_=${new Date().toISOString().split("T")[0]}`);
    if (!response.ok) {
      alert("Oops! Nothing's here");
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    exchangeRates = await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  return exchangeRates;
}

async function getExchangeRateByDate(exchangeRates, date, currency) {
  let rate = exchangeRates[date];
  let d = new Date(date);
  let limit = 14;
  while (typeof rate == "undefined" && limit >= 0) {
    limit = limit - 1;
    d.setDate(d.getUTCDate() - 1);
    let prevDate = d.toISOString().split("T")[0];
    rate = exchangeRates[prevDate];
  }

  if (typeof rate == "undefined") {
    rate = 1;
    currencyToggle();
  }

  return rate;
}
