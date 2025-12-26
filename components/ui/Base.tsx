
import React from 'react';
import { Loader2 } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ 
  className = '', variant = 'primary', size = 'md', isLoading, children, ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-slate-900 text-slate-50 hover:bg-slate-900/90 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-red-500 text-slate-50 hover:bg-red-500/90 shadow-sm",
  };
  
  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

// --- Input ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        className={`flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// --- Select (Wrapper) ---
export const SelectWrapper: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className="relative">
      <select
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none ${className}`}
        {...props}
      >
        {children}
      </select>
      {/* Custom arrow could go here */}
    </div>
  );
};

// --- Card ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm ${className}`} {...props} />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', ...props }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

// --- Table ---
export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ className = '', ...props }) => (
  <div className="relative w-full overflow-auto rounded-lg border">
    <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', ...props }) => (
  <thead className={`[&_tr]:border-b bg-slate-50/50 ${className}`} {...props} />
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', ...props }) => (
  <tr className={`border-b transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-50 ${className}`} {...props} />
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', ...props }) => (
  <th className={`h-12 px-4 text-right align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', ...props }) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

// --- Skeleton ---
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} {...props} />
);
