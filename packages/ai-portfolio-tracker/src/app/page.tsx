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

export default function CryptoPortfolio() {
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinGeckoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

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

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Prices update automatically every minute • Data provided by CoinGecko</p>
          <p className="mt-1">Your holdings are saved locally in your browser</p>
        </div>
      </div>
    </div>
  );
}

