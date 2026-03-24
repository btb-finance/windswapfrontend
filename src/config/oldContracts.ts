// Old Wind Swap Contract Addresses - Sei Mainnet (before bug-fix redeployment)
// These contracts may still hold user balances that need migration

export const OLD_V2_CONTRACTS = {
    WIND: '0x80B56cF09c18e642DC04d94b8AD25Bb5605c1421',
    VotingEscrow: '0x9312A9702c3F0105246e12874c4A0EdC6aD07593',
    Router: '0x5f401E565ed095eeC0EFAf1970E4B60ba5aa8995',
    Voter: '0x4B7e64A935aEAc6f1837a57bdA329c797Fa2aD22',
    Minter: '0xD56369432BBb4F40143f8C930D96c83c10c68aEE',
    PoolFactory: '0xeE6476aa1B912f7c3Ab45b73990f26B840c42069',
    Pool: '0x41B5fD249039e4ab492227dB014DDbA79c2a1B92',
    RewardsDistributor: '0x2ac111A4647708781f797F0a8794b0aEC43ED854',
    FactoryRegistry: '0x168df826C17d245187f74bD67008aE623e4496f9',
    GaugeFactory: '0x5137eF6b4FB51E482aafDFE4B82E2618f6DE499a',
    VotingRewardsFactory: '0xD121d8f547F15ca30ECfC928D8313a6E49921f67',
    ManagedRewardsFactory: '0x425b61141356F2Ae2d9710FD7fA6718f0D3De958',
    VeArtProxy: '0x7292f11B204D5B3fB0CC7D10E0C10a26540359D5',
    AirdropDistributor: '0x9726ec2930C452594f1FAccA5112a8B57790A5A4',
    Forwarder: '0x2EB4C1f3Dd12947dF49f5e7E399B4250d4640692',
} as const;

export const OLD_CL_CONTRACTS = {
    CLFactory: '0xA0E081764Ed601074C1B370eb117413145F5e8Cc',
    CLPool: '0x4aDA3B73188649D7af11eb00464E789220077800',
    CLGaugeFactory: '0xbb24DA8eDAD6324a6f58485702588eFF08b3Cd64',
    CLGauge: '0xb24D93B3f9C48E05879B1Be77e88489950E16982',
    SwapRouter: '0x960cDB8A41FC53eD72750F6b5E81DEAEBADCF818',
    NonfungiblePositionManager: '0x0e98B82C5FAec199DfAFe2b151d51d40722e7f35',
    NonfungibleTokenPositionDescriptor: '0xe4C6586B13EebB8a8d05A35e147784b0Fa7F077e',
    QuoterV2: '0x4A42169A43c148674708622583682dA668B8b43D',
    MixedRouteQuoterV1: '0xCC4Af1C94AfC5eA71Fee618A880c271E0416F9a4',
    SugarHelper: '0x1057B7121E75E3df8fb78aA8bdD71d78a850Cf6B',
    CustomSwapFeeModule: '0xa63203F534539e85175B813db14C4a701FDE0a15',
    CustomUnstakedFeeModule: '0x4D464AaE5AA2cE4012c32daF8B58C952dA731463',
    NFTDescriptor: '0x30D2CcF8Bf963Ce8D8905c8Eac8Bfff0De805024',
    NFTSVG: '0x974bbfc2DE0EfEd83A950fcB323c429d29c288F3',
} as const;

// Old Goldsky subgraph that indexes the old Sei contracts
export const OLD_SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cmjlh2t5mylhg01tm7t545rgk/subgraphs/windswap/v3.0.8/gn';
