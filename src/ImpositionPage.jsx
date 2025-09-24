// src/ImpositionPage.jsx
import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const SearchResultCard = ({ quote, onSelect }) => (
    <div onClick={() => onSelect(quote)} className="p-4 bg-slate-800 rounded-lg border border-gray-700 hover:border-cyan-500 cursor-pointer transition-colors">
        <div className="flex justify-between items-center">
            <p className="font-bold text-cyan-400">Presupuesto #{quote.quote_number}</p>
            <p className="text-xs text-gray-400">{new Date(quote.created_at).toLocaleDateString()}</p>
        </div>
        <p className="text-sm text-gray-300 mt-2">Solución: {quote.chosen_solution_name}</p>
        <p className="text-lg font-semibold text-white mt-1">${quote.total_cost.toLocaleString('es-UY')}</p>
    </div>
);

export const ImpositionPage = ({ supabase, onSelectQuote }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('Busca un número de presupuesto para comenzar.');

    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsLoading(true);
        setMessage('');
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .ilike('quote_number', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            setMessage(`Error al buscar: ${error.message}`);
        } else {
            setSearchResults(data);
            if(data.length === 0) setMessage('No se encontraron resultados.');
        }
        setIsLoading(false);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Buscar Cotización para Cargar</h1>
            <div className="flex gap-2 mb-6">
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                    placeholder="Número de presupuesto..."
                    className="flex-grow bg-slate-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                />
                <button onClick={handleSearch} disabled={isLoading} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600">
                    {isLoading ? <Loader2 className="animate-spin"/> : <Search />}
                </button>
            </div>
            {message && <p className="text-center text-gray-400">{message}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map(quote => <SearchResultCard key={quote.id} quote={quote} onSelect={onSelectQuote} />)}
            </div>
        </div>
    );
};