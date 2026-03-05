interface FiscalConfigWarningProps {
  missingFields: string[];
}

const FIELD_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  stateRegistration: 'Inscricao Estadual',
  legalName: 'Razao Social',
  streetAddress: 'Logradouro',
  addressNumber: 'Numero',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'Estado',
  zipCode: 'CEP',
  ibgeCode: 'Codigo IBGE',
};

/**
 * Persistent warning banner when Unit fiscal fields are incomplete.
 * Renders nothing if missingFields is empty.
 */
export function FiscalConfigWarning({ missingFields }: FiscalConfigWarningProps) {
  if (missingFields.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-lg">🚫</span>
        <div>
          <p className="text-sm font-bold text-red-800">
            Dados Fiscais Incompletos
          </p>
          <p className="text-xs text-red-700 mt-1">
            A emissao de NFC-e esta bloqueada. Os seguintes campos precisam ser
            preenchidos em Configuracoes &gt; Dados Fiscais:
          </p>
          <ul className="mt-2 space-y-0.5">
            {missingFields.map((field) => (
              <li key={field} className="text-xs text-red-700">
                • {FIELD_LABELS[field] ?? field}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
