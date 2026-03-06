import { createBrowserRouter } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ClosingWizard } from './pages/ClosingWizard';
import { ClosingHistory } from './pages/ClosingHistory';
import { FiscalNotes } from './pages/FiscalNotes';
import { StockDashboard } from './pages/StockDashboard';
import { StockItemList } from './pages/StockItemList';
import { StockItemDetail } from './pages/StockItemDetail';

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/closing', element: <ClosingWizard /> },
  { path: '/closing/history', element: <ClosingHistory /> },
  { path: '/fiscal', element: <FiscalNotes /> },
  { path: '/stock', element: <StockDashboard /> },
  { path: '/stock/items', element: <StockItemList /> },
  { path: '/stock/items/:id', element: <StockItemDetail /> },
]);
