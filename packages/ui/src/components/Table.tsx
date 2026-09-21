import React from 'react';
import { cn } from '../utils/cn';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export const Table: React.FC<TableProps> = ({ className, wrapperClassName, children, ...props }) => {
  return (
    <div className={cn('overflow-x-auto rounded-[12px] border border-slate-200 bg-white', wrapperClassName)}>
      <table className={cn('min-w-full divide-y divide-slate-200 text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <thead className={cn('bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider', className)} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tbody className={cn('divide-y divide-slate-200 bg-white text-slate-800', className)} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tr className={cn('hover:bg-slate-50/60 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
};

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <th scope="col" className={cn('px-4 py-3.5 font-semibold text-slate-700', className)} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <td className={cn('px-4 py-3.5 whitespace-nowrap text-sm', className)} {...props}>
      {children}
    </td>
  );
};
