import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getSavedLocations, deleteSavedLocation } from '../lib/firebase';
import { Star, ChevronDown, MapPin, ArrowUpDown, Trash2, Loader2 } from 'lucide-react';

interface SavedLocationsSwitcherProps {
  user: User | null;
  onSelect: (location: any) => void;
}

export const SavedLocationsSwitcher: React.FC<SavedLocationsSwitcherProps> = ({ user, onSelect }) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'latitude'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      getSavedLocations(user.uid).then(setLocations);
    } else {
      setLocations([]);
    }
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation();
    if (!user || !locationId) return;
    try {
      setDeletingId(locationId);
      await deleteSavedLocation(user.uid, locationId);
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
    } catch (err) {
      console.error("Failed to delete saved location:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const sortedLocations = [...locations].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') comparison = (a.name || '').localeCompare(b.name || '');
    else if (sortBy === 'latitude') comparison = (a.latitude || 0) - (b.latitude || 0);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (!user || locations.length === 0) return null;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white text-xs cursor-pointer"
      >
        <Star className="w-3 h-3 text-amber-400" />
        <span>Locais Salvos ({locations.length})</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-2xl z-50">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-white/50 border-b border-white/5">
            <span>Ordenar:</span>
            <button 
              onClick={() => {
                if (sortBy === 'name') setSortBy('latitude');
                else { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }
              }}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              {sortBy} ({sortOrder}) <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
            {sortedLocations.map((loc, idx) => (
              <div 
                key={`saved-loc-${loc.id || 'loc'}-${loc.name}-${idx}`} 
                className="group flex items-center justify-between w-full hover:bg-white/10 rounded-lg transition-colors px-2 py-1"
              >
                <button
                  onClick={() => {
                    onSelect(loc);
                    setIsOpen(false);
                  }}
                  className="flex flex-1 items-center gap-2 py-1 text-left text-xs text-white truncate mr-1 cursor-pointer"
                  title={loc.name}
                >
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{loc.name}</span>
                </button>
                <button
                  onClick={(e) => handleDelete(e, loc.id)}
                  disabled={deletingId === loc.id}
                  title="Excluir este local"
                  className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
                >
                  {deletingId === loc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
