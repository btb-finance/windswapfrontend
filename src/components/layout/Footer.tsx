import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-white/5 mt-auto">
            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1">
                        <Link href="/" className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                <span className="text-white font-bold">Y</span>
                            </div>
                            <span className="text-lg font-bold gradient-text">YAKA Finance</span>
                        </Link>
                        <p className="text-sm text-gray-400">
                            The premier AMM and ve-tokenomics protocol on Sei Network.
                        </p>
                    </div>

                    {/* Protocol */}
                    <div>
                        <h4 className="font-semibold mb-4">Protocol</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link href="/swap" className="hover:text-white transition">Swap</Link></li>
                            <li><Link href="/liquidity" className="hover:text-white transition">Liquidity</Link></li>
                            <li><Link href="/pools" className="hover:text-white transition">Pools</Link></li>
                            <li><Link href="/vote" className="hover:text-white transition">Vote</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="https://docs.yaka.finance" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Documentation</a></li>
                            <li><a href="https://seiscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Explorer</a></li>
                            <li><a href="https://github.com/yaka-finance" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></li>
                        </ul>
                    </div>

                    {/* Community */}
                    <div>
                        <h4 className="font-semibold mb-4">Community</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="https://twitter.com/yakafinance" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Twitter</a></li>
                            <li><a href="https://discord.gg/yaka" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Discord</a></li>
                            <li><a href="https://t.me/yakafinance" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Telegram</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 mt-8 pt-8 text-center text-sm text-gray-500">
                    <p>© 2024 YAKA Finance. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
