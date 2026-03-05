import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { App } from './App';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load pages for code splitting
const SessionInit = lazy(() => import('./pages/SessionInit'));
const Menu = lazy(() => import('./pages/Menu'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const CheckSummary = lazy(() => import('./pages/CheckSummary'));
const Closed = lazy(() => import('./pages/Closed'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/demo" replace />,
  },
  {
    path: '/:slug',
    element: <App />,
    children: [
      {
        index: true,
        element: <Lazy><SessionInit /></Lazy>,
      },
      {
        path: 'menu',
        element: <Lazy><Menu /></Lazy>,
      },
      {
        path: 'product/:id',
        element: <Lazy><ProductDetail /></Lazy>,
      },
      {
        path: 'cart',
        element: <Lazy><Cart /></Lazy>,
      },
      {
        path: 'checkout',
        element: <Lazy><Checkout /></Lazy>,
      },
      {
        path: 'orders',
        element: <Lazy><MyOrders /></Lazy>,
      },
      {
        path: 'orders/:id',
        element: <Lazy><OrderTracking /></Lazy>,
      },
      {
        path: 'check',
        element: <Lazy><CheckSummary /></Lazy>,
      },
      {
        path: 'closed',
        element: <Lazy><Closed /></Lazy>,
      },
    ],
  },
]);
