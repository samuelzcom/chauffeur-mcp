![Samuelz Chauffeur logo](<https://samuelz.com/favicon/android-chrome-512x512.png>)

# Samuelz Chauffeur

> Auto-generated from Business-OS (single source of truth) by a daily GitHub Action. Do not edit by hand.

Price previews and consent-led unpaid booking offers for the provider’s published service areas.

[Website](<https://samuelz.com/en/integrations>) · [Documentation](<https://samuelz.com/en/integrations>) · [Repository](<https://github.com/samuelzcom/chauffeur-mcp>)

## Endpoints

All endpoints use MCP Streamable HTTP. Tool counts and server versions come from live discovery.

| Variant | URL | Server | Version | Tools |
| --- | --- | --- | --- | ---: |
| full | [https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur](<https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur>) | chauffeur-customer | 2.2.0 | 6 |
| quote-only | [https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur/quote-only](<https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur/quote-only>) | chauffeur-anonymous-quotes | 1.3.0 | 3 |
| info-only | [https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur/info-only](<https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur/info-only>) | chauffeur-service-information | 1.1.0 | 2 |

## Tools per endpoint

### full

| Tool | Description | Read-only |
| --- | --- | --- |
| get\_customer\_policy (Published customer terms) | Use this when checking Samuelz Chauffeur lead time, account requirements and booking confirmation terms. Do not use for service coverage (use get\_service\_options instead). Returns available with observedAt and terms, or unavailable. Lead time is in minutes; interpret dates in the returned time zone and revalidate terms on the eventual offer. This cheap, repeatable read creates nothing. Pass a published offerKey for its location’s terms; omit it for default policy. | Yes |
| get\_offer\_status (Read prepared offer status) | Use this when recovering a submitted offer after a timeout or on return. Do not use for new requests (use prepare\_offer instead).<br><br>For rides A then B, pair A's submissionId with A's resumeToken to read A, even after B. Recovery preserves the original language: there is no locale override.<br><br>pending: retry after retryAfterSeconds; prepared: private checkout/terms links; available: recorded booking state. not\_found does not prove creation failed: check the pair and provider before another attempt.<br><br>The private pair authorizes this stored read without login and expires 24 hours after first submission. There is no provider refresh. Recorded flags do not prove fresh payment or availability. A restart\_ready result is permanent negative execution evidence for its exact submissionId, not a booking or offer. When the customer explicitly asks to resolve an uncertain attempt, resolve\_offer\_attempt can compete safely with an unclaimed original. Status reads themselves never close an attempt. | Yes |
| get\_service\_options (Published service options) | Use this when discovering Samuelz Chauffeur services, areas and time zones. Do not use for terms (use get\_customer\_policy instead). Keep offerKey and locale across policy/price calls so location and language agree; omit the key for discovery. Returns available or unavailable. Anonymous stored read; no price, availability confirmation or writes. | Yes |
| prepare\_offer (Prepare an unpaid offer) | Use this when preparing a customer-requested unpaid Samuelz Chauffeur offer (offerRequested=true). Do not use for prices (use quote\_ride instead). Supply email or E.164 phone. Bind submissionId/resumeToken to unchanged ride, contact, locale, offerKey and partner context. Intake and unpaid state may persist after disconnect. Recover with get\_offer\_status and the original pair. prepared returns private checkoutUrl for customer confirmation/payment before offer.expiresAt. Wait retryAfterSeconds if given; review conflict/ambiguous. This call does not charge, confirm a booking or dispatch work. Subsequent delivery of an explicitly requested offer follows the confirmed communication policy. | No |
| quote\_ride (Price preview) | Use this when pricing a complete anonymous Samuelz Chauffeur ride. Do not use for discovery (use get\_service\_options); check terms with get\_customer\_policy. Keep offerKey and local time zone across calls; omit unknown optional fields. Return follows outbound; hourly has no return. vehiclePreference and specialRequests share 500 characters including 'Vehicle preference: ' and newline. On quoted, show the exact returned bookingUrl including query and fragment. A quote is no booking or availability promise; outside\_service\_area has no price; review\_required needs review. No login/contact. Repeats share REST/MCP budget; wait retryAfterSeconds on rate\_limited. | Yes |
| resolve\_offer\_attempt (Resolve the original offer attempt safely) | Use this when the customer explicitly asks to resolve an earlier offer attempt and continue safely. Do not use for a first request, automatic status polling or retrying an existing execution. Supply resolveRequested=true and the original submissionId/resumeToken pair. This mutating, idempotent operation may durably close an attempt only if it has never been claimed; it never creates an offer, contact, booking, message or payment. Existing executions remain unchanged and their current status is returned. Only restart\_ready with originalRequestClosed=true and the matching submissionId proves the original can no longer execute and permits a separately reviewed new request. pending, ambiguous, unavailable or not\_found do not permit a fresh attempt. Check a lost response with get\_offer\_status using the same pair; never invent another identity or infer a timeout proves failure. Status reads remain read-only. | No |

### quote-only

| Tool | Description | Read-only |
| --- | --- | --- |
| get\_customer\_policy (Published customer terms) | Use this when checking Samuelz Chauffeur lead time, account requirements and booking confirmation terms. Do not use for service coverage (use get\_service\_options instead). Returns available with observedAt and terms, or unavailable. Lead time is in minutes; interpret dates in the returned time zone and revalidate terms on the eventual offer. This cheap, repeatable read creates nothing. Pass a published offerKey for its location’s terms; omit it for default policy. | Yes |
| get\_service\_options (Published service options) | Use this when discovering Samuelz Chauffeur services, areas and time zones. Do not use for terms (use get\_customer\_policy instead). Keep offerKey and locale across policy/price calls so location and language agree; omit the key for discovery. Returns available or unavailable. Anonymous stored read; no price, availability confirmation or writes. | Yes |
| quote\_ride (Price preview) | Use this when pricing a complete anonymous Samuelz Chauffeur ride. Do not use for discovery (use get\_service\_options); check terms with get\_customer\_policy. Keep offerKey and local time zone across calls; omit unknown optional fields. Return follows outbound; hourly has no return. vehiclePreference and specialRequests share 500 characters including 'Vehicle preference: ' and newline. On quoted, show the exact returned bookingUrl including query and fragment. A quote is no booking or availability promise; outside\_service\_area has no price; review\_required needs review. No login/contact. Repeats share REST/MCP budget; wait retryAfterSeconds on rate\_limited. | Yes |

### info-only

| Tool | Description | Read-only |
| --- | --- | --- |
| get\_customer\_policy (Published customer terms) | Use this when checking Samuelz Chauffeur lead time, account requirements and booking confirmation terms. Do not use for service coverage (use get\_service\_options instead). Returns available with observedAt and terms, or unavailable. Lead time is in minutes; interpret dates in the returned time zone and revalidate terms on the eventual offer. This cheap, repeatable read creates nothing. Pass a published offerKey for its location’s terms; omit it for default policy. | Yes |
| get\_service\_options (Published service options) | Use this when discovering Samuelz Chauffeur services, areas and time zones. Do not use for terms (use get\_customer\_policy instead). Keep offerKey and locale across policy/price calls so location and language agree; omit the key for discovery. Returns available or unavailable. Anonymous stored read; no price, availability confirmation or writes. | Yes |

## Published services, areas and languages

Provider: Samuelz Chauffeur.

Services: chauffeur\_transfer, chauffeur\_hourly.

Languages: de, en.

Time zones: Europe/Berlin, Europe/Vienna.

| Published area | Included areas | Time zone |
| --- | --- | --- |
| Munich city | Munich city; Messe München; Munich Airport (MUC); Freising city; Eching; Garching; Hallbergmoos; Ismaning; Neufahrn; Oberschleissheim; Unterfoehring; Unterschleissheim | Europe/Berlin |
| Vienna city | Vienna city; Vienna Airport (VIE) | Europe/Vienna |

## Install

Examples use the default endpoint. Substitute any URL from the endpoints table to choose another variant.

### Claude Code

```sh
claude mcp add --transport http 'samuelz-chauffeur' 'https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur'
```

[Client documentation](https://code.claude.com/docs/en/mcp).

### Claude Desktop and other stdio clients

Add to your client’s MCP configuration. This bridge requires Node.js and downloads `mcp-remote` on the client.

```json
{
  "mcpServers": {
    "samuelz-chauffeur": {
      "args": [
        "-y",
        "mcp-remote",
        "https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur"
      ],
      "command": "npx"
    }
  }
}
```


### Cursor

Save as `.cursor/mcp.json` (also provided in [mcp.json](mcp.json)).

```json
{
  "mcpServers": {
    "samuelz-chauffeur": {
      "url": "https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur"
    }
  }
}
```

[Client documentation](https://cursor.com/docs/context/mcp).

### VS Code

Save as `.vscode/mcp.json`.

```json
{
  "servers": {
    "samuelz-chauffeur": {
      "type": "http",
      "url": "https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur"
    }
  }
}
```

[Client documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

### ChatGPT / Grok

For clients/accounts that support custom remote MCP connectors, use this URL in the custom connector setup:

[https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur](<https://platform.samuelz.com/api/v1/mcp/chauffeur/samuelz-chauffeur>)

## OpenAPI and registry

[OpenAPI specification](<https://platform.samuelz.com/api/v1/public/chauffeur/samuelz-chauffeur/openapi.json>) — Samuelz Chauffeur, version 1.0.0.

Registry name: io.github.samuelzcom/chauffeur-booking. Latest registry version: 1.1.1.

[Official MCP Registry](<https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.samuelzcom%2Fchauffeur-booking>). [server.json](server.json) mirrors the latest entry’s server object.

## Safety and server instructions

The following instructions are published by each live server. Read-only flags above are the server’s tool annotations.

### full

> Help a customer use Samuelz Chauffeur. Call get\_service\_options for the current service areas. Published languages: de, en. Read areas with get\_service\_options, terms with get\_customer\_policy, and price with quote\_ride. outside\_service\_area means no price. Call prepare\_offer only after an explicit request with offerRequested=true and one email or phone. The customer confirms on checkoutUrl. Use get\_offer\_status for that submission; it preserves the original language and accepts no locale. customerPortalUrl opens the existing customer login. These tools do not take payment or dispatch work. Subsequent delivery of an explicitly requested offer follows the confirmed communication policy. Use exact JSON types; omit unknown optional fields instead of null or empty strings. Correct pre-execution schema errors from already known facts. After quoted, show the exact returned bookingUrl, preserving its query and fragment, as the next step to review the ride.

### quote-only

> Provide anonymous price previews for Samuelz Chauffeur with get\_service\_options, get\_customer\_policy and quote\_ride. Call get\_service\_options for the current service areas. Published languages: de, en. No login or contact is required. A quote is not availability or a booking. outside\_service\_area has no price. This profile has no offer, payment or messaging tools. Use exact JSON types; omit unknown optional fields instead of null or empty strings. Correct pre-execution schema errors from already known facts. After quoted, show the exact returned bookingUrl, preserving its query and fragment, as the next step to review the ride.

### info-only

> Provide published service and policy information for Samuelz Chauffeur only. Call get\_service\_options for the current service areas. Published languages: de, en. This server has no prices, offers, reservations or booking tools.

## Maintenance

To change content, change Business-OS (or config.json), not README.

The generator uses Node.js 20+ built-ins only; no dependency installation is needed.

```sh
node --test tests/*.test.mjs
node scripts/generate.mjs
```

The daily GitHub Action runs at `04:17 UTC` and commits only changed outputs. It can also be run manually. Required sources must all pass validation before any output is replaced; an unavailable or invalid optional distribution source is omitted. Requests have a 15-second timeout and two retries. Temporary files are staged outside the repository on the same filesystem (set `TMPDIR` if necessary). No per-run timestamps are emitted.

Reuse this mirror for another tenant or industry by changing only [config.json](config.json). Endpoint variants and all tenant-specific fallback links live there. LICENSE is rendered from that configuration.

## License

[MIT](LICENSE) for this repository’s content. The remote service is operated by Samuelz Chauffeur.
