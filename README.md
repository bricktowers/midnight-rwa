# Brick Towers Real World Asset (RWA) Tokenization

Brick Towers Midnight RWA is an end-to-end showcase of privacy-preserving, real-world-asset tokenization on the Midnight network. The repository includes Midnight Compact contracts for token issuance, accredited investor verification, a credential issuer service, a React front-end, a tBTC faucet, and Midnight wallet integrations that keep user data local while enforcing issuance and trading only to accredited investors (meets knowledge, wealth, nationality and age requirements).

## 📖 Overview

### Problem statement
- Traditional asset classes (RWAs) come with regulatory requirements for issuance, market access, compliance & market integrity
- On-chain tokenization exposes transactions, balances, and identities, risking privacy breaches and regulatory non-compliance.
- Compliance checks, e.g. for accredited investors demand confidentiality without sacrificing liquidity or verifiability.
- Real-world issue: Over $500T in RWAs globally, but regulatory concerns deter on-chain issuance and broader adoption in DeFi.

### Vision
A world where regulated traditional asset classes can be issued and traded on-chain, without revealing holder information and having compliance rules enforced automatically.

### Example 
- tHF tokens: Shielded representations of real-world hedge fund shares, held in issuer custody.
- Core value: Privacy-first finance – transactions, balances, and identities remain confidential, while proofs ensure eligibility.
- Impact: Facilitates regulated RWA investments, allows for opening of corporate balance sheets tokenizing verticals, fosters trust in DeFi, aligns with Midnight's privacy ecosystem for scalable, secure finance.
- Long-term: Expand to multiple asset classes, integrate with global DEXs, partner with regulators for mainstream adoption.

### Roles
- Issuer: Custodian of the real world asset who issues tokens to accredited investors for trading on the blockchain
- Investor: Accredited investor who proves that they are accredited and participate in RWA token trading

### ✅ Key Features
- **Midnight Wallet Integration**: Users can link their identity credentials to their Midnight wallet
- **Decentralized Identity Management**: Users fully own and control their identity credentials
- **Privacy-Preserving Identity Verification**: Verify passport data, age, nationality, and other attributes without exposing the actual data to third parties
- **Secure Signature Verification**: Cryptographic signatures (JubJub elliptic-curve) from trusted issuers guarantee authenticity of identity claims
- **Built on Midnight Blockchain**: Leverages Midnight's Zero-Knowledge infrastructure for maximum privacy
- **On-Chain Age & Identity Checks**: Verify the holder is 18+ and passport is valid using ledger time — no birth date revealed
- **Accreditation Quiz**: Users must pass a risk-awareness quiz before accessing regulated assets
- **Role-Based Access Control**:
   - Only authorized issuers can mint, burn, or provide liquidity
   - Only verified and accredited users can receive tokens

### 🛠 Technical Features (Frontend & UX)
- Modern React + Material-UI interface
- Built-in tBTC Faucet directly on the main page
- Detailed wallet connection feedback
- Step-by-step transaction progress updates
- Clear, user-friendly error messages
- Automatic retry logic for transient network/provider issues
- Robust state recovery (survives page reloads and temporary disconnects)

### 📝 Smart Contract Features
- **Privacy-preserving identity verification** (age, nationality, passport validity) using Zero-Knowledge proofs
- **Elliptic-curve signature verification** of identity claims
- **Modular cryptographic functions** for easy upgrades and audits
- **Accreditation module**: On-chain proof that the user understands risks and regulations
- **Ledger-time-based validation** of age and passport expiration
- **Strict role-based access control** (issuers vs. verified holders)
- **Mint/burn/liquidity controls** restricted to authorized entities only

## 🔍 Technical Architecture

### 📋 Use Case Flow Details

