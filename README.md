# Breaker Panel Card

[![HACS Default][hacs-shield]][hacs]
[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)

Um card personalizado para o Home Assistant que simula um quadro de distribuição de energia com monitoramento de disjuntores.

![Screenshot do Breaker Panel Card](images/screenshot.png)

## Características

- Visualização de disjuntores em formato de quadro de distribuição com duas colunas
- Monitoramento de estado do switch (ligado/desligado)
- Exibição de valores de corrente (A), voltagem (V) e potência (W)
- Barra visual de carga atual em relação à carga máxima configurada
- Suporte para disjuntores sem entidades (apenas visual)
- Personalização de cores e títulos

## Instalação

### HACS (recomendado)

1. Certifique-se de ter o [HACS](https://hacs.xyz/) instalado
2. Vá para HACS > Frontend
3. Clique no botão + no canto inferior direito
4. Pesquise por "Breaker Panel Card"
5. Clique em "Instalar"
6. Reinicie o Home Assistant

### Instalação Manual

1. Baixe o arquivo `breaker-panel-card.js` da [última release](https://github.com/SEU_USUARIO/breaker-panel-card/releases/latest)
2. Faça upload para `/www/` na sua instalação do Home Assistant
3. Adicione a referência do recurso em sua configuração do Lovelace:
   ```yaml
   resources:
     - url: /local/breaker-panel-card.js
       type: module
   ```
4. Reinicie o Home Assistant

## Uso

Adicione à sua dashboard do Lovelace:

```yaml
type: 'custom:breaker-panel-card'
title: 'Quadro de Distribuição Principal'
columns: 2
breakers:
  - name: 'Ar-condicionado'
    switch: switch.ar_condicionado
    current_entity: sensor.ar_condicionado_corrente
    voltage_entity: sensor.ar_condicionado_voltagem
    power_entity: sensor.ar_condicionado_potencia
    max_current: 15
  
  - name: 'Chuveiro'
    switch: switch.chuveiro
    current_entity: sensor.chuveiro_corrente
    power_entity: sensor.chuveiro_potencia
    max_current: 25
  
  # Disjuntor vazio (apenas visual)
  - name: 'Reserva'
    empty: true
```

## Opções de Configuração

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `title` | string | `'Quadro de Distribuição'` | Título do card |
| `columns` | number | `2` | Número de colunas (1 ou 2) |
| `breakers` | array | Obrigatório | Lista de disjuntores |

### Opções de cada disjuntor

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `name` | string | `'Disjuntor X'` | Nome do disjuntor |
| `switch` | string | opcional | Entidade de switch para o estado do disjuntor |
| `current_entity` | string | opcional | Entidade de sensor para corrente (em A) |
| `voltage_entity` | string | opcional | Entidade de sensor para voltagem (em V) |
| `power_entity` | string | opcional | Entidade de sensor para potência (em W) |
| `max_current` | number | opcional | Corrente máxima do disjuntor (em A) |
| `empty` | boolean | `false` | Define se é um disjuntor vazio (apenas visual) |

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

[hacs-shield]: https://img.shields.io/badge/HACS-Default-orange.svg
[hacs]: https://github.com/hacs/integration
[releases-shield]: https://img.shields.io/github/release/SEU_USUARIO/breaker-panel-card.svg
[releases]: https://github.com/SEU_USUARIO/breaker-panel-card/releases
[license-shield]: https://img.shields.io/github/license/SEU_USUARIO/breaker-panel-card.svg
