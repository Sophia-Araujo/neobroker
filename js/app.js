/**
 * ============================================================
 *  APP.JS — Orquestrador Principal do NeoBroker
 * ============================================================
 *
 *  Este arquivo inicializa e conecta todos os padrões de projeto:
 *
 *  1. ADAPTER  → CryptoAdapter + StockAdapter (em AssetAdapter.js)
 *               Garante que dados de fontes distintas cheguem ao
 *               front-end em um único formato padronizado.
 *
 *  2. PROXY    → CachedAssetServiceProxy (em PriceServiceProxy.js)
 *               Intercepta chamadas ao RawAssetService e aplica
 *               cache de 30 segundos, evitando excesso de requisições.
 *
 *  3. FACADE   → InvestmentFacade (em InvestmentFacade.js)
 *               Oferece interface única para comprar/vender,
 *               coordenando saldo, portfólio e histórico internamente.
 *
 * ============================================================
 */

'use strict';

// ============================================================
//  INICIALIZAÇÃO DOS PADRÕES DE PROJETO
// ============================================================

// 1️⃣ ADAPTER: Instancia o serviço "bruto" (usa Adapters internamente)
const rawService = new RawAssetService();

// 2️⃣ PROXY: Envolve o serviço real com cache de 30 segundos
//    O app usa "assetService" como se fosse o RawAssetService diretamente
const assetService = new CachedAssetServiceProxy(rawService, 30_000);

// 3️⃣ FACADE: Inicializa com saldo fictício de R$ 100.000
const investmentFacade = new InvestmentFacade(100_000);

// ============================================================
//  ESTADO DA APLICAÇÃO
// ============================================================

const AppState = {
  assets:           [],    // Lista de ativos carregados (formato padrão via Adapter+Proxy)
  selectedAsset:    null,  // Ativo atualmente selecionado no modal
  isLoading:        false, // Flag de loading global
  notification:     null,  // Notificação ativa
};

// ============================================================
//  FORMATADORES DE DADOS
// ============================================================

const fmt = {
  /** Formata número como moeda BRL */
  brl: (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),

  /** Formata número como moeda USD */
  usd: (value) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),

  /** Formata variação percentual com sinal */
  pct: (value) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  },

  /** Formata data/hora de uma transação */
  datetime: (date) =>
    new Date(date).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }),
};

// ============================================================
//  RENDERIZADORES DE UI
// ============================================================

/**
 * Atualiza o painel de "Patrimônio Total" no topo da página.
 */
function renderHero() {
  const totalPatrimony = investmentFacade.getTotalPatrimony(AppState.assets);
  const balance        = investmentFacade.getBalance();
  const portfolio      = investmentFacade.getPortfolio();

  // Calcula valor de mercado da carteira
  const priceMap     = Object.fromEntries(AppState.assets.map(a => [a.id, a.preco]));
  const portfolioVal = portfolio.reduce(
    (sum, h) => sum + h.quantity * (priceMap[h.id] || h.avgPrice), 0
  );

  const el = {
    patrimony:    document.getElementById('total-patrimony'),
    balance:      document.getElementById('available-balance'),
    portfolioVal: document.getElementById('portfolio-value'),
    assetCount:   document.getElementById('asset-count'),
  };

  if (el.patrimony)    animateNumber(el.patrimony, totalPatrimony, fmt.brl);
  if (el.balance)      el.balance.textContent      = fmt.brl(balance);
  if (el.portfolioVal) el.portfolioVal.textContent = fmt.brl(portfolioVal);
  if (el.assetCount)   el.assetCount.textContent   = `${portfolio.length} ativo${portfolio.length !== 1 ? 's' : ''}`;
}

/**
 * Renderiza os cards de ativos na grid principal.
 * Os dados já chegam no formato padrão (graças ao ADAPTER + PROXY).
 */