```mermaid
sequenceDiagram
%% Parties
  actor Issuer
  actor Investor
  participant IdentityService as "Identity Service"
  participant Dex as "Dex dApp"
  participant Contract as "RWA Contract"

%% === ISSUER EXPERIENCE: PROVIDE LIQUIDITY ===

  Note over Issuer,Contract: 1) Issuer sets up liquidity for the RWA market
  Issuer->>Dex: Configure RWA market<br/>(set quiz, identity provider,<br/>allowed countries, tBTC token)
  Dex->>Contract: admin setup call<br/>(quizHash, identityProviderPk,<br/>allowedCountryCodes, tBTC address)

  Issuer->>Dex: Provide liquidity<br/>(1000 tHF, 1000 tBTC)
  Dex->>Contract: mintTHF(1000)
  Contract-->>Contract: tHF pool += 1000

  Dex->>Contract: provideTBTC(1000 tBTC)
  Dex->>Contract: transfer 1000 tBTC
  Contract-->>Contract: tBTC pool += 1000

  Note over Issuer,Contract: Issuer is done.<br/>Market is live with liquidity.

%% === INVESTOR EXPERIENCE: TRY TO BUY BEFORE ONBOARDING ===

  Note over Investor,Contract: 2) Investor already has tBTC<br/>(from external source)
  Investor->>Dex: Swap 150 tBTC → tHF
  Dex->>Contract: buyTHF(coin: 150 tBTC)

  alt Investor not yet onboarded
    Contract-->>Dex: Error "Authorization not found<br/>in the ledger"
    Dex-->>Investor: Show error:<br/>"Please onboard before trading"
  end

%% === INVESTOR ONBOARDING (QUIZ + KYC + DEPOSIT) ===

  Note over Investor,IdentityService: 3) Investor gets identity credential
  Investor->>IdentityService: Submit KYC / passport
  IdentityService-->>Investor: Signed identity credential

  Note over Investor,Contract: 4) Onboarding to RWA contract
  Investor->>Dex: Start onboarding<br/>- Quiz answers<br/>- 150 tBTC deposit<br/>- Signed identity
  Dex->>Contract: onboard(quizResult,<br/>coin: 150 tBTC,<br/>identity)

  Note right of Contract: assertIdentity(identity)<br/>- Check signature<br/>- Check issuer public key<br/>- Check nationality allowed
  Contract->>Contract: verify(identity)
  Contract-->>Contract: ok

  Note right of Contract: assertCoinValue(coin)<br/>- color == tBTC<br/>- value ≥ 100<br/>- temporary deposit
  Contract-->>Investor: Return 150 tBTC<br/>(deposit returned after check)

  Contract-->>Contract: authorizations.insert(Investor public key)<br/>Investor added to authorization tree

  Contract-->>Dex: Onboarding success
  Dex-->>Investor: Onboarding complete

%% === INVESTOR BUY FLOW AFTER ONBOARDING ===

  Note over Investor,Contract: 5) Investor buys tHF
  Investor->>Dex: Swap 150 tBTC → tHF
  Dex->>Contract: buyTHF(coin: 150 tBTC)

  Note right of Contract: isAuthorizedSend(Investor)<br/>Check authorization path in Merkle tree
  Contract-->>Contract: tBTC pool += 150
  Contract->>Investor: send 150 tHF
  Dex-->>Investor: Show balances:<br/>-150 tBTC, +150 tHF

%% === INVESTOR SELL FLOW ===

  Note over Investor,Contract: 6) Investor sells part of tHF
  Investor->>Dex: Swap 50 tHF → tBTC
  Dex->>Contract: sellTHF(coin: 50 tHF)

  Note right of Contract: validate tHF coin<br/>update liquidity pools
  Contract-->>Contract: tHF pool += 50
  Contract->>Investor: send 50 tBTC
  Dex-->>Investor: Show balances:<br/>-50 tHF, +50 tBTC
```

### Monorepo packages

| Package | Purpose | Highlights |
| --- | --- | --- |
| `rwa-contract/` | Midnight Compact contract plus TypeScript bindings | Circuits in `midnight-rwa.compact`, Vitest simulators (`midnight-rwa-simulator.ts`), witness exports, LevelDB store for private state |
| `tbtc-contract/` | Faucet contract for demo tBTC | Single `mint` circuit, shares build pipeline with RWA contract |
| `identity-api/` | Credential issuer / IDP stub | `credential-signer.ts` issues `PassportData`, webpack build + `serve` script for local HTTP API |
| `rwa-api/` | Contract SDK consumed by the UI | RxJS-based state streams, deploy/subscribe helpers, TypeScript definitions shared with the UI |
| `rwa-ui/` | React front-end (shop + IDP pages) | Midnight wallet wrapper, proof client wiring, catalog UX, runtime configuration loader, ZK artifacts copy scripts |

Additional assets include `docs/` (screenshots) and `turbo.json`, which orchestrates `compact`, `build`, `test`, and `lint` tasks across workspaces.

## 🪛 Build

### Prerequisites

- [Midnight Compact compiler](https://docs.midnight.network/develop/tutorial/building/prereqs#midnight-compact-compiler) (`COMPACT_HOME` must be set)
- [Node.js LTS](https://nodejs.org/en/download/) and [Yarn](https://yarnpkg.com/getting-started/install)
- [Docker](https://docs.docker.com/get-docker/) for Midnight indexer & local nodes (when running full-stack)

### Install & compile

```bash
yarn install
npx turbo run compact
npx turbo run build
```

### Workspace tips

- **Contracts**: `yarn workspace @bricktowers/rwa-contract compact && yarn workspace @bricktowers/rwa-contract build`
- **tBTC faucet**: `yarn workspace @bricktowers/tbtc-contract compact && yarn workspace @bricktowers/tbtc-contract build`
- **Run Identity Provider API**: `yarn workspace @bricktowers/identity-api build && yarn workspace @bricktowers/identity-api serve`
- **Run UI**: `yarn workspace @bricktowers/rwa-ui build && yarn workspace @bricktowers/rwa-ui start`
  - The UI build automatically copies proving keys from both contracts via the `copy-*` scripts.
- **Runtime config**: edit `rwa-ui/public/config.json` to point at your indexer URLs, contract addresses, and Firebase/AppCheck values before running `vite preview` or `http-server`.

## 🧪 Test

```bash
npx turbo run test
yarn workspace @bricktowers/rwa-contract test          # Vitest simulators
yarn workspace @bricktowers/tbtc-contract test         # Faucet circuit tests
yarn workspace @bricktowers/rwa-api test               # Jest + testcontainers
yarn workspace @bricktowers/identity-api test          # Credential converters/signers
```

Tests rely on the generated `managed/` artifacts, so run `npx turbo run compact` first or use the `test:compile` scripts inside each contract workspace to recompile before executing Vitest.
