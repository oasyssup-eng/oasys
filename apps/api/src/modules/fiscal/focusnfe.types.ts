// ── FocusNFe API Types ──────────────────────────────────────────────
// Types matching the FocusNFe v2 REST API for NFC-e operations.

/** Emitente (issuer) data — populated from Unit fiscal fields */
export interface NFCeEmitente {
  cnpj: string;
  inscricao_estadual: string;
  razao_social: string;
  nome_fantasia?: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_municipio_ibge: string;
  regime_tributario: string; // '1' = Simples Nacional
}

/** Destinatário (customer) — optional, only when CPF provided */
export interface NFCeDestinatario {
  cpf: string;
  nome?: string;
}

/** Single item in the NFC-e */
export interface NFCeItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string; // '5102' for internal sales
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  unidade_tributavel: string;
  quantidade_tributavel: number;
  valor_unitario_tributavel: number;
  icms_situacao_tributaria: string; // CSOSN for Simples Nacional
  icms_origem: string; // '0' = nacional
  valor_aproximado_tributos: number;
}

/** Payment method in the NFC-e */
export interface NFCePaymentForm {
  forma_pagamento: string; // '01'=dinheiro, '03'=credito, '04'=debito, '17'=PIX, '05'=voucher
  valor_pagamento: number;
}

/** Complete NFC-e payload sent to FocusNFe POST /v2/nfce */
export interface NFCePayload {
  natureza_operacao: string; // 'VENDA AO CONSUMIDOR'
  forma_pagamento: string; // '0' = à vista
  tipo_documento: string; // '1' = saída
  finalidade_emissao: string; // '1' = normal
  consumidor_final: string; // '1' = sim
  presenca_comprador: string; // '1' = presencial
  informacoes_adicionais_contribuinte?: string;
  items: NFCeItem[];
  formas_pagamento: NFCePaymentForm[];
  valor_produtos: number;
  valor_desconto: number;
  valor_total: number;
}

/** Response from POST /v2/nfce?ref={ref} (emit) */
export interface FocusNFeEmitResponse {
  cnpj_emitente: string;
  ref: string;
  status: string; // 'processando_autorizacao', 'autorizado', 'erro_autorizacao'
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_danfe?: string;
  caminho_xml_nota_fiscal?: string;
  url_danfe?: string;
}

/** Response from GET /v2/nfce/{ref} (status check) */
export interface FocusNFeStatusResponse {
  cnpj_emitente: string;
  ref: string;
  status: string;
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_danfe?: string;
  caminho_xml_nota_fiscal?: string;
  url_danfe?: string;
}

/** Response from DELETE /v2/nfce/{ref} (cancel) */
export interface FocusNFeCancelResponse {
  status: string; // 'cancelado', 'erro_cancelamento'
  status_sefaz?: string;
  mensagem_sefaz?: string;
  caminho_xml_cancelamento?: string;
}

/** Webhook callback payload from FocusNFe */
export interface FocusNFeCallbackPayload {
  cnpj_emitente: string;
  ref: string;
  status: string; // 'autorizado', 'erro_autorizacao', 'cancelado'
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_danfe?: string;
  caminho_xml_nota_fiscal?: string;
  url_danfe?: string;
}
