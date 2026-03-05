import { createBrowserRouter } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ClosingWizard } from './pages/ClosingWizard';
import { ClosingHistory } from './pages/ClosingHistory';
import { FiscalNotes } from './pages/FiscalNotes';

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/closing', element: <ClosingWizard /> },
  { path: '/closing/history', element: <ClosingHistory /> },
  { path: '/fiscal', element: <FiscalNotes /> },
]);
