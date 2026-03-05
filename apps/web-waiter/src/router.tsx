import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { Login } from './pages/Login';
import { TableMap } from './pages/TableMap';
import { TableDetail } from './pages/TableDetail';
import { Notifications } from './pages/Notifications';
import { Payment } from './pages/Payment';
import { CashRegister } from './pages/CashRegister';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/tables" replace /> },
      { path: 'tables', element: <TableMap /> },
      { path: 'tables/:tableId', element: <TableDetail /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'payment/:checkId?', element: <Payment /> },
      { path: 'cash-register', element: <CashRegister /> },
    ],
  },
  { path: '/login', element: <Login /> },
]);
