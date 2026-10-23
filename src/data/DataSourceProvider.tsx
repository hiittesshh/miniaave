'use client';

import * as React from 'react';
import type { LendingDataSource } from './source';

const DataSourceContext = React.createContext<LendingDataSource | null>(null);

/**
 * Makes one `LendingDataSource` available to every data hook. Swapping the mock for a real
 * chain source is a one-line change where this provider is created (src/app/providers.tsx).
 */
export function DataSourceProvider({ source, children }: { source: LendingDataSource; children: React.ReactNode }) {
  return <DataSourceContext.Provider value={source}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): LendingDataSource {
  const ds = React.useContext(DataSourceContext);
  if (!ds) throw new Error('useDataSource must be used inside <DataSourceProvider>');
  return ds;
}
