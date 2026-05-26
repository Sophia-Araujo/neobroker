/**
 * ============================================================
 *  PADRÃO DE PROJETO: FACADE (GoF - Estrutural)
 * ============================================================
 *
 *  PROBLEMA: Realizar uma operação de compra/venda de um ativo
 *  envolve múltiplos subsistemas independentes:
 *    1. Serviço de Saldo (AccountService)      → debitar/creditar R$
 *    2. Serviço de Portfólio (PortfolioService) → adicionar/remover ativo
 *    3. Serviço de Histórico (HistoryService)   → registrar transação
 *
 *  Se o front-end precisasse coordenar todos esses serviços
 *  diretamente, o código ficaria complexo e acoplado.
 *
 *  SOLUÇÃO: A InvestmentFacade oferece uma interface simples
 *  com um único método (buyAsset / sellAsset) que coordena
 *  internamente todos os subsistemas. O front-end só precisa
 *  chamar a Facade — sem saber da complexidade por trás.
 *
 *  ESTRUTURA DO PADRÃO:
 *  - Facade:      InvestmentFacade
 *  - Subsistemas: AccountService, PortfolioService, HistoryService
 * ============================================================
 */

// ==============================================================
//  SUBSISTEMA 1: AccountService — Gerencia o Saldo da Conta
// ==============================================================

/**
 * @class AccountService
 * @description Subsistema responsável pelo saldo em reais da conta.
 * O cliente NÃO deve interagir com este serviço diretamente.
 */
class AccountService {
  constructor(initialBalance) {
    this._balance = initialBalance;
  }

  /** @returns {number} Saldo atual em BRL */
  getBalance() {
    return this._balance;
  }

  /**
   * Debita um valor do saldo (compra).
   * @param {number} amount — Valor em BRL a debitar
   * @throws {Error} Se saldo insuficiente
   */
  debit(amount) {
    if (amount > this._balance) {
      throw new Error(`Saldo insuficiente. Saldo: R$ ${this._balance.toFixed(2)}, Necessário: R$ ${amount.toFixed(2)}`);
    }
    this._balance -= amount;
    console.log(`[AccountService] Débito de R$ ${amount.toFixed(2)}. Novo saldo: R$ ${this._balance.toFixed(2)}`);
  }

  /**
   * Credita um valor ao saldo (venda).
   * @param {number} amount — Valor em BRL a creditar
   */
  credit(amount) {
    this._balance += amount;
    console.log(`[AccountService] Crédito de R$ ${amount.toFixed(2)}. Novo saldo: R$ ${this._balance.toFixed(2)}`);
  }
}

// ==============================================================
//  SUBSISTEMA 2: PortfolioService — Gerencia os Ativos do Usuário
// ==============================================================

/**
 * @class PortfolioService
 * @description Subsistema responsável pela carteira de ativos do usuário.
 * Armazena quantidade e preço médio de cada ativo.
 */
class PortfolioService {
  constructor() {
    // { [id]: { id, nome, tipo, icone, quantity, avgPrice } }
    this._holdings = {};
  }

  /** @returns {Array<object>} Lista de ativos na carteira */
  getHoldings() {
    return Object.values(this._holdings);
  }

  /** @returns {object|null} Posição de um ativo específico */
  getHolding(id) {
    return this._holdings[id] || null;
  }

  /**
   * Adiciona ou incrementa uma posição na carteira.
   * Recalcula o preço médio ponderado ao adicionar.
   * @param {object} asset    — Ativo no formato padrão NeoBroker
   * @param {number} quantity — Quantidade comprada
   * @param {number} price    — Preço unitário pago
   */
  addPosition(asset, quantity, price) {
    const existing = this._holdings[asset.id];

    if (existing) {
      // Recalcula preço médio ponderado
      const totalQty   = existing.quantity + quantity;
      const avgPrice   = ((existing.avgPrice * existing.quantity) + (price * quantity)) / totalQty;
      this._holdings[asset.id] = { ...existing, quantity: totalQty, avgPrice };
    } else {
      // Nova posição
      this._holdings[asset.id] = {
        id:       asset.id,
        nome:     asset.nome,
        tipo:     asset.tipo,
        icone:    asset.icone,
        quantity,
        avgPrice: price,
      };
    }
    console.log(`[PortfolioService] Posição adicionada: ${quantity}x ${asset.id} @ R$ ${price.toFixed(2)}`);
  }

