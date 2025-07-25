import React, { useState, useCallback, useMemo } from 'react';
import { Paper, Source } from './types';
import { searchAcademicPapers } from './services/geminiService';
import useLocalStorage from './hooks/useLocalStorage';
import { DnaIcon, SearchIcon, BookmarkIcon, TagIcon, XIcon, ExternalLinkIcon } from './components/Icons';
import Spinner from './components/Spinner';

const Header: React.FC = () => (
    <header className="bg-brand-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <DnaIcon className="w-10 h-10 text-brand-accent"/>
                <h1 className="text-3xl font-bold tracking-wider">BioChem Explorer</h1>
            </div>
        </div>
    </header>
);


const SearchBar: React.FC<{ onSearch: (query: string) => void; isLoading: boolean }> = ({ onSearch, isLoading }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-white rounded-lg shadow-sm">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for topics like 'CRISPR gene editing' or 'protein folding'..."
                className="flex-grow p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-secondary focus:outline-none transition"
                disabled={isLoading}
            />
            <button
                type="submit"
                className="flex items-center justify-center bg-brand-secondary text-white px-6 py-3 rounded-md hover:bg-brand-primary transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                disabled={isLoading}
            >
                <SearchIcon className="w-6 h-6"/>
            </button>
        </form>
    );
};

const PaperCard: React.FC<{ paper: Paper; onSave: () => void; onRemove: () => void; onSelect: () => void; isSaved: boolean }> = ({ paper, onSave, onRemove, onSelect, isSaved }) => (
    <div className="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-shadow border border-slate-200">
        <h3 className="text-xl font-bold text-brand-primary mb-2">{paper.title}</h3>
        <div className="text-sm text-slate-500 mb-3 space-x-4">
            <span><strong>Authors:</strong> {paper.authors.join(', ')}</span>
            {paper.year && <span><strong>Year:</strong> {paper.year}</span>}
        </div>
        <p className="text-slate-700 mb-4">{paper.abstract}</p>
        <div className="flex justify-between items-center">
             <button onClick={onSelect} className="text-brand-secondary font-semibold hover:underline">
                View Details & Tags
            </button>
            <button
                onClick={isSaved ? onRemove : onSave}
                className={`p-2 rounded-full transition-colors ${isSaved ? 'text-white bg-brand-highlight hover:bg-amber-500' : 'text-slate-500 hover:bg-slate-200'}`}
                aria-label={isSaved ? 'Remove paper' : 'Save paper'}
            >
                <BookmarkIcon className="w-5 h-5"/>
            </button>
        </div>
    </div>
);

