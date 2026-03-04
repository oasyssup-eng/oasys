import type { OrderStatus } from '@oasys/shared';

interface OrderStatusTimelineProps {
  status: OrderStatus;
}

const steps = [
  { key: 'CONFIRMED', label: 'Recebido', icon: '✅' },
  { key: 'PREPARING', label: 'Preparando', icon: '👨‍🍳' },
  { key: 'READY', label: 'Pronto', icon: '🔔' },
  { key: 'DELIVERED', label: 'Entregue', icon: '🎉' },
];

const statusOrder: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  DELIVERED: 4,
};

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const currentStep = statusOrder[status] ?? 0;

  return (
    <div className="flex items-center justify-between px-4 py-6">
      {steps.map((step, idx) => {
        const stepNum = statusOrder[step.key] ?? 0;
        const isActive = currentStep >= stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={step.key} className="flex flex-col items-center relative flex-1">
            {/* Connector line */}
            {idx > 0 && (
              <div
                className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                  currentStep >= stepNum ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              />
            )}

            {/* Circle */}
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                isCurrent
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 animate-pulse'
                  : isActive
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step.icon}
            </div>

            {/* Label */}
            <span
              className={`mt-2 text-xs text-center ${
                isActive ? 'text-orange-600 font-medium' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
