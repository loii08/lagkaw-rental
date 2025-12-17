import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { PropertyCard } from '../components/PropertyCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { PropertyStatus } from '../types';

export const Properties = () => {
  const { properties, propertyCategories } = useData();
  const [filter, setFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const availableCategories = Array.from(
    new Set([
      ...propertyCategories,
      ...properties.map(p => String(p.category || '').trim()).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b));

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(filter.toLowerCase()) ||
                          p.address.toLowerCase().includes(filter.toLowerCase());

    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];

    const matchesBedrooms = bedrooms ? p.bedrooms >= bedrooms : true;

    const matchesStatus = statusFilter === 'ALL' ? true : p.status === statusFilter;

    const matchesCategory = categoryFilter === 'ALL' ? true : String(p.category) === categoryFilter;

    return matchesSearch && matchesPrice && matchesBedrooms && matchesStatus && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8">
        <header className="mb-6">
            <h1 className="text-2xl font-bold text-dark mb-2">Browse Properties</h1>
            <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by location, title..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-beige outline-none shadow-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-3 border rounded-xl shadow-sm flex items-center gap-2 transition-colors ${showFilters ? 'bg-beige/30 border-beige text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <SlidersHorizontal size={20} /> <span className="hidden sm:inline">Filters</span>
                </button>
            </div>
        </header>

        {}
        {showFilters && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Filter Properties</h3>
                    <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Price: ₱{priceRange[1]}</label>
                        <input
                            type="range"
                            min="0"
                            max="10000"
                            step="100"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>₱0</span>
                            <span>₱10,000+</span>
                        </div>
                    </div>

                    {}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setBedrooms(bedrooms === num ? null : num)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${bedrooms === num ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {num}+
                                </button>
                            ))}
                        </div>
                    </div>

                    {}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                            >
                                All
                            </button>
                            {Object.values(PropertyStatus).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${statusFilter === status ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {status.toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none bg-white"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="ALL">All</option>
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>{cat.replaceAll('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(prop => (
                <PropertyCard key={prop.id} property={prop} showStatus />
            ))}
        </div>

        {filteredProperties.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No properties found matching your criteria.</p>
                <button
                    onClick={() => {setFilter(''); setPriceRange([0, 10000]); setBedrooms(null); setStatusFilter('ALL'); setCategoryFilter('ALL');}}
                    className="mt-4 text-primary hover:underline"
                >
                    Clear all filters
                </button>
            </div>
        )}
    </div>
  );
};