const SavedPapersPanel: React.FC<{
    papers: Paper[];
    onSelect: (paper: Paper) => void;
    onRemove: (id: string) => void;
    activeTag: string | null;
    onSelectTag: (tag: string | null) => void;
}> = ({ papers, onSelect, onRemove, activeTag, onSelectTag }) => {
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        papers.forEach(p => p.tags.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [papers]);

    return (
        <div className="w-full lg:w-1/3 xl:w-1/4 p-4 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-md h-full overflow-y-auto">
                <h2 className="text-2xl font-bold text-brand-primary mb-4">Saved Papers</h2>
                {papers.length === 0 ? (
                    <p className="text-slate-500">Your saved papers will appear here. Click the bookmark icon on a search result to save it.</p>
                ) : (
                    <>
                        <div className="mb-4">
                            <h3 className="font-semibold text-slate-700 mb-2">Filter by Tag:</h3>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => onSelectTag(null)} className={`px-3 py-1 text-sm rounded-full ${!activeTag ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                    All
                                </button>
                                {allTags.map(tag => (
                                    <button key={tag} onClick={() => onSelectTag(tag)} className={`px-3 py-1 text-sm rounded-full ${activeTag === tag ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <ul className="space-y-3">
                            {papers.map(paper => (
                                <li key={paper.id} className="p-3 bg-slate-50 rounded-md border border-slate-200 group">
                                    <p className="font-semibold text-brand-secondary cursor-pointer" onClick={() => onSelect(paper)}>{paper.title}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-slate-500">{paper.year}</p>
                                        <button onClick={() => onRemove(paper.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
};

const PaperDetailModal: React.FC<{ 
    paper: Paper; 
    onClose: () => void; 
    onAddTag: (id: string, tag: string) => void;
    onRemoveTag: (id: string, tag: string) => void;
    isSaved: boolean;
}> = ({ paper, onClose, onAddTag, onRemoveTag, isSaved }) => {
    const [tagInput, setTagInput] = useState('');

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (tagInput.trim() && isSaved) {
            onAddTag(paper.id, tagInput.trim());
            setTagInput('');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 relative overflow-y-auto max-h-full" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold text-brand-primary mb-3">{paper.title}</h2>
                <div className="text-md text-slate-500 mb-4 space-x-6">
                    <span><strong>Authors:</strong> {paper.authors.join(', ')}</span>
                    {paper.year && <span><strong>Year:</strong> {paper.year}</span>}
                </div>
                <p className="text-slate-800 leading-relaxed mb-6">{paper.abstract}</p>
                
                <div className="bg-slate-50 p-4 rounded-md">
                    <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2"><TagIcon className="w-5 h-5"/> Tags</h3>
                    {!isSaved ? (
                        <p className="text-slate-500">Save this paper to add tags.</p>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {paper.tags.map(tag => (
                                    <span key={tag} className="flex items-center bg-brand-accent text-brand-primary px-3 py-1 rounded-full text-sm font-medium">
                                        {tag}
                                        <button onClick={() => onRemoveTag(paper.id, tag)} className="ml-2 text-brand-primary hover:text-white">
                                            <XIcon className="w-3 h-3"/>
                                        </button>
                                    </span>
                                ))}
                                {paper.tags.length === 0 && <p className="text-slate-500 text-sm">No tags yet.</p>}
                            </div>
                            <form onSubmit={handleAddTag} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    placeholder="Add a new tag..."
                                    className="flex-grow p-2 border border-slate-300 rounded-md text-sm"
                                />
                                <button type="submit" className="bg-brand-secondary text-white px-4 py-2 rounded-md hover:bg-brand-primary transition-colors text-sm">Add Tag</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


export default function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState('');
    const [searchResults, setSearchResults] = useState<Paper[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [savedPapers, setSavedPapers] = useLocalStorage<Paper[]>('bioChemPapers', []);
    const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    const savedPaperIds = useMemo(() => new Set(savedPapers.map(p => p.id)), [savedPapers]);

    const handleSearch = useCallback(async (query: string) => {
        setIsLoading(true);
        setError(null);
        setSummary('');
        setSearchResults([]);
        setSources([]);
        try {
            const results = await searchAcademicPapers(query);
            setSummary(results.summary);
            setSearchResults(results.papers);
            setSources(results.sources);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleSavePaper = (paper: Paper) => {
        if (!savedPaperIds.has(paper.id)) {
            setSavedPapers(prev => [...prev, paper]);
        }
    };

    const handleRemovePaper = (id: string) => {
        setSavedPapers(prev => prev.filter(p => p.id !== id));
    };
    
    const handleAddTag = (id: string, tag: string) => {
        setSavedPapers(prev => prev.map(p => {
            if (p.id === id && !p.tags.includes(tag)) {
                return { ...p, tags: [...p.tags, tag].sort() };
            }
            return p;
        }));
        if(selectedPaper?.id === id) {
            setSelectedPaper(p => p ? {...p, tags: [...p.tags, tag].sort()} : null);
        }
    };

    const handleRemoveTag = (id: string, tag: string) => {
        setSavedPapers(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, tags: p.tags.filter(t => t !== tag) };
            }
            return p;
        }));
        if(selectedPaper?.id === id) {
            setSelectedPaper(p => p ? {...p, tags: p.tags.filter(t => t !== tag)} : null);
        }
    };

    const handleSelectPaper = (paper: Paper) => {
        const savedVersion = savedPapers.find(p => p.id === paper.id);
        setSelectedPaper(savedVersion || paper);
    };

    const filteredSavedPapers = useMemo(() => {
        if (!activeTag) return savedPapers;
        return savedPapers.filter(p => p.tags.includes(activeTag));
    }, [savedPapers, activeTag]);

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <Header />
            <main className="container mx-auto p-4 flex flex-col lg:flex-row gap-4">
                <SavedPapersPanel 
                    papers={filteredSavedPapers}
                    onSelect={handleSelectPaper}
                    onRemove={handleRemovePaper}
                    activeTag={activeTag}
                    onSelectTag={setActiveTag}
                />

                <div className="w-full lg:w-2/3 xl:w-3/4 space-y-6">
                    <SearchBar onSearch={handleSearch} isLoading={isLoading} />
                    
                    {isLoading && <Spinner />}
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">{error}</div>}

                    {!isLoading && !error && searchResults.length === 0 && (
                        <div className="text-center p-10 bg-white rounded-lg shadow-sm">
                            <DnaIcon className="w-16 h-16 mx-auto text-brand-accent mb-4"/>
                            <h2 className="text-2xl font-semibold text-brand-primary">Start Your Research</h2>
                            <p className="text-slate-600 mt-2">Enter a topic in the search bar above to find relevant academic papers.</p>
                        </div>
                    )}
                    
                    {summary && (
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                           <h2 className="text-2xl font-bold text-brand-primary mb-3">Summary</h2>
                           <p className="text-slate-700 leading-relaxed">{summary}</p>
                        </div>
                    )}

                    {sources.length > 0 && (
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-bold text-brand-primary mb-3">Sources</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {sources.map((source, index) => (
                                    <li key={index} className="text-slate-600">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline flex items-center gap-1">
                                            {source.title || source.uri} <ExternalLinkIcon className="w-4 h-4" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {searchResults.length > 0 && (
                         <div className="space-y-4">
                            {searchResults.map(paper => (
                                <PaperCard 
                                    key={paper.id} 
                                    paper={paper}
                                    onSelect={() => handleSelectPaper(paper)}
                                    isSaved={savedPaperIds.has(paper.id)}
                                    onSave={() => handleSavePaper(paper)}
                                    onRemove={() => handleRemovePaper(paper.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {selectedPaper && (
                <PaperDetailModal 
                    paper={selectedPaper}
                    onClose={() => setSelectedPaper(null)}
                    isSaved={savedPaperIds.has(selectedPaper.id)}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                />
            )}
        </div>
    );
}
