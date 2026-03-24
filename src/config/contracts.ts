// Wind Swap Contract Addresses - Sei Mainnet
// V2 deployed via windv2, V3/CL via windv3swap (CreateX CREATE3)
// All contracts verified on SeiScan

// ============================================
// V2 Core Contracts (new deployment - bug fixes)
// ============================================
export const V2_CONTRACTS = {
    // Protocol Token (WIND)
    WIND: '0x888a4F89aF7dD0Be836cA367C9FF5490c0F6e888',
    YAKA: '0x888a4F89aF7dD0Be836cA367C9FF5490c0F6e888', // Legacy alias

    // Core Voting Escrow
    VotingEscrow: '0x88889C4Be508cA88eba6ad802340C0563891D426',

    // Router for V2 swaps and liquidity
    Router: '0x88883154C9F8eb3bd34fb760bda1EB7556a20e14',

    // Voter for gauge voting
    Voter: '0x88881EB4b5dD3461fC0CFBc44606E3b401197E38',

    // Token minter
    Minter: '0x8888a8585d2Ab886800409fF97Ce84564CbFeF47',

    // V2 Pool Factory
    PoolFactory: '0x88880e3dA8676C879c3D019EDE0b5a74586813be',

    // Pool implementation
    Pool: '0x888846064b562b1d41F0CbA3B55e28699B1F6d86',

    // Rewards distributor for veNFT rebases
    RewardsDistributor: '0x8888f1e8908F7B268439289091b3Fd1dE2B4c124',

    // Factory registry
    FactoryRegistry: '0x8888220B5E60586D09bc1D0738d964B3c73b3AC1',

    // Gauge Factory
    GaugeFactory: '0x88886e546d9024C53Cfb0FbD87DE83FA9BF9e857',

    // Voting Rewards Factory
    VotingRewardsFactory: '0x8888Cc3Dc53BDdA5F8E97E10d9d2bD881662BA31',

    // Managed Rewards Factory
    ManagedRewardsFactory: '0x8888f67c3A3d7F1F1F4B5440184c3D26e3eD4143',

    // VeArt Proxy for NFT art
    VeArtProxy: '0x888855bf9D1C6e575Ec0e7916D848E225D51BAe9',

    // Airdrop Distributor
    AirdropDistributor: '0x8888d1016C41c6Fe72F968939B02F055284b200e',

    // Forwarder
    Forwarder: '0x888823B4514D65c035f4528255d0e514C2A57b98',

    // Governance (stubs)
    ProtocolGovernor: '0x0000000000000000000000000000000000000000',
    EpochGovernor: '0x0000000000000000000000000000000000000000',

    // Stablecoin Zap helper (stub, old one removed)
    StablecoinZap: '0x0000000000000000000000000000000000000000',
} as const;

// ============================================
// V2 Libraries (new deployment - bug fixes)
// ============================================
export const V2_LIBRARIES = {
    BalanceLogicLibrary: '0x8888957497A69F02004aB78834279E37e66D790A',
    DelegationLogicLibrary: '0x88885ce56AD5836629466AD0429c386a47676FD8',
} as const;

