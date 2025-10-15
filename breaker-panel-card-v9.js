class BreakerPanelCard extends HTMLElement {
  // Define propriedades do elemento
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  // Construtor do elemento
  constructor() {
    super();
    this.breakers = [];
    this.mainBreakers = [];
    this.attachShadow({ mode: 'open' });
  }

  // Método para definir configuração
  setConfig(config) {
    if (!config.breakers) {
      throw new Error('Você precisa definir breakers');
    }

    this.config = config;
    this.breakers = config.breakers || [];
    this.mainBreakers = config.main_breakers || [];
    this.title = config.title || 'Quadro de Distribuição';
    this.columns = config.columns || 2;
    
    this.render();
  }

  // Método chamado quando as entidades do Home Assistant são atualizadas
  set hass(hass) {
    this._hass = hass;
    this.updateBreakerStates();
  }

  // Método para atualizar o estado dos disjuntores com base nas entidades
  updateBreakerStates() {
    if (!this._hass) return;

    // Atualizar disjuntores principais
    const mainBreakerElements = this.shadowRoot.querySelectorAll('.main-breaker');
    
    this.mainBreakers.forEach((breaker, index) => {
      const breakerElement = mainBreakerElements[index];
      if (!breakerElement) return;
      
      this.updateBreakerState(breaker, breakerElement);
    });

    // Atualizar disjuntores secundários
    const breakerElements = this.shadowRoot.querySelectorAll('.breaker');
    
    this.breakers.forEach((breaker, index) => {
      const breakerElement = breakerElements[index];
      if (!breakerElement) return;
      
      this.updateBreakerState(breaker, breakerElement);
    });
  }

  // Determina a unidade de potência e formata o valor adequadamente
  formatPower(power, entity) {
    // Verifica se temos entidade e estado disponível
    if (!entity || !this._hass.states[entity]) {
      return "0W";
    }
    
    // Busca os atributos da entidade
    const attributes = this._hass.states[entity].attributes || {};
    
    // Determina a unidade pela unidade de medida fornecida
    let unit = attributes.unit_of_measurement || "W";
    unit = unit.toLowerCase(); // Normalizar para comparação
    
    if (unit === "kw" || unit === "kW") {
      // É kilowatt - mostrar com precisão adequada e mais compacto
      return power < 1 ? 
        power.toFixed(3) + "kW" : 
        power.toFixed(2) + "kW";
    } else if (unit === "w" || unit === "W") {
      // É watt - arredondar sem casas decimais
      return power.toFixed(0) + "W";
    } else {
      // Caso não identifique a unidade ou seja outra qualquer
      // Tenta inferir pela magnitude do valor e formata compactamente
      if (power > 1000) {
        // Valor alto provavelmente em watts
        return power.toFixed(0) + "W";
      } else if (power > 0.1) {
        // Valores médios com 2 casas
        return power.toFixed(2) + "kW";
      } else {
        // Valores pequenos com 3 casas
        return power.toFixed(3) + "kW";
      }
    }
  }

  // Verifica se uma entidade está indisponível
  isEntityUnavailable(entityId) {
    if (!entityId || !this._hass.states[entityId]) {
      return true;
    }
    
    const state = this._hass.states[entityId].state;
    return state === 'unavailable' || state === 'unknown';
  }

  // Atualiza o estado de um disjuntor específico
  updateBreakerState(breaker, element) {
    // Verifica se o disjuntor deve ser marcado como indisponível
    // Apenas se tiver um switch configurado e não for empty ou apenas DPS
    if (breaker.switch && !breaker.empty && !(breaker.dps && !breaker.switch)) {
      const switchUnavailable = this.isEntityUnavailable(breaker.switch);
      
      // Adiciona a classe de indisponível se necessário
      element.classList.toggle('unavailable', switchUnavailable);
      
      // Se o switch estiver indisponível, mostra mensagem de erro
      const errorMsg = element.querySelector('.unavailable-message');
      if (errorMsg) {
        errorMsg.style.display = switchUnavailable ? 'block' : 'none';
      }

      // Mostrar/ocultar botão de reconexão baseado na disponibilidade
      const reconnectBtn = element.querySelector('.reconnect-btn');
      if (reconnectBtn && breaker.mac) {
        reconnectBtn.style.display = switchUnavailable ? 'flex' : 'none';
      }
    }

    // Verificar switch (disjuntor ligado/desligado)
    let isOn = true;
    if (breaker.switch && this._hass.states[breaker.switch]) {
      isOn = this._hass.states[breaker.switch].state === 'on';
      
      // Atualizar classe do elemento
      element.classList.toggle('on', isOn);
      element.classList.toggle('off', !isOn);
      
      // Atualizar alavanca do disjuntor
      const handleClass = element.classList.contains('main-breaker') ? '.main-breaker-handle' : '.breaker-handle';
      const handle = element.querySelector(handleClass);
      if (handle) {
        handle.classList.toggle('on', isOn);
        handle.classList.toggle('off', !isOn);
      }
    }
    
    // Atualizar corrente
    let current = 0;
    if (breaker.current_entity && this._hass.states[breaker.current_entity]) {
      current = parseFloat(this._hass.states[breaker.current_entity].state) || 0;
      const currentElement = element.querySelector('.current-value');
      if (currentElement) {
        currentElement.textContent = current.toFixed(1) + 'A';
        
        // Definir a cor do texto baseado no valor da corrente
        if (breaker.max_current) {
          const currentPercentage = (current / breaker.max_current) * 100;
          
          if (currentPercentage > 90) {
            currentElement.style.color = 'var(--error-color, #db4437)';
          } else if (currentPercentage > 75) {
            currentElement.style.color = 'var(--warning-color, #ffa600)';
          } else {
            currentElement.style.color = 'var(--success-color, #43a047)';
          }
        }
      }
    }
    
    // Atualizar voltagem
    let voltage = 0;
    if (breaker.voltage_entity && this._hass.states[breaker.voltage_entity]) {
      voltage = parseFloat(this._hass.states[breaker.voltage_entity].state) || 0;
      const voltageElement = element.querySelector('.voltage-value');
      if (voltageElement) {
        voltageElement.textContent = voltage.toFixed(0) + 'V';
      }
    }
    
    // Atualizar potência
    let power = 0;
    if (breaker.power_entity && this._hass.states[breaker.power_entity]) {
      power = parseFloat(this._hass.states[breaker.power_entity].state) || 0;
      const powerElement = element.querySelector('.power-value');
      if (powerElement) {
        // Usar a função de formatação automática de potência
        powerElement.textContent = this.formatPower(power, breaker.power_entity);
      }
    }
    
    // Atualizar o indicador de carga
    if (breaker.max_current && current > 0) {
      const loadPercentage = Math.min(100, (current / breaker.max_current) * 100);
      const loadBar = element.querySelector('.load-bar-fill');
      const loadText = element.querySelector('.load-text');
      
      if (loadBar) {
        loadBar.style.width = `${loadPercentage}%`;
        
        // Atualizar cor baseado na porcentagem de carga
        if (loadPercentage > 90) {
          loadBar.style.backgroundColor = 'var(--error-color, #db4437)';
        } else if (loadPercentage > 75) {
          loadBar.style.backgroundColor = 'var(--warning-color, #ffa600)';
        } else {
          loadBar.style.backgroundColor = 'var(--success-color, #43a047)';
        }
      }
      
      if (loadText) {
        loadText.textContent = `${Math.round(loadPercentage)}%`;
      }
    }
    
    // Atualizar o estilo baseado no estado
    if (!isOn && !element.classList.contains('unavailable')) {
      // Deixar textos em cinza se desligado
      const textElements = element.querySelectorAll('.info-value');
      textElements.forEach(el => {
        el.style.color = 'var(--disabled-text-color, #9e9e9e)';
      });
      
      // Zerar a barra de carga
      const loadBar = element.querySelector('.load-bar-fill');
      if (loadBar) {
        loadBar.style.width = '0%';
      }
      
      const loadText = element.querySelector('.load-text');
      if (loadText) {
        loadText.textContent = '0%';
        loadText.style.color = 'var(--disabled-text-color, #9e9e9e)';
      }
    }
  }

  // Método para manipular clique em disjuntores
  _toggleBreaker(entityId) {
    if (!this._hass || !entityId) return;
    
    // Verifica se a entidade está disponível antes de tentar alterar seu estado
    if (this.isEntityUnavailable(entityId)) {
      return;
    }

    const state = this._hass.states[entityId].state;
    const service = state === 'on' ? 'turn_off' : 'turn_on';
    
    this._hass.callService('switch', service, {
      entity_id: entityId
    });
  }

  // Método para reconectar cliente
  _reconnectClient(mac) {
    if (!this._hass || !mac) return;
    
    this._hass.callService('tplink_omada', 'reconnect_client', {
      mac: mac
    });
  }

  // Método para renderizar o card
  render() {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <div class="name">${this.title}</div>
        </div>
        <div class="card-content">
          ${this.renderMainBreakers()}
          <div class="breaker-panel breaker-panel-${this.columns}-columns">
            ${this.renderBreakers()}
          </div>
        </div>
      </ha-card>
      <style>
        :host {
          --breaker-background: var(--card-background-color, #fff);
          --breaker-border: var(--divider-color, #e0e0e0);
          --handle-on-color: var(--success-color, #43a047);
          --handle-off-color: var(--error-color, #db4437);
          --main-breaker-bg: var(--secondary-background-color, #f5f5f5);
          --info-panel-bg: var(--secondary-background-color, #f5f5f5);
          --info-panel-border: var(--divider-color, #e0e0e0);
          --load-bar-bg: var(--disabled-color, #bdbdbd);
          --primary-text: var(--primary-text-color, #212121);
          --secondary-text: var(--secondary-text-color, #727272);
          --empty-breaker-bg: rgba(0, 0, 0, 0.05);
          --dps-color: #ff9800;
          --dps-background: rgba(255, 152, 0, 0.1);
          --dps-border: rgba(255, 152, 0, 0.3);
          --unavailable-color: rgba(219, 68, 55, 0.1);
          --unavailable-border: rgba(219, 68, 55, 0.5);
        }
        
        .card-header {
          padding: 8px 16px;
          font-weight: 500;
          font-size: 18px;
          background-color: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border-radius: var(--ha-card-border-radius, 4px) var(--ha-card-border-radius, 4px) 0 0;
        }
        
        .card-content {
          padding: 16px;
        }
        
        /* Estilo para disjuntores principais */
        .main-breakers-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 16px;
        }
        
        .main-breaker {
          flex: 1;
          position: relative;
          border: 1px solid var(--breaker-border);
          border-radius: 8px;
          padding: 12px;
          background-color: var(--main-breaker-bg);
          box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
          transition: all 0.3s ease-in-out;
          overflow: hidden;
        }
        
        .main-breaker.primary {
          background-color: rgba(33, 150, 243, 0.1);
          border-color: rgba(33, 150, 243, 0.3);
        }
        
        .main-breaker-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .main-breaker-handle-container {
          width: 40px;
          height: 60px;
          background-color: #ddd;
          border-radius: 4px;
          position: relative;
          flex-shrink: 0;
          margin-right: 16px;
        }
        
        .main-breaker-handle {
          position: absolute;
          width: 30px;
          height: 28px;
          left: 5px;
          border-radius: 2px;
          transition: top 0.3s ease-in-out, background-color 0.3s ease-in-out;
        }
        
        .main-breaker-handle.on {
          top: 5px;
          background-color: var(--handle-on-color);
        }
        
        .main-breaker-handle.off {
          top: 27px;
          background-color: var(--handle-off-color);
        }
        
        .main-breaker-title-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0; /* Permite quebra de texto */
        }
        
        .main-breaker-title {
          font-size: 16px;
          font-weight: 500;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          word-break: break-word;
        }
        
        .main-breaker-content {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-gap: 8px;
        }
        
        /* Estilo para disjuntores regulares */
        .breaker-panel {
          display: grid;
          grid-gap: 16px;
        }
        
        .breaker-panel-2-columns {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .breaker {
          background-color: var(--breaker-background);
          border: 1px solid var(--breaker-border);
          border-radius: 6px;
          padding: 12px;
          position: relative;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          overflow: hidden;
        }
        
        /* Estilo para disjuntores duplos (ocupa duas linhas) */
        .breaker.double {
          grid-row: span 2;
          height: auto;
        }
        
        .breaker.off {
          opacity: 0.85;
        }
        
        /* Estilo para DPS */
        .breaker.dps, .main-breaker.dps {
          background-color: var(--dps-background);
          border: 1px solid var(--dps-border);
        }
        
        /* Estilo para disjuntores indisponíveis */
        .breaker.unavailable, .main-breaker.unavailable {
          background-color: var(--error-color, #db4437);
          border: 1px solid var(--error-color, #db4437);
          opacity: 0.8;
        }
        
        .unavailable-message {
          color: white;
          font-size: 11px;
          margin-top: 4px;
          display: none;
        }
        
        .reconnect-btn {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
          padding: 8px 12px;
          background-color: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          color: white;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        
        .reconnect-btn:hover {
          background-color: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.6);
        }
        
        .reconnect-btn:active {
          transform: scale(0.95);
        }
        
        .reconnect-icon {
          width: 14px;
          height: 14px;
          fill: white;
        }
        
        .dps-badge {
          font-size: 10px;
          background-color: var(--dps-color);
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          margin-right: 8px;
        }
        
        .breaker-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .breaker-handle-container {
          width: 30px;
          height: 50px;
          background-color: #ddd;
          border-radius: 4px;
          position: relative;
          flex-shrink: 0;
          margin-right: 12px;
        }
        
        .breaker-handle {
          position: absolute;
          width: 22px;
          height: 24px;
          left: 4px;
          border-radius: 2px;
          transition: top 0.3s ease-in-out, background-color 0.3s ease-in-out;
        }
        
        .breaker-handle.on {
          top: 4px;
          background-color: var(--handle-on-color);
        }
        
        .breaker-handle.off {
          top: 22px;
          background-color: var(--handle-off-color);
        }
        
        .breaker-title-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0; /* Permite quebra de texto */
        }
        
        .breaker-title {
          font-weight: 500;
          color: var(--primary-text);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          word-break: break-word;
        }
        
        .unavailable .breaker-title,
        .unavailable .info-value,
        .unavailable .info-label,
        .unavailable .load-text {
          color: white !important;
        }
        
        .info-panel {
          background-color: var(--info-panel-bg);
          border: 1px solid var(--info-panel-border);
          border-radius: 4px;
          padding: 8px;
          margin-top: 8px;
        }
        
        .unavailable .info-panel {
          background-color: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .breaker-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-gap: 8px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          font-size: 12px;
        }
        
        .info-label {
          color: var(--secondary-text);
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text);
        }
        
        .load-container {
          margin-top: 12px;
          display: flex;
          align-items: center;
        }
        
        .load-bar {
          flex: 1;
          height: 6px;
          background-color: var(--load-bar-bg);
          border-radius: 3px;
          overflow: hidden;
          margin-right: 8px;
        }
        
        .unavailable .load-bar {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .load-bar-fill {
          height: 100%;
          width: 0%;
          background-color: var(--success-color, #43a047);
          transition: width 0.3s ease-in-out, background-color 0.3s ease-in-out;
        }
        
        .unavailable .load-bar-fill {
          background-color: white;
        }
        
        .load-text {
          min-width: 40px;
          text-align: right;
          font-size: 12px;
          font-weight: 500;
        }
        
        .empty-breaker {
          background-color: var(--empty-breaker-bg);
          color: var(--disabled-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--divider-color, #e0e0e0);
        }
        
        .clickable {
          cursor: pointer;
        }
        
        /* Estilos responsivos para telas pequenas */
        @media screen and (max-width: 600px) {
          .main-breakers-container {
            flex-direction: column;
          }
          
          .main-breaker {
            margin-bottom: 16px;
            padding: 10px;
          }
          
          .main-breaker-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto;
          }
          
          .main-breaker-content .info-item:nth-child(3) {
            grid-column: span 2;
          }
          
          .breaker-panel-2-columns {
            grid-template-columns: 1fr;
          }
          
          .info-value {
            font-size: 12px;
          }
          
          .info-label {
            font-size: 10px;
          }
          
          .card-content {
            padding: 8px;
          }
          
          .breaker-info {
            grid-template-columns: 1fr 1fr;
          }
          
          .breaker-info .info-item:nth-child(3) {
            grid-column: span 2;
          }
        }
        
        /* Para telas extremamente pequenas */
        @media screen and (max-width: 350px) {
          .main-breaker-content,
          .breaker-info {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
          }
          
          .main-breaker-content .info-item:nth-child(3),
          .breaker-info .info-item:nth-child(3) {
            grid-column: 1;
          }
          
          .breaker-handle-container {
            width: 24px;
            height: 40px;
          }
          
          .breaker-handle {
            width: 18px;
            height: 18px;
          }
          
          .breaker-handle.on {
            top: 3px;
          }
          
          .breaker-handle.off {
            top: 19px;
          }
          
          .main-breaker-handle-container {
            width: 32px;
            height: 50px;
          }
          
          .main-breaker-handle {
            width: 24px;
            height: 23px;
          }
          
          .main-breaker-handle.on {
            top: 4px;
          }
          
          .main-breaker-handle.off {
            top: 23px;
          }
          
          .card-header {
            padding: 6px 10px;
            font-size: 16px;
          }
          
          .breaker {
            padding: 8px;
          }
          
          .info-panel {
            padding: 6px;
          }
          
          .info-value {
            font-size: 11px;
          }
          
          .info-label {
            font-size: 9px;
            margin-bottom: 2px;
          }
        }
      </style>
    `;

    // Adicionar event listeners para os clicks
    this.addBreakerClickListeners();
  }

  // Adicionar event listeners para os disjuntores
  addBreakerClickListeners() {
    // Para disjuntores principais
    const mainBreakers = this.shadowRoot.querySelectorAll('.main-breaker.clickable');
    mainBreakers.forEach(breaker => {
      breaker.addEventListener('click', (e) => {
        // Não acionar toggle se clicou no botão de reconexão
        if (e.target.closest('.reconnect-btn')) {
          return;
        }
        
        const entityId = breaker.getAttribute('data-entity-id');
        if (entityId) {
          this._toggleBreaker(entityId);
        }
      });
    });

    // Para disjuntores normais
    const normalBreakers = this.shadowRoot.querySelectorAll('.breaker.clickable');
    normalBreakers.forEach(breaker => {
      breaker.addEventListener('click', (e) => {
        // Não acionar toggle se clicou no botão de reconexão
        if (e.target.closest('.reconnect-btn')) {
          return;
        }
        
        const entityId = breaker.getAttribute('data-entity-id');
        if (entityId) {
          this._toggleBreaker(entityId);
        }
      });
    });

    // Para botões de reconexão
    const reconnectButtons = this.shadowRoot.querySelectorAll('.reconnect-btn');
    reconnectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mac = btn.getAttribute('data-mac');
        if (mac) {
          this._reconnectClient(mac);
        }
      });
    });
  }

  // Método para renderizar os disjuntores principais
  renderMainBreakers() {
    if (!this.mainBreakers || this.mainBreakers.length === 0) {
      return '';
    }

    return `
      <div class="main-breakers-container">
        ${this.mainBreakers.map((breaker, index) => {
          const isPrimary = index < 2; // Destacar os dois primeiros (Fase A e B)
          
          // Se for um disjuntor vazio (apenas visual)
          if (breaker.empty) {
            return `
              <div class="main-breaker empty-breaker ${isPrimary ? 'primary' : ''}">
                <div class="main-breaker-title">${breaker.name || 'Sem conexão'}</div>
              </div>
            `;
          }

          // Verificar se é DPS
          const isDPS = breaker.dps === true;
          const dpsClass = isDPS ? 'dps' : '';
          
          // Configurar classes
          const breakerClass = isPrimary ? 'primary' : '';
          const clickable = breaker.switch ? 'clickable' : '';
          
          return `
            <div class="main-breaker ${breakerClass} ${dpsClass} ${clickable}" 
                id="main-breaker-${index}" 
                data-entity-id="${breaker.switch || ''}">
              <div class="main-breaker-header">
                <div class="main-breaker-handle-container">
                  <div class="main-breaker-handle"></div>
                </div>
                <div class="main-breaker-title-container">
                  <div class="main-breaker-title">
                    ${isDPS ? '<span class="dps-badge">DPS</span>' : ''}
                    ${breaker.name || `Fase ${index === 0 ? 'A' : 'B'}`}
                  </div>
                  <div class="unavailable-message">Dispositivo indisponível</div>
                </div>
              </div>
              ${breaker.mac ? `
                <div class="reconnect-btn" data-mac="${breaker.mac}">
                  <svg class="reconnect-icon" viewBox="0 0 24 24">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  Reconectar
                </div>
              ` : ''}
