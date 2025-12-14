'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  const stats = [
    { label: 'Total Value Locked', value: '$--', change: '+--' },
    { label: 'Total Volume', value: '$--', change: '+--' },
    { label: 'Total Pools', value: '--', change: null },
    { label: 'Total Gauges', value: '--', change: null },
  ];

  const v3Benefits = [
    {
      title: 'Best Swap Rates',
      description: 'Concentrated liquidity means tighter spreads and better prices than any V2 AMM.',
      icon: '🎯',
      stat: 'Up to 4000x',
      statLabel: 'more capital efficient',
    },
    {
      title: 'Higher LP Rewards',
      description: 'LPs earn more fees per dollar deposited with concentrated positions.',
      icon: '💎',
      stat: '10-100x',
      statLabel: 'more fee earnings',
    },
    {
      title: 'Custom Ranges',
      description: 'Choose your price range - focus liquidity where trading happens most.',
      icon: '📊',
      stat: 'You Control',
      statLabel: 'your strategy',
    },
    {
      title: 'Lower Slippage',
      description: 'Deep liquidity at active prices means minimal price impact on trades.',
      icon: '⚡',
      stat: 'Near Zero',
      statLabel: 'slippage on trades',
    },
  ];

  const features = [
    {
      title: 'V2 Pools',
      description: 'Classic AMM pools with stable and volatile pair optimizations.',
      href: '/liquidity',
      icon: '💧',
    },
    {
      title: 'Slipstream CL',
      description: 'Concentrated liquidity pools for capital-efficient trading.',
      href: '/liquidity',
      icon: '⚡',
    },
    {
      title: 'veNFT Voting',
      description: 'Lock YAKA to receive veNFTs and vote on gauge emissions.',
      href: '/vote',
      icon: '🗳️',
    },
    {
      title: 'Earn Rewards',
      description: 'Earn trading fees, emissions, and bribes by providing liquidity.',
      href: '/pools',
      icon: '💰',
    },
  ];

  return (
    <div className="container mx-auto px-6">
      {/* Upgrade Announcement */}
      <section className="py-4">
        <motion.div
          className="p-4 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border border-primary/30 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-lg">🎉</span>{' '}
          <span className="font-semibold">YAKA Just Got an Upgrade!</span>{' '}
          <span className="text-gray-300">Now powered by V3 Concentrated Liquidity + ve(3,3) tokenomics.</span>
        </motion.div>
      </section>

      {/* Hero Section */}
      <section className="py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex gap-3 justify-center mb-6">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
              🚀 V3 Concentrated Liquidity
            </div>
            <div className="inline-block px-4 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              ⚡ ve(3,3) Tokenomics
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">YAKA</span> Finance
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-4">
            The Next-Gen DEX on Sei Network
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-4">
            <span className="text-primary font-semibold">V3 CL</span> gives traders the best rates.{' '}
            <span className="text-green-400 font-semibold">ve(3,3)</span> rewards veYAKA holders who vote for productive pools.
          </p>
          <p className="text-md text-gray-500 max-w-2xl mx-auto mb-8">
            Vote → Emissions go to good pools → More volume → More fees → Higher rewards for voters & LPs. Everyone wins.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/swap">
              <motion.button
                className="btn-primary text-lg px-8 py-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Trading
              </motion.button>
            </Link>
            <Link href="/vote">
              <motion.button
                className="btn-secondary text-lg px-8 py-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Lock & Earn
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ve(3,3) Explanation */}
      <section className="py-8">
        <motion.div
          className="glass-card p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              The <span className="text-green-400">ve(3,3)</span> Flywheel
            </h2>
            <p className="text-gray-400">Vote for good pools. Earn more rewards. It's that simple.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div className="p-4">
              <div className="text-3xl mb-2">🔐</div>
              <div className="font-semibold mb-1">Lock YAKA</div>
              <div className="text-sm text-gray-400">Get veYAKA voting power</div>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🗳️</div>
              <div className="font-semibold mb-1">Vote for Pools</div>
              <div className="text-sm text-gray-400">Direct YAKA emissions</div>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">📈</div>
              <div className="font-semibold mb-1">Pools Get TVL</div>
              <div className="text-sm text-gray-400">More liquidity = more volume</div>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">💰</div>
              <div className="font-semibold mb-1">Earn Fees + Bribes</div>
              <div className="text-sm text-gray-400">Voters get rewarded</div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-primary/10 text-center">
            <span className="text-sm text-gray-300">
              <strong className="text-primary">The Result:</strong> Good pools earn higher emissions → More LPs join → Better rates for traders → Protocol grows 🚀
            </span>
          </div>
        </motion.div>
      </section>

      {/* Why V3 Section */}
      <section className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-center mb-4">
            Why V3 <span className="gradient-text">Changes Everything</span>
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Traditional AMMs waste liquidity across infinite price ranges. V3 concentrated liquidity
            focuses capital where it matters - resulting in better rates for traders and higher yields for LPs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {v3Benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              className="glass-card p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{benefit.description}</p>
              <div className="pt-4 border-t border-white/10">
                <div className="text-2xl font-bold text-primary">{benefit.stat}</div>
                <div className="text-xs text-gray-500">{benefit.statLabel}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="stat-card text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
              {stat.change && (
                <p className="text-sm text-green-400 mt-1">{stat.change}</p>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-12">
        <motion.div
          className="glass-card p-8 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-center">V2 vs V3: The Difference</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* V2 */}
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                  <span className="text-gray-400 font-bold">V2</span>
                </div>
                <div>
                  <h3 className="font-semibold">Traditional AMM</h3>
                  <p className="text-sm text-gray-500">Classic liquidity pools</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  Liquidity spread across all prices
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  Lower capital efficiency
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  Less fees earned per dollar
                </li>
              </ul>
            </div>

            {/* V3 */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">V3</span>
                </div>
                <div>
                  <h3 className="font-semibold">Concentrated Liquidity</h3>
                  <p className="text-sm text-gray-400">Next-gen efficiency</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">Focus liquidity in active ranges</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">Up to 4000x more capital efficient</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">Earn 10-100x more in fees</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Protocol Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
            >
              <Link href={feature.href}>
                <div className="glass-card p-6 h-full cursor-pointer hover:border-primary/30 transition-all">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      {isConnected && (
        <section className="py-12">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/swap" className="btn-secondary text-center py-4">
                Swap Tokens
              </Link>
              <Link href="/liquidity" className="btn-secondary text-center py-4">
                Manage Positions
              </Link>
              <Link href="/vote" className="btn-secondary text-center py-4">
                Vote on Gauges
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Token Info Section */}
      <section className="py-12">
        <div className="glass-card p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">YAKA Token</h2>
              <p className="text-gray-400 mb-4">
                The native governance token of YAKA Finance. Lock YAKA to receive veNFTs and participate in governance.
              </p>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-gray-500">Contract Address</p>
                  <p className="font-mono text-sm">0xD7b2...0DCf</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/swap">
                <button className="btn-primary">Buy YAKA</button>
              </Link>
              <Link href="/vote">
                <button className="btn-secondary">Lock & Vote</button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
