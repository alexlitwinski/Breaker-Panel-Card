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

  // Atualiza o estado de um disjuntor específico
  updateBreakerState(breaker, element) {
    // Verificar switch (disjuntor ligado/desligado)
    let isOn = true;
    if (breaker.switch && this._hass.states[breaker.switch]) {
      isOn = this._hass.states[breaker.switch].state === 'on';
      
      // Atualizar classe do elemento
      element.classList.toggle('on', isOn);
      element.classList.toggle('off', !isOn);
      
      // Atualizar alavanca do disjuntor
      const handle = element.querySelector('.breaker-handle');
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
        powerElement.textContent = power.toFixed(0) + 'W';
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
    if (!isOn) {
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
          padding: 16px;
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
          align-items: center;
          margin-bottom: 12px;
        }
        
        .main-breaker-handle-container {
          width: 40px;
          height: 60px;
          background-color: #ddd;
          border-radius: 4px;
          position: relative;
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
        
        .main-breaker-title {
          font-size: 16px;
          font-weight: 500;
        }
        
        .main-breaker-content {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-gap: 12px;
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
        
        .breaker.off {
          opacity: 0.85;
        }
        
        .breaker-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .breaker-handle-container {
          width: 30px;
          height: 50px;
          background-color: #ddd;
          border-radius: 4px;
          position: relative;
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
        
        .breaker-title {
          font-weight: 500;
          color: var(--primary-text);
        }
        
        .info-panel {
          background-color: var(--info-panel-bg);
          border: 1px solid var(--info-panel-border);
          border-radius: 4px;
          padding: 8px;
          margin-top: 8px;
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
        
        .load-bar-fill {
          height: 100%;
          width: 0%;
          background-color: var(--success-color, #43a047);
          transition: width 0.3s ease-in-out, background-color 0.3s ease-in-out;
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
      </style>
    `;
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

          const handleClass = breaker.switch ? '' : 'on';
          const breakerClass = isPrimary ? 'primary' : '';
          
          return `
            <div class="main-breaker ${handleClass} ${breakerClass}" id="main-breaker-${index}">
              <div class="main-breaker-header">
                <div class="main-breaker-handle-container">
                  <div class="main-breaker-handle ${handleClass}"></div>
                </div>
                <div class="main-breaker-title">${breaker.name || `Fase ${index === 0 ? 'A' : 'B'}`}</div>
              </div>
              <div class="info-panel">
                <div class="main-breaker-content">
                  ${breaker.current_entity ? `
                    <div class="info-item">
                      <span class="info-label">Corrente</span>
                      <span class="current-value info-value">0.0A</span>
                    </div>
                  ` : ''}
                  ${breaker.voltage_entity ? `
                    <div class="info-item">
                      <span class="info-label">Voltagem</span>
                      <span class="voltage-value info-value">0V</span>
                    </div>
                  ` : ''}
                  ${breaker.power_entity ? `
                    <div class="info-item">
                      <span class="info-label">Potência</span>
                      <span class="power-value info-value">0W</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              ${breaker.max_current ? `
                <div class="load-container">
                  <div class="load-bar">
                    <div class="load-bar-fill"></div>
                  </div>
                  <span class="load-text">0%</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Método para renderizar os disjuntores secundários
  renderBreakers() {
    return this.breakers.map((breaker, index) => {
      // Se for um disjuntor vazio (apenas visual)
      if (breaker.empty) {
        return `
          <div class="breaker empty-breaker">
            <div class="breaker-title">${breaker.name || 'Sem conexão'}</div>
          </div>
        `;
      }

      const handleClass = breaker.switch ? '' : 'on';
      const clickable = breaker.switch ? 'clickable' : '';
      
      return `
        <div class="breaker ${handleClass} ${clickable}" id="breaker-${index}" 
          ${breaker.switch ? `onClick="(function(el) { 
            const event = new Event('breaker-click');
            el.dataset.entityId = '${breaker.switch}';
            el.dispatchEvent(event);
          })(this);"` : ''}>
          <div class="breaker-header">
            <div class="breaker-handle-container">
              <div class="breaker-handle ${handleClass}"></div>
            </div>
            <div class="breaker-title">${breaker.name || `Disjuntor ${index + 1}`}</div>
          </div>
          <div class="info-panel">
            <div class="breaker-info">
              ${breaker.current_entity ? `
                <div class="info-item">
                  <span class="info-label">Corrente</span>
                  <span class="current-value info-value">0.0A</span>
                </div>
              ` : ''}
              ${breaker.voltage_entity ? `
                <div class="info-item">
                  <span class="info-label">Voltagem</span>
                  <span class="voltage-value info-value">0V</span>
                </div>
              ` : ''}
              ${breaker.power_entity ? `
                <div class="info-item">
                  <span class="info-label">Potência</span>
                  <span class="power-value info-value">0W</span>
                </div>
              ` : ''}
            </div>
          </div>
          ${breaker.max_current ? `
            <div class="load-container">
              <div class="load-bar">
                <div class="load-bar-fill"></div>
              </div>
              <span class="load-text">0%</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Manipulador de eventos para cliques nos disjuntores
  connectedCallback() {
    this.shadowRoot.addEventListener('breaker-click', (e) => {
      const entityId = e.target.dataset.entityId;
      if (entityId && this._hass) {
        const currentState = this._hass.states[entityId].state;
        const newState = currentState === 'on' ? 'off' : 'on';
        
        this._hass.callService('switch', 'turn_' + newState, {
          entity_id: entityId
        });
      }
    });
  }

  // Define o tamanho do card
  getCardSize() {
    const mainBreakersSize = this.mainBreakers.length > 0 ? 2 : 0;
    const regularBreakersSize = Math.ceil(this.breakers.length / this.columns);
    
    return mainBreakersSize + regularBreakersSize + 1;
  }
}

// Registra o elemento no Custom Elements Registry
customElements.define('breaker-panel-card', BreakerPanelCard);

// Configura a janela para usar o card
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'breaker-panel-card',
  name: 'Quadro de Distribuição',
  description: 'Card que simula um quadro de distribuição de energia com monitoramento de disjuntores.'
});
