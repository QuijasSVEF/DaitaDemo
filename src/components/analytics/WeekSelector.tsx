import React from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

interface WeekOption {
  label: string;
  startDate: Date;
  endDate: Date;
  value: string;
}

interface Props {
  districts?: { id: string; name: string; code: string }[];
  selectedDistrict: string;
  selectedWeek: string;
  weeks: WeekOption[];
  onWeekChange: (week: string) => void;
  onDistrictChange: (district: string) => void;
}

export function WeekSelector({ 
  districts = [], 
  selectedDistrict, 
  selectedWeek, 
  weeks, 
  onWeekChange,
  onDistrictChange 
}: Props) {
  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <select
          value={selectedWeek}
          onChange={(e) => onWeekChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-svef-purple focus:border-transparent"
        >
          <option value="all">All Time</option>
          {weeks.map((week) => (
            <option key={week.value} value={week.value}>
              Week of {formatDate(week.startDate)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}