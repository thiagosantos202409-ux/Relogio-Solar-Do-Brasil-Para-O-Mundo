# Implementação de Longitude Referência e Longitude Referência Local

## Visão Geral
Adicionar abaixo do cartão de "Lat Solar" os campos de **Longitude Referência** (relativa ao Meridiano de Greenwich / UTC+0 onde ocorre o meio-dia solar) e **Longitude Referência Local** (relativa ao meridiano central do fuso horário civil utilizado pelo local).

## Decisões de Engenharia
1. **Longitude Referência (Greenwich / UTC+0)**:
   - Derivada da hora UTC em que ocorre o meio-dia solar ou calculada a partir da longitude subsolar / equação do tempo. Quando o meio-dia solar no meridiano 0° acontece antes do meio-dia civil UTC (ou seja, Sol a Oeste de Greenwich), a referência fica em Oeste (W). Quando acontece depois, fica em Leste (E). Numericamente igual a `-subsolarLongitude` ajustada para o meridiano de referência.
2. **Longitude Referência Local**:
   - Baseada no meridiano central do fuso horário civil (`baseOffset` ou `timezoneOffset`), onde cada hora de fuso equivale a 15° de longitude (ex.: UTC-3 = -45°). Caso o meio-dia solar local ocorra antes ou depois do meio-dia do fuso, exibe o offset em graus com indicação W/E.
3. **Exibição**:
   - Formato numérico limpo em graus com sigla direcional W ou E, posicionado logo abaixo do cartão de Latitude Solar no painel de coordenadas.
