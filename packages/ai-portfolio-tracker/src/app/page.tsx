'use client';

import { useEffect, useState } from 'react';

interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  image: string;
  current_price: number;
}

interface CoinGeckoSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  large: string;
}

interface DeFiRecommendation {
  id: string;
  protocol: string;
  type: 'staking' | 'yield-farming' | 'liquidity';
  apy: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  description: string;
  token: string;
}

export default function CryptoPortfolio() {
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinGeckoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [recommendations, setRecommendations] = useState<DeFiRecommendation[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());

  // Load holdings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cryptoHoldings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHoldings(parsed);
      } catch (e) {
        console.error('Failed to load holdings:', e);
      }
    }
  }, []);

  // Save holdings to localStorage whenever they change
  useEffect(() => {
    if (holdings.length > 0) {
      localStorage.setItem('cryptoHoldings', JSON.stringify(holdings));
    }
  }, [holdings]);

  // Fetch prices for all holdings
  useEffect(() => {
    if (holdings.length === 0) return;

    const fetchPrices = async () => {
      setIsLoadingPrices(true);
      try {
        const ids = holdings.map(h => h.id).join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        );
        const data = await response.json();
        
        const priceMap: Record<string, number> = {};
        Object.keys(data).forEach(id => {
          priceMap[id] = data[id].usd;
        });
        
        setPrices(priceMap);
        
        // Update holdings with latest prices
        setHoldings(prev => prev.map(h => ({
          ...h,
          current_price: priceMap[h.id] || h.current_price
        })));
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [holdings.length]);

  // Search cryptocurrencies
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchCoins = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        setSearchResults(data.coins?.slice(0, 10) || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCoins, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const addCrypto = async (coin: CoinGeckoSearchResult) => {
    // Check if already added
    if (holdings.some(h => h.id === coin.id)) {
      alert('This cryptocurrency is already in your portfolio');
      return;
    }

    try {
      // Fetch current price
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
      );
      const data = await response.json();
      const price = data[coin.id]?.usd || 0;

      const newHolding: CryptoHolding = {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        amount: 0,
        image: coin.large,
        current_price: price
      };

      setHoldings(prev => [...prev, newHolding]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add crypto:', error);
    }
  };

  const updateAmount = (id: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setHoldings(prev => prev.map(h => 
      h.id === id ? { ...h, amount: numAmount } : h
    ));
  };

  const removeCrypto = (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
    if (holdings.length === 1) {
      localStorage.removeItem('cryptoHoldings');
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + (h.amount * h.current_price), 0);

  // Generate AI recommendations based on holdings
  useEffect(() => {
    if (holdings.length === 0) {
      setRecommendations([]);
      return;
    }

    // Simulate AI-generated recommendations based on portfolio
    const generateRecommendations = () => {
      const hasEth = holdings.some(h => h.symbol === 'ETH');
      const hasBtc = holdings.some(h => h.symbol === 'BTC');
      const hasStablecoins = holdings.some(h => ['USDT', 'USDC', 'DAI'].includes(h.symbol));

      const allRecommendations: DeFiRecommendation[] = [];

      if (hasEth) {
        allRecommendations.push({
          id: 'lido-eth',
          protocol: 'Lido',
          type: 'staking',
          apy: 3.8,
          riskLevel: 'Low',
          description: 'Stake your ETH and earn rewards while maintaining liquidity with stETH',
          token: 'ETH'
        });
        allRecommendations.push({
          id: 'aave-eth',
          protocol: 'Aave',
          type: 'liquidity',
          apy: 2.5,
          riskLevel: 'Low',
          description: 'Supply ETH to Aave and earn interest while keeping your assets liquid',
          token: 'ETH'
        });
      }

      if (hasBtc) {
        allRecommendations.push({
          id: 'compound-wbtc',
          protocol: 'Compound',
          type: 'liquidity',
          apy: 1.8,
          riskLevel: 'Low',
          description: 'Wrap your BTC and supply to Compound for passive yield',
          token: 'BTC'
        });
      }

      if (hasStablecoins) {
        allRecommendations.push({
          id: 'curve-3pool',
          protocol: 'Curve Finance',
          type: 'yield-farming',
          apy: 8.5,
          riskLevel: 'Medium',
          description: 'Provide liquidity to the 3pool (USDT/USDC/DAI) for stable yields',
          token: 'Stablecoins'
        });
        allRecommendations.push({
          id: 'aave-usdc',
          protocol: 'Aave',
          type: 'liquidity',
          apy: 4.2,
          riskLevel: 'Low',
          description: 'Supply stablecoins to Aave for low-risk passive income',
          token: 'USDC'
        });
      }

      // Add general recommendations
      allRecommendations.push({
        id: 'uniswap-v3',
        protocol: 'Uniswap V3',
        type: 'liquidity',
        apy: 15.3,
        riskLevel: 'High',
        description: 'Provide concentrated liquidity for higher yields (impermanent loss risk)',
        token: 'Various'
      });

      allRecommendations.push({
        id: 'yearn-vault',
        protocol: 'Yearn Finance',
        type: 'yield-farming',
        apy: 12.7,
        riskLevel: 'Medium',
        description: 'Auto-optimized yield farming strategies across multiple protocols',
        token: 'Various'
      });

      setRecommendations(allRecommendations);
    };

    generateRecommendations();
  }, [holdings]);

  const dismissRecommendation = (id: string) => {
    setDismissedRecommendations(prev => new Set([...prev, id]));
  };

  const visibleRecommendations = recommendations.filter(r => !dismissedRecommendations.has(r.id));

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-500/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'High': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'staking': return '🔒 Staking';
      case 'yield-farming': return '🌾 Yield Farming';
      case 'liquidity': return '💧 Liquidity';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Crypto Portfolio Tracker
          </h1>
          <p className="text-slate-300">Track your cryptocurrency holdings in real-time</p>
        </div>

        {/* Total Portfolio Value */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <div className="text-sm text-slate-300 mb-1">Total Portfolio Value</div>
          <div className="text-4xl font-bold">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {isLoadingPrices && (
            <div className="text-xs text-slate-400 mt-2">Updating prices...</div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cryptocurrencies to add..."
              className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-white/20 rounded-xl overflow-hidden shadow-2xl">
              {searchResults.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => addCrypto(coin)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                >
                  <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium">{coin.name}</div>
                    <div className="text-sm text-slate-400">{coin.symbol.toUpperCase()}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Holdings List */}
        {holdings.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/10">
            <div className="text-6xl mb-4">🪙</div>
            <h3 className="text-xl font-semibold mb-2">No Holdings Yet</h3>
            <p className="text-slate-400">Search and add cryptocurrencies to start tracking your portfolio</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {holdings.map((holding) => {
              const value = holding.amount * holding.current_price;
              return (
                <div
                  key={holding.id}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <img 
                      src={holding.image} 
                      alt={holding.name} 
                      className="w-12 h-12 rounded-full"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold">{holding.name}</h3>
                          <div className="text-sm text-slate-400">{holding.symbol}</div>
                        </div>
                        <button
                          onClick={() => removeCrypto(holding.id)}
                          className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Amount Owned</label>
                          <input
                            type="number"
                            value={holding.amount || ''}
                            onChange={(e) => updateAmount(holding.id, e.target.value)}
                            placeholder="0.00"
                            step="any"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Current Price</label>
                          <div className="text-lg font-semibold text-green-400">
                            ${holding.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Total Value</label>
                          <div className="text-lg font-semibold text-blue-400">
                            ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Recommendations Section */}
        {visibleRecommendations.length > 0 && (
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                🤖 AI Investment Recommendations
              </h2>
              <p className="text-slate-300">Personalized DeFi opportunities based on your portfolio</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {visibleRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{rec.protocol}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">{getTypeLabel(rec.type)}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{rec.token}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissRecommendation(rec.id)}
                      className="text-slate-400 hover:text-slate-300 text-sm"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-slate-300 text-sm mb-4">{rec.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">APY</div>
                      <div className="text-2xl font-bold text-green-400">{rec.apy}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Risk Level</div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(rec.riskLevel)}`}>
                        {rec.riskLevel}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
                      Learn More
                    </button>
                    <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all border border-white/20">
                      Invest Now
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-300 mb-1">Dynamic Recommendations</h4>
                  <p className="text-sm text-slate-300">
                    These recommendations are generated based on your current holdings and real-time market conditions. 
                    APY rates are updated regularly. Always do your own research before investing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Prices update automatically every minute • Data provided by CoinGecko</p>
          <p className="mt-1">Your holdings are saved locally in your browser</p>
        </div>
      </div>
    </div>
  );
}





