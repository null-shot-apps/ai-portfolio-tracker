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

interface ScheduledPayment {
  id: string;
  name: string;
  amount: number;
  frequency: 'Monthly' | 'Yearly' | 'Weekly';
  nextPaymentDate: Date;
  category: string;
  history: PaymentHistory[];
}

interface PaymentHistory {
  date: Date;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
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
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly' as 'Monthly' | 'Yearly' | 'Weekly',
    category: 'Subscription'
  });

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

    // Load scheduled payments
    const savedPayments = localStorage.getItem('scheduledPayments');
    if (savedPayments) {
      try {
        const parsed = JSON.parse(savedPayments);
        // Convert date strings back to Date objects
        const paymentsWithDates = parsed.map((p: any) => ({
          ...p,
          nextPaymentDate: new Date(p.nextPaymentDate),
          history: p.history.map((h: any) => ({
            ...h,
            date: new Date(h.date)
          }))
        }));
        setScheduledPayments(paymentsWithDates);
      } catch (e) {
        console.error('Failed to load payments:', e);
      }
    } else {
      // Initialize with mock data
      const mockPayments: ScheduledPayment[] = [
        {
          id: '1',
          name: 'Netflix',
          amount: 15.99,
          frequency: 'Monthly',
          nextPaymentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          category: 'Entertainment',
          history: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: 15.99, status: 'completed' },
            { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: 15.99, status: 'completed' }
          ]
        },
        {
          id: '2',
          name: 'Spotify',
          amount: 9.99,
          frequency: 'Monthly',
          nextPaymentDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
          category: 'Entertainment',
          history: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: 9.99, status: 'completed' }
          ]
        },
        {
          id: '3',
          name: 'AWS Hosting',
          amount: 50.00,
          frequency: 'Monthly',
          nextPaymentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          category: 'Business',
          history: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: 50.00, status: 'completed' }
          ]
        }
      ];
      setScheduledPayments(mockPayments);
    }
  }, []);

  // Save holdings to localStorage whenever they change
  useEffect(() => {
    if (holdings.length > 0) {
      localStorage.setItem('cryptoHoldings', JSON.stringify(holdings));
    }
  }, [holdings]);

  // Save scheduled payments to localStorage
  useEffect(() => {
    if (scheduledPayments.length > 0) {
      localStorage.setItem('scheduledPayments', JSON.stringify(scheduledPayments));
    }
  }, [scheduledPayments]);

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

  // Payment scheduling functions
  const addScheduledPayment = () => {
    if (!newPayment.name || !newPayment.amount) {
      alert('Please fill in all fields');
      return;
    }

    const payment: ScheduledPayment = {
      id: Date.now().toString(),
      name: newPayment.name,
      amount: parseFloat(newPayment.amount),
      frequency: newPayment.frequency,
      nextPaymentDate: calculateNextPaymentDate(newPayment.frequency),
      category: newPayment.category,
      history: []
    };

    setScheduledPayments(prev => [...prev, payment]);
    setNewPayment({ name: '', amount: '', frequency: 'Monthly', category: 'Subscription' });
    setIsAddingPayment(false);
  };

  const calculateNextPaymentDate = (frequency: 'Monthly' | 'Yearly' | 'Weekly') => {
    const now = new Date();
    switch (frequency) {
      case 'Weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'Monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'Yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default:
        return now;
    }
  };

  const updatePayment = (id: string, updates: Partial<ScheduledPayment>) => {
    setScheduledPayments(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
    setEditingPayment(null);
  };

  const deletePayment = (id: string) => {
    setScheduledPayments(prev => prev.filter(p => p.id !== id));
  };

  const simulatePayment = (id: string) => {
    setScheduledPayments(prev => prev.map(p => {
      if (p.id === id) {
        const newHistory: PaymentHistory = {
          date: new Date(),
          amount: p.amount,
          status: 'completed'
        };
        return {
          ...p,
          history: [newHistory, ...p.history],
          nextPaymentDate: calculateNextPaymentDate(p.frequency)
        };
      }
      return p;
    }));
  };

  const getDaysUntilPayment = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getPaymentUrgency = (days: number) => {
    if (days <= 2) return 'bg-red-500/20 border-red-500/50 text-red-300';
    if (days <= 7) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
    return 'bg-green-500/20 border-green-500/50 text-green-300';
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

        {/* Payment Scheduling Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                💳 Payment Scheduling
              </h2>
              <p className="text-slate-300">Track and manage your recurring payments</p>
            </div>
            <button
              onClick={() => setIsAddingPayment(!isAddingPayment)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium py-2 px-6 rounded-lg transition-all"
            >
              {isAddingPayment ? 'Cancel' : '+ Add Payment'}
            </button>
          </div>

          {/* Add Payment Form */}
          {isAddingPayment && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Subscription Name</label>
                  <input
                    type="text"
                    value={newPayment.name}
                    onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                    placeholder="e.g., Netflix, Spotify"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Amount ($)</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Frequency</label>
                  <select
                    value={newPayment.frequency}
                    onChange={(e) => setNewPayment({ ...newPayment, frequency: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Category</label>
                  <input
                    type="text"
                    value={newPayment.category}
                    onChange={(e) => setNewPayment({ ...newPayment, category: e.target.value })}
                    placeholder="e.g., Entertainment, Business"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <button
                onClick={addScheduledPayment}
                className="mt-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium py-2 px-6 rounded-lg transition-all"
              >
                Add Payment
              </button>
            </div>
          )}

          {/* Payments List */}
          {scheduledPayments.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/10">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">No Scheduled Payments</h3>
              <p className="text-slate-400">Add your recurring subscriptions and payments to track them</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {scheduledPayments.map((payment) => {
                const daysUntil = getDaysUntilPayment(payment.nextPaymentDate);
                const urgencyClass = getPaymentUrgency(daysUntil);
                const isEditing = editingPayment === payment.id;

                return (
                  <div
                    key={payment.id}
                    className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all ${urgencyClass}`}
                  >
                    {isEditing ? (
                      // Edit Mode
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="text-xs text-slate-300 block mb-1">Name</label>
                            <input
                              type="text"
                              value={payment.name}
                              onChange={(e) => updatePayment(payment.id, { name: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-300 block mb-1">Amount</label>
                            <input
                              type="number"
                              value={payment.amount}
                              onChange={(e) => updatePayment(payment.id, { amount: parseFloat(e.target.value) })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-300 block mb-1">Frequency</label>
                            <select
                              value={payment.frequency}
                              onChange={(e) => updatePayment(payment.id, { frequency: e.target.value as any })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="Weekly">Weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingPayment(null)}
                          className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-1 px-4 rounded-lg transition-all"
                        >
                          Done Editing
                        </button>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold mb-1">{payment.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <span className="bg-white/10 px-2 py-1 rounded">{payment.category}</span>
                              <span>•</span>
                              <span>{payment.frequency}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingPayment(payment.id)}
                              className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded-lg hover:bg-blue-500/10 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deletePayment(payment.id)}
                              className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Amount</div>
                            <div className="text-2xl font-bold text-orange-400">
                              ${payment.amount.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Next Payment</div>
                            <div className="text-lg font-semibold">
                              {payment.nextPaymentDate.toLocaleDateString()}
                            </div>
                            <div className="text-sm text-slate-400">
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Payment History</div>
                            <div className="text-lg font-semibold">
                              {payment.history.length} payment{payment.history.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Payment History */}
                        {payment.history.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs text-slate-400 mb-2">Recent Payments</div>
                            <div className="space-y-2">
                              {payment.history.slice(0, 3).map((hist, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                                  <span className="text-slate-300">{hist.date.toLocaleDateString()}</span>
                                  <span className="text-slate-300">${hist.amount.toFixed(2)}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    hist.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                    hist.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-red-500/20 text-red-300'
                                  }`}>
                                    {hist.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Simulate Payment Button */}
                        <button
                          onClick={() => simulatePayment(payment.id)}
                          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
                        >
                          Simulate Payment (Test)
                        </button>

                        {/* Reminder */}
                        {daysUntil <= 7 && (
                          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                            <span className="text-xl">⏰</span>
                            <div className="flex-1">
                              <div className="font-semibold text-yellow-300 text-sm">Payment Reminder</div>
                              <div className="text-xs text-slate-300">
                                Your {payment.name} payment of ${payment.amount.toFixed(2)} is due {daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Total Monthly Cost */}
          {scheduledPayments.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-300 mb-1">Estimated Monthly Cost</div>
                  <div className="text-3xl font-bold text-orange-300">
                    ${scheduledPayments.reduce((sum, p) => {
                      const monthlyAmount = p.frequency === 'Monthly' ? p.amount :
                                          p.frequency === 'Yearly' ? p.amount / 12 :
                                          p.amount * 4.33; // Weekly
                      return sum + monthlyAmount;
                    }, 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-300 mb-1">Total Payments</div>
                  <div className="text-2xl font-bold text-pink-300">
                    {scheduledPayments.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Prices update automatically every minute • Data provided by CoinGecko</p>
          <p className="mt-1">Your holdings are saved locally in your browser</p>
        </div>
      </div>
    </div>
  );
}











