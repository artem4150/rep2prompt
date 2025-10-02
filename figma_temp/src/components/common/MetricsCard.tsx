import React from 'react';
import { Card } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  delta?: number;
  description?: string;
  icon?: React.ReactNode;
}

export function MetricsCard({ title, value, delta, description, icon }: MetricsCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-3">
        <p className="text-muted-foreground">{title}</p>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      
      <div className="flex items-end gap-2 mb-1">
        <h2 className="text-foreground">{value}</h2>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mb-1 ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : isNegative ? <TrendingDown className="h-4 w-4" /> : null}
            <span className="text-sm">{delta > 0 ? '+' : ''}{delta}%</span>
          </div>
        )}
      </div>
      
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </Card>
  );
}
