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
      {/* Hero Section */}
      <section className="py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">YAKA</span> Finance
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            The premier AMM and ve-tokenomics protocol on Sei Network.
            Trade, provide liquidity, and earn rewards.
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
            <Link href="/liquidity">
              <motion.button
                className="btn-secondary text-lg px-8 py-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Add Liquidity
              </motion.button>
            </Link>
          </div>
        </motion.div>
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
              transition={{ delay: index * 0.1 }}
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

      {/* Features Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Protocol Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
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
