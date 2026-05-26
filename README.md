# 🌍 NeoBroker — Plataforma de Investimentos Híbrida

O **NeoBroker** é uma plataforma simulada de investimentos que une o mercado de Criptomoedas e a Bolsa de Valores (B3) em uma única interface clara, sofisticada e responsiva. O principal objetivo deste projeto é demonstrar a aplicação prática e combinada de três importantes **Padrões de Projeto GoF (Gang of Four)** em uma arquitetura *front-end* limpa.

---

## 🛠️ Padrões de Projeto Aplicados

O projeto foi estruturado utilizando uma abordagem modular, isolando as responsabilidades de negócio da manipulação direta da interface do usuário (UI).

### 1. 🔌 Adapter (Estrutural)
As APIs de Criptomoedas (fictícia, simulando o CoinGecko) e da Bolsa de Valores (fictícia, simulando a B3) fornecem dados em formatos totalmente incompatíveis. 
* **Solução:** Criamos as classes `CryptoAdapter` e `StockAdapter` para traduzir as respostas brutas das APIs em um formato interno padronizado e unificado, transparente para o restante da aplicação.

### 2. 🛡️ Proxy (Estrutural)
Requisições constantes de preços em tempo real consomem muita banda e podem estourar limites de taxas (*rate limiting*) de APIs financeiras gratuitas.
* **Solução:** O `CachedAssetServiceProxy` intercepta todas as chamadas de busca de ativos. Se os dados locais tiverem menos de 30 segundos, o Proxy serve o cache em memória (**Cache HIT**). Caso contrário, ele busca dados frescos e renova o ciclo (**Cache MISS**), mostrando um indicador em tempo real na interface.

### 3. 🏛️ Facade (Estrutural)
Realizar uma compra ou venda exige a coordenação de múltiplos subsistemas independentes: validar/atualizar saldo (`AccountService`), modificar posições na carteira (`PortfolioService`) e registrar o extrato (`HistoryService`).
* **Solução:** A classe `InvestmentFacade` centraliza essa complexidade em métodos simples (`buyAsset` e `sellAsset`). O arquivo orquestrador `app.js` faz apenas uma chamada à Facade, que gerencia os três subsistemas de forma atômica e segura.

---

## 🎨 Design & Interface

A interface foi projetada com foco no **"básico bem feito"**, priorizando a funcionalidade e a clareza para o usuário em vez de elementos visuais pesados e confusos.

* **Mobile-First & Responsivo:** Construído puramente com CSS moderno e variáveis nativas (`:root`), adaptando-se perfeitamente desde dispositivos móveis até telas *UltraWide*.
* **Efeito Blur Premium:** Cabeçalho fixo utilizando `backdrop-filter: blur(20px)` para um visual moderno e fluido durante a rolagem.
* **Microinterações:** Feedback visual de lucro/prejuízo com cores semânticas suaves, animação de contador numérico no patrimônio total e barra de progresso viva para o tempo restante do cache do Proxy.

