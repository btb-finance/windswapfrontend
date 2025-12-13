// YAKA Finance Contract Addresses - Sei Mainnet

// ============================================
// V2 Core Contracts
// ============================================
export const V2_CONTRACTS = {
    // Protocol Token
    YAKA: '0xD7b207B7C2c8Fc32F7aB448d73cfb6BE212F0DCf',

    // Core Voting Escrow
    VotingEscrow: '0xa879B9A74F2B619472b631a4C36D50C2BFA6a291',

    // Router for V2 swaps and liquidity
    Router: '0xB575eC90EDB32c20282841717346FA39b7293dD4',

    // Voter for gauge voting
    Voter: '0x0F63AA750F5B51dFdf45D0A23c40eC72a73DFD6a',

    // Token minter
    Minter: '0x4ec07F2f5C28D03478753bF085B939D57d024Ef2',

    // V2 Pool Factory
    PoolFactory: '0xf88005Ed92DD929e5aaf1A09A583903A2E5CC0de',

    // Rewards distributor for veNFT rebases
    RewardsDistributor: '0x86e00b50D6a999f6a57FDe751AEc99187022DCab',

    // Factory registry
    FactoryRegistry: '0x8089C2a89d8B4D93A513aA8F3bc7D1E43cB67014',

    // Gauge Factory
    GaugeFactory: '0x4e852Fbb78DAB7980c6c15Aa5EA4f232A94E916a',

    // Voting Rewards Factory
    VotingRewardsFactory: '0xF76e4eD537617140845F25d871Ca9591D6c4ba5b',

    // Managed Rewards Factory
    ManagedRewardsFactory: '0x1D53555E5C3612C07703518C0A2cF6f5B258ad42',

    // VeArt Proxy for NFT art
    VeArtProxy: '0x1bD04640e68CB3f9E88845f873fb5CBC7b81549b',

    // Airdrop Distributor
    AirdropDistributor: '0xB24B9c467C68636e56Ff53B36531ba4De0F9C86A',

    // Forwarder
    Forwarder: '0xf232cF63c21f05Ee147fDdec111dD11157c53738',
} as const;

// ============================================
// Slipstream (Concentrated Liquidity) Contracts
// ============================================
export const CL_CONTRACTS = {
    // CL Factory for creating pools
    CLFactory: '0xe73FbDD41e26EE04B0F3eB7F3d3caDDb5F93632c',

    // CL Pool implementation
    CLPool: '0x54D6Ca62259d9c1976ddA9F0d8B33B1e40e34800',

    // CL Gauge Factory
    CLGaugeFactory: '0xa2ecaFd003C2dC915272D63d7e56dA58b88d98f2',

    // CL Gauge implementation
    CLGauge: '0x72525073ed9A9DD4806Fc897cB4cF28B2677bbb9',

    // Swap Router for CL swaps
    SwapRouter: '0x06bd58BAd2DAF24E4E628AFF2cCA0e0056C009F0',

    // NFT Position Manager for CL positions
    NonfungiblePositionManager: '0x2C50fc9906F124A2B781c7BF57278a801091684E',

    // Token Position Descriptor (NFT metadata)
    NonfungibleTokenPositionDescriptor: '0xC3f6fB1CCC49fE2f2f2dd9DD72606796Bd8c7270',

    // Quoter for getting swap quotes
    QuoterV2: '0x78382467583275A23118172e8270a20C49F53A1e',

    // Mixed Route Quoter (supports V2 + CL routes)
    MixedRouteQuoterV1: '0x82e13460786B5679862ab34Fc3260d52B8bfce0a',

    // Sugar Helper for data aggregation
    SugarHelper: '0xE796C74DF4fe997A17870B1E70dB72D45Fcd4e1A',

    // Custom Swap Fee Module
    CustomSwapFeeModule: '0x1149621D55DB2AC6E641D109b0E4D0fe375e68De',

    // Custom Unstaked Fee Module
    CustomUnstakedFeeModule: '0xFEbC54e53c951a73C7E927bf7023B4F48F9D4Dd1',

    // NFT Descriptor Library
    NFTDescriptor: '0xD5A742b6437fDEA0E24DF9088323d0cd08925B61',

    // NFT SVG Library
    NFTSVG: '0xaFeE59b092DA3A8B778637B3573Fcc0ab71fDf36',
} as const;

// ============================================
// Common Addresses
// ============================================
export const COMMON = {
    WSEI: '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7',
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
} as const;
