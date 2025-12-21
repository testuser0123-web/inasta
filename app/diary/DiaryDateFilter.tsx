'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DiaryDateFilterProps {
  selectedDate: string;
  validDates: string[]; // List of YYYY-MM-DD
}

export function DiaryDateFilter({ selectedDate, validDates }: DiaryDateFilterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => parseISO(selectedDate));
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCalendar = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (validDates.includes(dateStr)) {
      router.push(`/diary?date=${dateStr}`);
      setIsOpen(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={toggleCalendar}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-black border dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <CalendarIcon className="w-5 h-5 text-gray-500" />
        <span className="font-medium text-lg">
          {format(parseISO(selectedDate), 'yyyy年 M月 d日', { locale: ja })}
        </span>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl border dark:border-gray-800 w-[320px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="font-bold text-lg">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-medium text-gray-500">
            {weekDays.map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isValid = validDates.includes(dateStr);
              const isSelected = isSameDay(day, parseISO(selectedDate));
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  disabled={!isValid}
                  className={`
                    h-10 w-10 rounded-full flex items-center justify-center text-sm transition-all
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700'
                      : isValid
                        ? 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-900 dark:text-gray-100 font-medium cursor-pointer'
                        : 'text-gray-300 dark:text-gray-700 cursor-not-allowed decoration-slice'
                    }
                  `}
                >
                  <span className={!isValid && !isSelected ? 'line-through decoration-gray-300 dark:decoration-gray-700' : ''}>
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
