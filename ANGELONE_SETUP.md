# Angel One Setup

This project now has a localhost-only Angel One bridge for ATM option selling.

## How it works

1. Put your broker credentials in `.env.local` using `.env.example` as the template.
2. Restart the Vite dev server.
3. Restart the Vite dev server after any `.env.local` change.
4. In the app, configure the `Angel One Execution Setup` card before analysis.
5. Turn on auto fire only when you want the live order to be placed immediately after a valid AI signal.
6. Use the `Angel One ATM Sell` panel under the AI result for manual retries or preview checks.

## Required settings

```env
ANGELONE_API_KEY=your_smartapi_key
ANGELONE_CLIENT_CODE=your_client_code
ANGELONE_PASSWORD=your_password
ANGELONE_DEFAULT_MODE=preview
ANGELONE_PRODUCT_TYPE=INTRADAY
ANGELONE_ORDER_TYPE=MARKET
ANGELONE_ORDER_VARIETY=NORMAL
ANGELONE_ORDER_DURATION=DAY
ANGELONE_LOTS=1
ANGELONE_STRIKE_STEP=50
ANGELONE_MIN_CONFIDENCE=60
ANGELONE_SYMBOL_NAME=NIFTY
ANGELONE_SPOT_EXCHANGE=NSE
ANGELONE_SPOT_TRADING_SYMBOL=Nifty 50
ANGELONE_SPOT_SYMBOL_TOKEN=99926000
```

## Important notes

- Credentials stay on the local Vite server side and are not exposed in the React bundle.
- The app asks for the current Angel One TOTP each time you place a live order.
- Live orders log in to Angel One, fetch the configured NIFTY spot quote from Angel One, round it to the nearest `ANGELONE_STRIKE_STEP`, and then select the nearest-expiry ATM `NIFTY` option contract from Angel One's instrument master.
- Preview mode still uses the AI entry level to prepare the order without touching the broker.
- The default order is `SELL` + `MARKET` + `INTRADAY` in `NFO`.

## Safer workflow

- Keep `ANGELONE_DEFAULT_MODE=preview`.
- Review the prepared symbol, expiry, strike, and quantity.
- Only then switch the in-app mode to `Live` or enable auto fire.
