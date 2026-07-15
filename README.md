# AdForge — Web3 Ad Platform (Simulator)

> **Fictional simulation. 18+.** AdForge is an interactive demo of a Web3 advertising
> platform. There is **no real money, tokens, advertising, or investment**. On-chain
> auctions, NFT ad slots, and Credits are simulated in your browser and have no
> real-world value. This is not a securities or investment product.

## What it is

A single-page (PWA) prototype that lets you explore how a voice-driven Web3 ad
marketplace could work:

- **Create ads** with a voice creative, budget, and interest targeting.
- **Targeting → audience:** free-text interests are matched to real audience
  segments; the app estimates reach, relevance, CPM, and CTR from your targeting.
- **Delivery engine:** running a campaign really consumes its budget at the
  effective CPM and accrues internally-consistent impressions, clicks, and spend
  (frequency-capped by audience reach). No random inflation — every number derives
  from the audience you chose.
- **Performance analysis:** a data-grounded report compares realized CTR to the
  segment benchmark and gives an actionable recommendation.
- **Auctions & NFT slots:** simulated Dutch auctions and ERC-721-style ad slots.
- **Publisher mode:** list content slots and earn simulated Credits.
- **Live, Metaverse, Ideas, Vault, Plans:** additional simulated inventory and
  campaign tools.

## Run it

Static files — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

No build step and no external network dependencies.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell and views |
| `script.js` | Targeting/delivery engine, auctions, UI logic |
| `style.css` | Styling |
| `manifest.json`, `sw.js` | PWA metadata and service-worker stub |

## Disclaimers

- **Fictional / simulated only.** Nothing here transacts real value.
- **18+.** Adult-labeled demo content is gated behind an age confirmation.
- **Rates match code.** All displayed fees, odds, and rates correspond to the
  values in the source.
