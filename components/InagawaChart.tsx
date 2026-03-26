'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HistoryRecord {
  amount: number;
  timestamp: Date;
}

interface InagawaChartProps {
  currentBalance: number;
  history: HistoryRecord[];
}

export default function InagawaChart({ currentBalance, history }: InagawaChartProps) {
  const [days, setDays] = useState<7 | 30>(7);

  const chartData = useMemo(() => {
    // 1. Map history to JST dates (YYYY-MM-DD)
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const changesByDate: Record<string, number> = {};
    history.forEach((record) => {
      // Format as YYYY/MM/DD
      const dateStr = formatter.format(new Date(record.timestamp));
      changesByDate[dateStr] = (changesByDate[dateStr] || 0) + record.amount;
    });

    // 2. Generate the last `days` days in JST
    const today = new Date();
    // Get current JST date
    const todayJstParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(today);

    const ty = parseInt(todayJstParts.find(p => p.type === 'year')?.value || '0', 10);
    const tm = parseInt(todayJstParts.find(p => p.type === 'month')?.value || '0', 10) - 1;
    const td = parseInt(todayJstParts.find(p => p.type === 'day')?.value || '0', 10);

    const todayDate = new Date(ty, tm, td);

    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      // Format as YYYY/MM/DD using strict padding to match formatter output
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}/${month}/${day}`);
    }

    // 3. Calculate backward
    // We know the current balance today.
    // To find the balance at the end of yesterday, we subtract today's change.

    // First, sum all changes from today onwards (which might just be today)
    // Wait, the history contains all records.
    // The balance at the end of Day N = Current Balance - (Sum of changes strictly AFTER Day N)

    const data = [];
    for (const targetDateStr of dates) {
      let sumAfterTarget = 0;

      for (const [dateStr, amount] of Object.entries(changesByDate)) {
        if (dateStr > targetDateStr) {
          sumAfterTarget += amount;
        }
      }

      const balanceAtEndOfTargetDay = currentBalance - sumAfterTarget;

      // format for display (MM/DD)
      const [, m, d] = targetDateStr.split('/');

      data.push({
        name: `${m}/${d}`,
        balance: balanceAtEndOfTargetDay,
        fullDate: targetDateStr
      });
    }

    return data;
  }, [currentBalance, history, days]);

  const minBalance = Math.min(...chartData.map(d => d.balance));
  const maxBalance = Math.max(...chartData.map(d => d.balance));

  // Add some padding to Y axis
  const yDomain = [
    Math.floor((minBalance - 500) / 1000) * 1000,
    Math.ceil((maxBalance + 500) / 1000) * 1000
  ];

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300 pt-4">
      <div className="flex justify-end gap-2 px-4">
        <button
          onClick={() => setDays(7)}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            days === 7 ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          過去7日
        </button>
        <button
          onClick={() => setDays(30)}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            days === 30 ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          過去30日
        </button>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dy={10}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              width={60}
              tickFormatter={(value) => `${value.toLocaleString()}円`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              formatter={(value: any) => [`${Number(value).toLocaleString()}円`, '残高']}
              labelFormatter={(label) => `${label}`}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
