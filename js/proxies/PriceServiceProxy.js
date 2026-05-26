/**
 * ============================================================
 *  PADRÃO DE PROJETO: PROXY (GoF - Estrutural)
 * ============================================================
 *
 *  PROBLEMA: O serviço de busca de ativos (RawAssetService) faz
 *  "chamadas à API" a cada requisição. Em uma aplicação real,
 *  isso esgotaria rapidamente os limites de rate limit da API
 *  (ex: CoinGecko permite ~50 req/min no plano gratuito).
 *
 *  SOLUÇÃO: Um Proxy que intercepta as requisições ao serviço real
 *  e implementa um sistema de cache em memória. Se os dados foram
 *  buscados há menos de 30 segundos, o Proxy retorna o cache
 *  sem chamar o serviço real. Caso contrário, chama o serviço real,
 *  armazena o resultado no cache, e o retorna.
 *
 *  O front-end usa o Proxy exatamente como usaria o serviço real,
 *  sem saber da existência do cache (transparência total).
 *
 *  ESTRUTURA DO PADRÃO:
 *  - Subject (Interface):     RawAssetService (a "interface" que ambos seguem)
 *  - RealSubject:             RawAssetService (o serviço real)
 *  - Proxy:                   CachedAssetServiceProxy (nosso Proxy com cache)
 * ============================================================
 */

/**
 * @class CachedAssetServiceProxy
 * @description Proxy que envolve o RawAssetService com um sistema de cache.
 * O cliente (app.js) usa esta classe como se fosse o serviço real,
 * sem precisar saber da lógica de cache.
 *
 * ⚠️ PROXY PATTERN: Esta classe TEM a mesma interface pública do
 * RawAssetService (métodos fetchAll e fetchById), garantindo
 * substituição transparente.
 */
class CachedAssetServiceProxy {
  /**
   * @param {RawAssetService} realService — O serviço real a ser "proxificado"
   * @param {number} cacheDurationMs — Duração do cache em milissegundos (padrão: 30s)
   */
  constructor(realService, cacheDurationMs = 30_000) {
    // ✅ PROXY: mantém referência ao serviço real
    this._realService   = realService;
    this._cacheDuration = cacheDurationMs;

    // Estrutura do cache em memória
    this._cache = {
      all: {
        data:      null,   // dados armazenados
        timestamp: null,   // momento em que foi armazenado (Date.now())
      },
      byId: {},            // cache individual por ID { [id]: { data, timestamp } }
    };
  }

  // ----------------------------------------------------------------
  //  Método auxiliar privado: verifica se um item do cache é válido
  // ----------------------------------------------------------------

  /**
   * Verifica se uma entrada do cache ainda é válida (dentro do tempo limite).
   * @param {object} cacheEntry — { data, timestamp }
   * @returns {boolean}
   */
  _isCacheValid(cacheEntry) {
    if (!cacheEntry.timestamp || !cacheEntry.data) return false;
    const age = Date.now() - cacheEntry.timestamp;
    return age < this._cacheDuration;
  }

  /**
   * Calcula quantos segundos restam até o cache expirar.
   * @param {object} cacheEntry
   * @returns {number} segundos restantes (0 se expirado)
   */
  _cacheSecondsRemaining(cacheEntry) {
    if (!cacheEntry.timestamp) return 0;
    const age       = Date.now() - cacheEntry.timestamp;
    const remaining = Math.max(0, (this._cacheDuration - age) / 1000);
    return Math.round(remaining);
  }

  // ----------------------------------------------------------------
  //  fetchAll — Com cache para lista completa de ativos
  // ----------------------------------------------------------------