function renderAssetCards() {
  const grid = document.getElementById('assets-grid');
  if (!grid) return;

  if (AppState.assets.length === 0) {
    grid.innerHTML = '<p class="loading-text">Carregando ativos...</p>';
    return;
  }

  grid.innerHTML = AppState.assets.map(asset => {
    const isPositive = asset.variacao >= 0;
    const holding    = investmentFacade.getHolding(asset.id);
    const hasHolding = holding && holding.quantity > 0;

    return `
      <article class="asset-card ${isPositive ? 'positive' : 'negative'}"
               data-asset-id="${asset.id}"
               role="button"
               tabindex="0"
               aria-label="Ver detalhes de ${asset.nome}">

        <div class="asset-card__header">
          <div class="asset-card__identity">
            <span class="asset-card__icon">${asset.icone}</span>
            <div>
              <span class="asset-card__ticker">${asset.id}</span>
              <span class="asset-card__badge asset-card__badge--${asset.tipo}">
                ${asset.tipo === 'cripto' ? 'Cripto' : 'Bolsa'}
              </span>
            </div>
          </div>
          <span class="asset-card__variation ${isPositive ? 'positive' : 'negative'}">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              ${isPositive
                ? '<path d="M5 2L9 8H1L5 2Z" fill="currentColor"/>'
                : '<path d="M5 8L1 2H9L5 8Z" fill="currentColor"/>'}
            </svg>
            ${fmt.pct(asset.variacao)}
          </span>
        </div>

        <div class="asset-card__name">${asset.nome}</div>

        <div class="asset-card__price">${fmt.brl(asset.preco)}</div>

        ${hasHolding ? `
          <div class="asset-card__holding">
            <span class="holding-pill">
              📦 ${holding.quantity % 1 === 0 ? holding.quantity : holding.quantity.toFixed(6)} unid.
            </span>
          </div>
        ` : ''}

        <div class="asset-card__actions">
          <button class="btn btn--buy btn--sm" data-action="buy" data-asset-id="${asset.id}">
            Comprar
          </button>
          <button class="btn btn--sell btn--sm" data-action="sell" data-asset-id="${asset.id}"
                  ${!hasHolding ? 'disabled' : ''}>
            Vender
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Renderiza a tabela/lista de transações recentes no painel lateral.
 */
function renderTransactionHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  const transactions = investmentFacade.getHistory();

  if (transactions.length === 0) {
    historyList.innerHTML = `
      <li class="history-empty">
        <span>Nenhuma transação ainda.</span>
        <small>Comece comprando um ativo!</small>
      </li>`;
    return;
  }

  historyList.innerHTML = transactions.slice(0, 8).map(tx => {
    const isBuy     = tx.tipo === 'COMPRA';
    const pnlText   = tx.pnl !== undefined
      ? `<span class="tx-pnl ${tx.pnl >= 0 ? 'positive' : 'negative'}">${tx.pnl >= 0 ? '+' : ''}${fmt.brl(tx.pnl)}</span>`
      : '';

    return `
      <li class="history-item">
        <div class="history-item__icon ${isBuy ? 'buy' : 'sell'}">
          ${tx.icone}
        </div>
        <div class="history-item__info">
          <div class="history-item__top">
            <span class="history-item__name">${tx.assetId}</span>
            <span class="history-item__value ${isBuy ? 'negative' : 'positive'}">
              ${isBuy ? '−' : '+'}${fmt.brl(tx.totalCost)}
            </span>
          </div>
          <div class="history-item__bottom">
            <span class="history-item__detail">
              <span class="tx-badge tx-badge--${tx.tipo.toLowerCase()}">${tx.tipo}</span>
              ${tx.quantity % 1 === 0 ? tx.quantity : tx.quantity.toFixed(4)} × ${fmt.brl(tx.price)}
            </span>
            ${pnlText}
          </div>
          <div class="history-item__time">${fmt.datetime(tx.timestamp)}</div>
        </div>
      </li>`;
  }).join('');
}

/**
 * Renderiza o painel de portfólio.
 */
function renderPortfolio() {
  const list     = document.getElementById('portfolio-list');
  const emptyMsg = document.getElementById('portfolio-empty');
  if (!list) return;

  const holdings  = investmentFacade.getPortfolio();
  const priceMap  = Object.fromEntries(AppState.assets.map(a => [a.id, a.preco]));

  if (holdings.length === 0) {
    list.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'flex';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  list.innerHTML = holdings.map(h => {
    const currentPrice = priceMap[h.id] || h.avgPrice;
    const currentValue = h.quantity * currentPrice;
    const pnl          = (currentPrice - h.avgPrice) * h.quantity;
    const pnlPct       = ((currentPrice / h.avgPrice) - 1) * 100;
    const isPos        = pnl >= 0;

    return `
      <li class="portfolio-item">
        <span class="portfolio-item__icon">${h.icone}</span>
        <div class="portfolio-item__info">
          <div class="portfolio-item__top">
            <span class="portfolio-item__name">${h.id}</span>
            <span class="portfolio-item__value">${fmt.brl(currentValue)}</span>
          </div>
          <div class="portfolio-item__bottom">
            <span class="portfolio-item__qty">
              ${h.quantity % 1 === 0 ? h.quantity : h.quantity.toFixed(6)} un.
            </span>
            <span class="portfolio-item__pnl ${isPos ? 'positive' : 'negative'}">
              ${isPos ? '+' : ''}${fmt.brl(pnl)} (${fmt.pct(pnlPct)})
            </span>
          </div>
        </div>
      </li>`;
  }).join('');
}

// ============================================================
//  MODAL DE COMPRA/VENDA
// ============================================================

/**
 * Abre o modal de operação para um ativo específico.
 * @param {string} assetId — ID do ativo
 * @param {'buy'|'sell'} action — Tipo de operação
 */
function openModal(assetId, action) {
  const asset = AppState.assets.find(a => a.id === assetId);
  if (!asset) return;

  AppState.selectedAsset = asset;

  const modal     = document.getElementById('trade-modal');
  const title     = document.getElementById('modal-title');
  const assetName = document.getElementById('modal-asset-name');
  const assetPrc  = document.getElementById('modal-asset-price');
  const qtyInput  = document.getElementById('modal-quantity');
  const totalEl   = document.getElementById('modal-total');
  const submitBtn = document.getElementById('modal-submit');
  const actionEl  = document.getElementById('modal-action-type');
  const holdingEl = document.getElementById('modal-holding-info');
  const holding   = investmentFacade.getHolding(assetId);

  // Preenche informações do modal
  title.textContent     = action === 'buy' ? 'Comprar Ativo' : 'Vender Ativo';
  assetName.textContent = `${asset.icone} ${asset.nome} (${asset.id})`;
  assetPrc.textContent  = fmt.brl(asset.preco);
  actionEl.value        = action;
  qtyInput.value        = '';
  totalEl.textContent   = fmt.brl(0);

  // Mostra posição atual se houver
  if (holding && holding.quantity > 0) {
    holdingEl.style.display = 'flex';
    holdingEl.querySelector('.holding-qty').textContent =
      `${holding.quantity % 1 === 0 ? holding.quantity : holding.quantity.toFixed(6)} un. · PM: ${fmt.brl(holding.avgPrice)}`;
  } else {
    holdingEl.style.display = 'none';
  }

  // Estilo do botão por ação
  submitBtn.className = `btn ${action === 'buy' ? 'btn--buy' : 'btn--sell'} btn--full`;
  submitBtn.textContent = action === 'buy' ? '✓ Confirmar Compra' : '✓ Confirmar Venda';

  // Abre o modal
  modal.classList.add('modal--open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => qtyInput.focus(), 100);
}

/**
 * Fecha o modal de operação.
 */
function closeModal() {
  const modal = document.getElementById('trade-modal');
  modal.classList.remove('modal--open');
  document.body.style.overflow = '';
  AppState.selectedAsset = null;
}

/**
 * Atualiza o total estimado no modal conforme o usuário digita a quantidade.
 */
function updateModalTotal() {
  const qtyInput = document.getElementById('modal-quantity');
  const totalEl  = document.getElementById('modal-total');
  if (!AppState.selectedAsset || !qtyInput || !totalEl) return;

  const qty   = parseFloat(qtyInput.value) || 0;
  const total = qty * AppState.selectedAsset.preco;
  totalEl.textContent = fmt.brl(total);
}

// ============================================================
//  EXECUÇÃO DA OPERAÇÃO (usa a FACADE)
// ============================================================

/**
 * Processa o formulário de compra/venda.
 * ✅ FACADE em ação: chama apenas investmentFacade.buyAsset() ou sellAsset()
 */
function handleTradeSubmit(e) {
  e.preventDefault();

  const asset    = AppState.selectedAsset;
  const quantity = parseFloat(document.getElementById('modal-quantity').value);
  const action   = document.getElementById('modal-action-type').value;

  if (!asset || !quantity || quantity <= 0) {
    showNotification('Insira uma quantidade válida.', 'error');
    return;
  }

  let result;

  if (action === 'buy') {
    // ✅ FACADE: uma única chamada coordena saldo + portfólio + histórico
    result = investmentFacade.buyAsset(asset, quantity, asset.preco);
  } else {
    // ✅ FACADE: mesma simplicidade para venda
    result = investmentFacade.sellAsset(asset, quantity, asset.preco);
  }

  if (result.success) {
    closeModal();
    showNotification(result.message, 'success');
    refreshUI();
  } else {
    showNotification(result.message, 'error');
  }
}

// ============================================================
//  SISTEMA DE NOTIFICAÇÕES
// ============================================================

function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-area');
  if (!container) return;

  const id = `notif-${Date.now()}`;
  const el = document.createElement('div');
  el.id        = id;
  el.className = `notification notification--${type}`;
  el.innerHTML = `
    <span class="notification__icon">
      ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
    </span>
    <span class="notification__message">${message}</span>
  `;

  container.appendChild(el);
  setTimeout(() => el.classList.add('notification--visible'), 10);
  setTimeout(() => {
    el.classList.remove('notification--visible');
    setTimeout(() => el.remove(), 400);
  }, 4000);
}

// ============================================================
//  INDICADOR DE STATUS DO CACHE (PROXY)
// ============================================================

/** Atualiza o badge de status do Proxy/Cache na UI */
function updateCacheIndicator(status, secondsLeft) {
  const badge    = document.getElementById('cache-status-badge');
  const text     = document.getElementById('cache-status-text');
  const bar      = document.getElementById('cache-progress-bar');
  if (!badge || !text) return;

  const isHit = status === 'HIT';
  badge.className = `cache-badge cache-badge--${isHit ? 'hit' : 'miss'}`;
  text.textContent = isHit ? `Cache ativo · ${secondsLeft}s` : 'Dados atualizados';

  if (bar) {
    const pct = isHit ? (secondsLeft / 30) * 100 : 100;
    bar.style.width = `${pct}%`;
    bar.className   = `cache-bar__fill ${isHit ? 'hit' : 'miss'}`;
  }
}

// ============================================================
//  ANIMAÇÃO DE NÚMEROS (efeito contador)
// ============================================================

function animateNumber(el, targetValue, formatter) {
  const startValue = parseFloat(el.dataset.currentValue) || 0;
  const duration   = 600;
  const startTime  = performance.now();

  function step(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current  = startValue + (targetValue - startValue) * eased;

    el.textContent       = formatter(current);
    el.dataset.currentValue = targetValue;

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ============================================================
//  ATUALIZAÇÃO PERIÓDICA DE PREÇOS
// ============================================================

/**
 * Busca os ativos via Proxy (com cache) e atualiza o estado da aplicação.
 * O Proxy decide se busca dados frescos ou usa o cache de 30 segundos.
 */
function fetchAndUpdateAssets() {
  // ✅ PROXY: a chamada a assetService.fetchAll() pode retornar do cache
  //    sem chamar o serviço real (RawAssetService)
  AppState.assets = assetService.fetchAll();
  refreshUI();
}

/** Re-renderiza todos os componentes da UI com o estado atual */
function refreshUI() {
  renderHero();
  renderAssetCards();
  renderTransactionHistory();
  renderPortfolio();
}

// ============================================================
//  EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // --- Delegação de eventos nos cards de ativos ---
  document.getElementById('assets-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    openModal(btn.dataset.assetId, btn.dataset.action);
  });

  // --- Modal: fechar ---
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // --- Modal: atualizar total ao digitar quantidade ---
  document.getElementById('modal-quantity')?.addEventListener('input', updateModalTotal);

  // --- Modal: submit do formulário (usa a FACADE) ---
  document.getElementById('trade-form')?.addEventListener('submit', handleTradeSubmit);

  // --- Botão de refresh manual ---
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    assetService.invalidateCache();
    fetchAndUpdateAssets();
    showNotification('Preços atualizados!', 'success');
  });

  // --- Listener do Proxy: atualiza indicador de cache na UI ---
  document.addEventListener('cacheStatusUpdate', (e) => {
    updateCacheIndicator(e.detail.status, e.detail.secondsLeft);
  });

  // --- Tabs do painel lateral ---
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });
}

// ============================================================
//  BOOTSTRAP DA APLICAÇÃO
// ============================================================

function init() {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║         NeoBroker — Design Patterns       ║
  ║                                           ║
  ║  • ADAPTER  → AssetAdapter.js             ║
  ║  • PROXY    → PriceServiceProxy.js        ║
  ║  • FACADE   → InvestmentFacade.js         ║
  ╚═══════════════════════════════════════════╝
  `);

  setupEventListeners();

  // Primeira carga de ativos (Proxy → cache MISS → chama RawAssetService → Adapters)
  fetchAndUpdateAssets();

  // Atualiza preços a cada 15 segundos (Proxy retornará cache por até 30s)
  setInterval(fetchAndUpdateAssets, 15_000);

  // Countdown do cache na UI a cada segundo
  setInterval(() => {
    const status = assetService.getCacheStatus();
    updateCacheIndicator(status.isValid ? 'HIT' : 'MISS', status.secondsLeft);
  }, 1_000);
}

// Aguarda o DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