// ============================================
// Slipstream (Concentrated Liquidity) Contracts (new deployment - bug fixes)
// ============================================
export const CL_CONTRACTS = {
    // CL Factory for creating pools
    CLFactory: '0x8888A3D87EF6aBC5F50572661E4729A45b255cF6',

    // CL Pool implementation
    CLPool: '0x8888125154253b50bE0958EDE6648524f92DcEBe',

    // CL Gauge Factory
    CLGaugeFactory: '0x8888B7b5731EBB4E7962cC20b186C92C94bCAFbd',

    // CL Gauge implementation
    CLGauge: '0x88889Dc37A0829d2c5f0F59363ba1De6b6E4E7c8',

    // Swap Router for CL swaps
    SwapRouter: '0x8888EEA5C97AF36f764259557d2D4CA23e6b19Ff',

    // NFT Position Manager for CL positions
    NonfungiblePositionManager: '0x8888bB79b80e6B48014493819656Ffc1444d7687',

    // Token Position Descriptor (NFT metadata)
    NonfungibleTokenPositionDescriptor: '0x8888e88A64CF0404b523944f8cf7182947D4261d',

    // Quoter for getting swap quotes
    QuoterV2: '0x888831E6a70C71009765bAa1C3d86031539d6B15',

    // Mixed Route Quoter (supports V2 + CL routes)
    MixedRouteQuoterV1: '0x88884631783f44261ba37da9a37ffa65dcB1A676',

    // Sugar Helper for data aggregation
    SugarHelper: '0x8888F211bC93753a9287f64bdD45a7184C1766Ad',

    // Custom Swap Fee Module
    CustomSwapFeeModule: '0x8888397cA7c951f700CAFc2E8B657761B92D2aDe',

    // Custom Unstaked Fee Module
    CustomUnstakedFeeModule: '0x88889731C6faDb268e0BB34d9f104B54e6d32154',

    // NFT Descriptor Library
    NFTDescriptor: '0x88881883ff4d81C6E72978673104934D0852a44a',

    // NFT SVG Library
    NFTSVG: '0x8888719B0870570DAaCc37473c2290635F37D5E9',

    // Tick Lens
    TickLens: '0x8888C63496a29A46c8E005983886D2552d4c3D03',

    // CL Interface Multicall
    CLInterfaceMulticall: '0x8888Ce7DE18b513DBe6935E0C82aAaE08ADc6127',
} as const;

// ============================================
// Common Addresses
// ============================================
export const COMMON = {
    // Wrapped SEI
    WSEI: '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7',

    // Zero address
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
} as const;

// ============================================
// Notable Pools & Gauges (used for prioritization / APR display)
// ============================================
export const NOTABLE_POOLS = {
    WIND_WSEI:  '0xc7035A2Ef7C685Fc853475744623A0F164541b69',
    WIND_USDC:  '0x576fc1f102c6bb3f0a2bc87ff01fb652b883dfe0',
    USDT_USDC:  '0x3c2567b15fd9133cf9101e043c58e2b444af900b',
    USDC_WSEI:  '0x587b82b8ed109d8587a58f9476a8d4268ae945b1',
} as const;

export const NOTABLE_GAUGES = {
    WIND_WSEI: '0x65e450a9E7735c3991b1495C772aeDb33A1A91Cb',
} as const;

// ============================================
// All Contracts Combined (for easy access)
// ============================================
export const ALL_CONTRACTS = {
    ...V2_CONTRACTS,
    ...V2_LIBRARIES,
    ...CL_CONTRACTS,
    ...COMMON,
} as const;

// ============================================
// LORE Mining Contracts (Sei Mainnet)
// ============================================
export const LORE_MINING_CONTRACTS = {
    // LOREmining UUPS Proxy (vanity address)
    LOREmining: '0x88888A11ef184e35D2A1098A5abe8b30312e4f54',
    // LOREBondingCurve UUPS Proxy (vanity address)
    BondingCurve: '0x88888b465eA2871Ddb6Ebe804608c2aC1F0CCc25',
    // LORE Token UUPS Proxy (vanity address)
    LoreToken: '0x888886c43b4B4A15833Be49e7F08242e26e9A6f0',
} as const;

// ============================================
// Wind Bonding Curve & Staking Contracts (Sei Mainnet)
// ============================================
export const WIND_CURVE_CONTRACTS = {
    // WindBondingCurve UUPS Proxy (vanity address)
    BondingCurve: '0x88888004Fd1F10C4B7b1153ae02B2b811212Adf2',
    // CurveTokenStaking UUPS Proxy (vanity address)
    Staking: '0x888888C440640D493A5943b7448e3C5Ee88CC5De',
    // BTB token (reserve currency)
    BTBToken: '0x80B56cF09c18e642DC04d94b8AD25Bb5605c1421',
} as const;

// ============================================
// BTB Finance Contracts (Ethereum Mainnet)
// ============================================
export const BTB_CONTRACTS = {
    // BTB Finance Token (ERC20)
    BTB: '0x88888888c90CD71B35830daBFD24743DbC135B51',

    // BTB Bear Token (Wrapped BTB with 1% tax)
    BTBB: '0x88888880d5Ca13018D2dC11e2e4744BD91a5656f',

    // Bear NFT Collection
    BearNFT: '0x88888888aBa934ceA0b4f0000FeA62F1397D02A0',

    // Bear Staking Contract
    BearStaking: '0x8888888Faf81E6a98deb2B90A05B46b6E903e927',
} as const;