  /**
   * Retorna todos os ativos. Usa cache se disponível e válido.
   * ⚠️ PROXY PATTERN: mesma assinatura do RawAssetService.fetchAll()
   * @returns {Array<object>}
   */
  fetchAll() {
    const cacheEntry = this._cache.all;

    if (this._isCacheValid(cacheEntry)) {
      // ✅ PROXY em ação: retorna do cache, SEM chamar o serviço real
      const secondsLeft = this._cacheSecondsRemaining(cacheEntry);
      console.log(
        `[Proxy Cache HIT] fetchAll() → Retornando ${cacheEntry.data.length} ativos do cache.` +
        ` Cache expira em ${secondsLeft}s.`
      );
      this._notifyCacheStatus('HIT', secondsLeft);
      return cacheEntry.data;
    }

    // Cache expirado ou vazio → chama o serviço real
    console.log('[Proxy Cache MISS] fetchAll() → Cache expirado. Chamando RawAssetService...');
    this._notifyCacheStatus('MISS', 0);

    const freshData = this._realService.fetchAll();  // 🔴 chamada ao serviço real

    // Atualiza o cache com os dados frescos
    this._cache.all = {
      data:      freshData,
      timestamp: Date.now(),
    };

    console.log(`[Proxy Cache] Cache atualizado. Próxima atualização em ${this._cacheDuration / 1000}s.`);
    return freshData;
  }

  // ----------------------------------------------------------------
  //  fetchById — Com cache individual por ID de ativo
  // ----------------------------------------------------------------

  /**
   * Retorna um único ativo pelo ID. Cache individual por ativo.
   * ⚠️ PROXY PATTERN: mesma assinatura do RawAssetService.fetchById()
   * @param {string} id — Identificador do ativo (ex: 'BTC', 'PETR4')
   * @returns {object|null}
   */
  fetchById(id) {
    const cacheEntry = this._cache.byId[id] || { data: null, timestamp: null };

    if (this._isCacheValid(cacheEntry)) {
      // ✅ PROXY em ação: retorna cache individual do ativo
      const secondsLeft = this._cacheSecondsRemaining(cacheEntry);
      console.log(
        `[Proxy Cache HIT] fetchById('${id}') → Retornando do cache.` +
        ` Expira em ${secondsLeft}s.`
      );
      return cacheEntry.data;
    }

    console.log(`[Proxy Cache MISS] fetchById('${id}') → Chamando RawAssetService...`);

    // Otimização: se o fetchAll recente estiver em cache, usa ele
    if (this._isCacheValid(this._cache.all)) {
      const asset = this._cache.all.data.find(a => a.id === id) || null;
      this._cache.byId[id] = { data: asset, timestamp: Date.now() };
      return asset;
    }

    const asset = this._realService.fetchById(id);  // 🔴 chamada ao serviço real

    this._cache.byId[id] = {
      data:      asset,
      timestamp: Date.now(),
    };

    return asset;
  }

  // ----------------------------------------------------------------
  //  Método para forçar invalidação do cache (ex: após uma compra)
  // ----------------------------------------------------------------

  /**
   * Invalida o cache forçando uma nova busca na próxima chamada.
   * Útil após operações de compra/venda que afetam preços.
   */
  invalidateCache() {
    this._cache.all   = { data: null, timestamp: null };
    this._cache.byId  = {};
    console.log('[Proxy] Cache invalidado manualmente.');
  }

  /**
   * Retorna o estado atual do cache para debug/exibição na UI.
   * @returns {object} — informações sobre o cache
   */
  getCacheStatus() {
    const isValid     = this._isCacheValid(this._cache.all);
    const secondsLeft = this._cacheSecondsRemaining(this._cache.all);
    return {
      isValid,
      secondsLeft,
      lastUpdate: this._cache.all.timestamp
        ? new Date(this._cache.all.timestamp).toLocaleTimeString('pt-BR')
        : 'Nunca',
      totalCached: this._cache.all.data?.length || 0,
    };
  }

  // ----------------------------------------------------------------
  //  Notificação de status para a UI
  // ----------------------------------------------------------------

  /**
   * Dispara um evento customizado para que a UI possa exibir o status do cache.
   * @param {'HIT'|'MISS'} status
   * @param {number} secondsLeft
   */
  _notifyCacheStatus(status, secondsLeft) {
    const event = new CustomEvent('cacheStatusUpdate', {
      detail: { status, secondsLeft, timestamp: new Date().toLocaleTimeString('pt-BR') },
    });
    document.dispatchEvent(event);
  }
}

// Exporta para uso global
window.CachedAssetServiceProxy = CachedAssetServiceProxy;
