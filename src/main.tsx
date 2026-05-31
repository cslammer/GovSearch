import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

// Self-hosted Inter (no external font CDN).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import './index.css';
import App from './App';
import { persister, queryClient } from './lib/queryClient';

const root = document.getElementById('root')!;

createRoot(root).render(
  <StrictMode>
    {persister ? (
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <App />
      </PersistQueryClientProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
