import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function Login() {
  const [pin, setPin] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(pin);
    const token = localStorage.getItem('oasys_token');
    if (token) navigate('/');
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 4) setPin((prev) => prev + digit);
  };

  const handleClear = () => setPin('');

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          OASYS
        </h1>
        <p className="text-gray-400 text-center mb-8">Digite seu PIN</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-3 mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
                  pin.length > i
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-600'
                }`}
              >
                {pin.length > i ? '*' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-16 rounded-xl bg-gray-800 text-white text-2xl font-semibold hover:bg-gray-700 active:bg-gray-600 transition-colors"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-16 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-16 rounded-xl bg-gray-800 text-white text-2xl font-semibold hover:bg-gray-700 active:bg-gray-600"
            >
              0
            </button>
            <button
              type="submit"
              disabled={pin.length !== 4 || isLoading}
              className="h-16 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