  /**
   * Remove ou reduz uma posição na carteira.
   * @param {string} assetId  — ID do ativo a vender
   * @param {number} quantity — Quantidade a vender
   * @throws {Error} Se não houver quantidade suficiente na carteira
   */
  removePosition(assetId, quantity) {
    const existing = this._holdings[assetId];
    if (!existing) throw new Error(`Ativo ${assetId} não encontrado na carteira.`);
    if (existing.quantity < quantity) {
      throw new Error(`Quantidade insuficiente. Na carteira: ${existing.quantity}, Tentando vender: ${quantity}`);
    }

    existing.quantity -= quantity;
    if (existing.quantity === 0) delete this._holdings[assetId];

    console.log(`[PortfolioService] Posição removida: ${quantity}x ${assetId}`);
  }
}

// ==============================================================
//  SUBSISTEMA 3: HistoryService — Gerencia o Histórico de Transações
// ==============================================================

/**
 * @class HistoryService
 * @description Subsistema responsável por registrar todas as transações.
 */
class HistoryService {
  constructor() {
    this._transactions = [];
  }

  /** @returns {Array<object>} Histórico completo de transações */
  getTransactions() {
    return [...this._transactions].reverse(); // mais recente primeiro
  }

  /**
   * Registra uma nova transação no histórico.
   * @param {object} txData — Dados da transação
   */
  record(txData) {
    const transaction = {
      id:        `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      timestamp: new Date(),
      ...txData,
    };
    this._transactions.push(transaction);
    console.log(`[HistoryService] Transação registrada: ${transaction.id}`, transaction);
    return transaction;
  }
}

// ==============================================================
//  FACADE: InvestmentFacade
//  Ponto único de entrada para todas as operações de investimento
// ==============================================================

/**
 * @class InvestmentFacade
 * @description Fachada que simplifica a interação com os subsistemas
 * de conta, portfólio e histórico. O front-end só precisa conhecer
 * esta classe para executar operações de investimento completas.
 *
 * ✅ FACADE PATTERN: Uma única chamada a buyAsset() ou sellAsset()
 * coordena internamente os três subsistemas sem expor sua complexidade.
 */
class InvestmentFacade {
  /**
   * @param {number} initialBalance — Saldo inicial da conta em BRL
   */
  constructor(initialBalance = 100_000) {
    // Instancia os subsistemas internamente (ocultando-os do cliente)
    this._accountService   = new AccountService(initialBalance);
    this._portfolioService = new PortfolioService();
    this._historyService   = new HistoryService();
  }

  // ----------------------------------------------------------------
  //  buyAsset — Fachada para COMPRA de ativo
  // ----------------------------------------------------------------

  /**
   * Executa uma operação de compra completa.
   * ✅ FACADE em ação: coordena AccountService + PortfolioService + HistoryService
   * com uma única chamada pública.
   *
   * @param {object} asset    — Ativo no formato padrão NeoBroker
   * @param {number} quantity — Quantidade a comprar
   * @param {number} price    — Preço unitário atual em BRL
   * @returns {object} — Resultado da operação { success, transaction, newBalance }
   */
  buyAsset(asset, quantity, price) {
    const totalCost = quantity * price;
    console.log(`\n[Facade] ▶ Iniciando COMPRA: ${quantity}x ${asset.id} @ R$ ${price.toFixed(2)} = R$ ${totalCost.toFixed(2)}`);

    try {
      // PASSO 1: Valida e debita o saldo (AccountService)
      this._accountService.debit(totalCost);

      // PASSO 2: Adiciona o ativo ao portfólio (PortfolioService)
      this._portfolioService.addPosition(asset, quantity, price);

      // PASSO 3: Registra a transação no histórico (HistoryService)
      const transaction = this._historyService.record({
        tipo:      'COMPRA',
        assetId:   asset.id,
        assetNome: asset.nome,
        assetTipo: asset.tipo,
        icone:     asset.icone,
        quantity,
        price,
        totalCost,
        balanceAfter: this._accountService.getBalance(),
      });

      console.log(`[Facade] ✅ COMPRA concluída com sucesso. TX: ${transaction.id}\n`);

      return {
        success:     true,
        transaction,
        newBalance:  this._accountService.getBalance(),
        message:     `Compra de ${quantity}x ${asset.id} realizada com sucesso!`,
      };

    } catch (error) {
      console.error(`[Facade] ❌ Erro na COMPRA:`, error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ----------------------------------------------------------------
  //  sellAsset — Fachada para VENDA de ativo
  // ----------------------------------------------------------------

  /**
   * Executa uma operação de venda completa.
   * ✅ FACADE em ação: coordena os três subsistemas com uma única chamada.
   *
   * @param {object} asset    — Ativo no formato padrão NeoBroker
   * @param {number} quantity — Quantidade a vender
   * @param {number} price    — Preço unitário atual em BRL
   * @returns {object} — Resultado da operação
   */
  sellAsset(asset, quantity, price) {
    const totalReturn = quantity * price;
    const holding     = this._portfolioService.getHolding(asset.id);
    console.log(`\n[Facade] ▶ Iniciando VENDA: ${quantity}x ${asset.id} @ R$ ${price.toFixed(2)}`);

    try {
      // PASSO 1: Remove a posição do portfólio (PortfolioService)
      this._portfolioService.removePosition(asset.id, quantity);

      // PASSO 2: Credita o valor recebido (AccountService)
      this._accountService.credit(totalReturn);

      // Calcula lucro/prejuízo
      const pnl = holding ? (price - holding.avgPrice) * quantity : 0;

      // PASSO 3: Registra a transação (HistoryService)
      const transaction = this._historyService.record({
        tipo:        'VENDA',
        assetId:     asset.id,
        assetNome:   asset.nome,
        assetTipo:   asset.tipo,
        icone:       asset.icone,
        quantity,
        price,
        totalCost:   totalReturn,
        pnl,
        balanceAfter: this._accountService.getBalance(),
      });

      console.log(`[Facade] ✅ VENDA concluída. PnL: R$ ${pnl.toFixed(2)}. TX: ${transaction.id}\n`);

      return {
        success:    true,
        transaction,
        newBalance: this._accountService.getBalance(),
        pnl,
        message:    `Venda de ${quantity}x ${asset.id} realizada! ${pnl >= 0 ? '📈' : '📉'} P&L: R$ ${pnl.toFixed(2)}`,
      };

    } catch (error) {
      console.error(`[Facade] ❌ Erro na VENDA:`, error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ----------------------------------------------------------------
  //  Métodos de leitura do estado (delegam aos subsistemas)
  // ----------------------------------------------------------------

  /** @returns {number} Saldo atual em BRL */
  getBalance()      { return this._accountService.getBalance(); }

  /** @returns {Array<object>} Ativos na carteira */
  getPortfolio()    { return this._portfolioService.getHoldings(); }

  /** @returns {object|null} Posição de um ativo específico */
  getHolding(id)    { return this._portfolioService.getHolding(id); }

  /** @returns {Array<object>} Histórico de transações (mais recente primeiro) */
  getHistory()      { return this._historyService.getTransactions(); }

  /**
   * Calcula o patrimônio total: saldo + valor de mercado da carteira.
   * @param {Array<object>} currentPrices — Preços atuais dos ativos
   * @returns {number} — Patrimônio total em BRL
   */
  getTotalPatrimony(currentPrices) {
    const priceMap    = Object.fromEntries(currentPrices.map(a => [a.id, a.preco]));
    const portfolioValue = this._portfolioService
      .getHoldings()
      .reduce((sum, h) => sum + h.quantity * (priceMap[h.id] || h.avgPrice), 0);
    return this._accountService.getBalance() + portfolioValue;
  }
}

// Exporta para uso global
window.InvestmentFacade = InvestmentFacade;
