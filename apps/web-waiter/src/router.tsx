import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { Login } from './pages/Login';
import { Payment } from './pages/Payment';
import { CashRegister } from './pages/CashRegister';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/payment" replace /> },
      { path: 'payment/:checkId?', element: <Payment /> },
      { path: 'cash-register', element: <CashRegister /> },
    ],
  },
  { path: '/login', element: <Login /> },
]);
