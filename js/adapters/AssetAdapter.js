/**
 * ============================================================
 *  PADRÃO DE PROJETO: ADAPTER (GoF - Estrutural)
 * ============================================================
 *
 *  PROBLEMA: A API de Criptomoedas e a API da Bolsa de Valores
 *  retornam dados em formatos completamente diferentes. O front-end
 *  não pode (e não deve) saber dos detalhes internos de cada API.
 *
 *  SOLUÇÃO: Criamos um Adapter para cada fonte de dados. Cada Adapter
 *  implementa a mesma "interface" (o mesmo formato de saída), traduzindo
 *  os dados brutos da API para um formato padrão que o front-end entende.
 *
 *  FORMATO ÚNICO (Adaptee Target):
 *  {
 *    id:        string   — identificador único (ex: 'BTC', 'PETR4')
 *    nome:      string   — nome legível (ex: 'Bitcoin')
 *    preco:     number   — preço atual em BRL
 *    variacao:  number   — variação percentual em 24h (pode ser + ou -)
 *    tipo:      string   — 'cripto' ou 'bolsa'
 *    icone:     string   — emoji ou símbolo representativo
 *  }
 * ============================================================
 */

// ==============================================================
//  MOCK DAS APIs EXTERNAS (Simulando respostas reais de APIs)
// ==============================================================

/**
 * Simula a resposta bruta da API de Criptomoedas (ex: CoinGecko API).
 * Formato proprietário, diferente do nosso padrão interno.
 */
const cryptoApiMock = [
  {
    coin_id:        'bitcoin',
    coin_name:      'Bitcoin',
    coin_symbol:    'BTC',
    usd_price:      67842.50,
    percent_change: +4.32,
    market_cap_usd: 1330000000000,
  },
  {
    coin_id:        'ethereum',
    coin_name:      'Ethereum',
    coin_symbol:    'ETH',
    usd_price:      3521.80,
    percent_change: -1.87,
    market_cap_usd: 423000000000,
  },
  {
    coin_id:        'solana',
    coin_name:      'Solana',
    coin_symbol:    'SOL',
    usd_price:      185.40,
    percent_change: +8.14,
    market_cap_usd: 85000000000,
  },
];

/**
 * Simula a resposta bruta da API da Bolsa de Valores (ex: B3 / Alpha Vantage).
 * Formato completamente diferente do da API Cripto!
 */
const stockApiMock = [
  {
    ticker:          'PETR4',
    nome_empresa:    'Petrobras PN',
    ultimo_valor:    37.82,
    variacao_dia:    +1.45,
    volume_negocios: 45830000,
  },
  {
    ticker:          'AAPL',
    nome_empresa:    'Apple Inc.',
    ultimo_valor:    178.25,
    variacao_dia:    -0.73,
    volume_negocio:  62100000,
  },
  {
    ticker:          'VALE3',
    nome_empresa:    'Vale S.A. ON',
    ultimo_valor:    62.44,
    variacao_dia:    +2.18,
    volume_negocio:  38400000,
  },
];

// Taxa de câmbio simulada (USD -> BRL)
const USD_TO_BRL = 5.05;

// ==============================================================
//  ADAPTER 1: CryptoAdapter
//  Traduz dados da API de Cripto para o formato padrão NeoBroker
// ==============================================================

/**
 * @class CryptoAdapter
 * @description Adapter que converte o formato da API de Criptomoedas
 * para o formato unificado exigido pela aplicação NeoBroker.
 *
 * ADAPTER PATTERN:
 *  - Adaptee (Incompatível): objeto com { coin_name, usd_price, percent_change, ... }
 *  - Target  (Compatível):   objeto com { id, nome, preco, variacao, tipo, icone }
 */
