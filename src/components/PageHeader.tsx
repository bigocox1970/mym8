import React from "react";
import { MenuToggleButton } from "@/components/Layout";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * A consistent header component for all pages that matches Dashboard style
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description,
  children 
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        <MenuToggleButton />
      </div>
    </div>
  );
}; 