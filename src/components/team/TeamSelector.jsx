import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from 'lucide-react';

export default function TeamSelector({ teams, selectedTeamId, onSelect }) {
  if (!teams || teams.length === 0) return null;

  return (
    <Select value={selectedTeamId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-full md:w-64 bg-slate-800 border-slate-700 text-white">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <SelectValue placeholder="בחר קבוצה" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-700">
        {teams.map((team) => (
          <SelectItem 
            key={team.id} 
            value={team.id}
            className="text-white hover:bg-slate-700 focus:bg-slate-700"
          >
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}