class CryptoAdapter {
  // Mapa de ícones por símbolo de criptomoeda
  static #iconMap = {
    BTC: '₿',
    ETH: 'Ξ',
    SOL: '◎',
    BNB: '⬡',
  };

  /**
   * Converte um único objeto da API Cripto para o formato padrão.
   * @param {object} rawCrypto — Dado bruto vindo da API de cripto
   * @returns {object} — Dado no formato padrão NeoBroker
   */
  static adapt(rawCrypto) {
    // ✅ ADAPTER em ação: traduzindo campos incompatíveis
    return {
      id:       rawCrypto.coin_symbol,                          // coin_symbol → id
      nome:     rawCrypto.coin_name,                            // coin_name   → nome
      preco:    rawCrypto.usd_price * USD_TO_BRL,               // usd_price   → preco (convertido para BRL)
      variacao: rawCrypto.percent_change,                       // percent_change → variacao
      tipo:     'cripto',                                       // tipo fixo para criptomoedas
      icone:    CryptoAdapter.#iconMap[rawCrypto.coin_symbol] || '🔷',
    };
  }

  /**
   * Converte todos os ativos da API Cripto de uma vez.
   * @returns {Array<object>} — Lista de ativos no formato padrão
   */
  static adaptAll() {
    // Simula chamada à API e adapta todos os itens
    return cryptoApiMock.map(raw => CryptoAdapter.adapt(raw));
  }
}

// ==============================================================
//  ADAPTER 2: StockAdapter
//  Traduz dados da API da Bolsa para o formato padrão NeoBroker
// ==============================================================

/**
 * @class StockAdapter
 * @description Adapter que converte o formato da API da Bolsa de Valores
 * para o formato unificado exigido pela aplicação NeoBroker.
 *
 * ADAPTER PATTERN:
 *  - Adaptee (Incompatível): objeto com { ticker, ultimo_valor, variacao_dia, ... }
 *  - Target  (Compatível):   objeto com { id, nome, preco, variacao, tipo, icone }
 */
class StockAdapter {
  // Mapa de ícones para ações
  static #iconMap = {
    PETR4: '🛢️',
    AAPL:  '🍎',
    VALE3: '⛏️',
    ITUB4: '🏦',
  };

  /**
   * Converte um único objeto da API de Bolsa para o formato padrão.
   * @param {object} rawStock — Dado bruto vindo da API da bolsa
   * @returns {object} — Dado no formato padrão NeoBroker
   */
  static adapt(rawStock) {
    // ✅ ADAPTER em ação: traduzindo campos incompatíveis
    return {
      id:       rawStock.ticker,                                // ticker       → id
      nome:     rawStock.nome_empresa,                          // nome_empresa → nome
      preco:    rawStock.ultimo_valor,                          // ultimo_valor → preco (já em BRL)
      variacao: rawStock.variacao_dia,                          // variacao_dia → variacao
      tipo:     'bolsa',                                        // tipo fixo para ações
      icone:    StockAdapter.#iconMap[rawStock.ticker] || '📈',
    };
  }

  /**
   * Converte todos os ativos da API de Bolsa de uma vez.
   * @returns {Array<object>} — Lista de ativos no formato padrão
   */
  static adaptAll() {
    // Simula chamada à API e adapta todos os itens
    return stockApiMock.map(raw => StockAdapter.adapt(raw));
  }
}

// ==============================================================
//  SERVIÇO BRUTO (sem cache) — será envolto pelo Proxy
//  Este é o "serviço real" que o Proxy vai interceptar
// ==============================================================

/**
 * @class RawAssetService
 * @description Serviço que busca e adapta todos os ativos.
 * Este é o serviço "real" que faz as chamadas às APIs.
 * O Proxy irá envolvê-lo para adicionar a lógica de cache.
 */
class RawAssetService {
  /**
   * Retorna todos os ativos (cripto + bolsa) já no formato padrão.
   * @returns {Array<object>} — Lista unificada de ativos
   */
  fetchAll() {
    console.log('[RawAssetService] Buscando dados frescos das APIs...');
    const cryptos = CryptoAdapter.adaptAll();
    const stocks  = StockAdapter.adaptAll();

    // Adiciona pequena variação aleatória para simular dados em tempo real
    const allAssets = [...cryptos, ...stocks].map(asset => ({
      ...asset,
      preco:    asset.preco * (1 + (Math.random() * 0.02 - 0.01)),  // ±1% de variação
      variacao: +(asset.variacao + (Math.random() * 0.4 - 0.2)).toFixed(2), // ±0.2% de variação
    }));

    return allAssets;
  }

  /**
   * Retorna um único ativo pelo seu ID (ticker ou símbolo).
   * @param {string} id — Identificador do ativo
   * @returns {object|null} — Ativo no formato padrão ou null
   */
  fetchById(id) {
    return this.fetchAll().find(asset => asset.id === id) || null;
  }
}

// Exporta as classes para uso nos outros módulos
window.RawAssetService = RawAssetService;
window.CryptoAdapter   = CryptoAdapter;
window.StockAdapter    = StockAdapter;
