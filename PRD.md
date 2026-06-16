# PRD — VoiceFlow Prompter PWA

## Visão geral

O **VoiceFlow Prompter** será um PWA de teleprompter com gravação de vídeo direto no navegador. A ideia é permitir que o usuário cole um roteiro, grave usando câmera e microfone do celular, acompanhe o texto em overlay ou ao lado da câmera e, ao final, baixe o vídeo para editar em ferramentas como CapCut, Instagram, DaVinci Resolve ou similares.

O posicionamento inicial pode ser: **teleprompter de gravação no navegador, sem conta, focado em criadores mobile**.

## Objetivo do produto

Criar uma experiência simples para gravar vídeos com roteiro sem depender de aplicativo nativo, login ou configuração complexa.

Fluxo esperado:

1. Usuário instala ou abre o PWA.
2. Cola o roteiro.
3. Permite acesso à câmera e ao microfone.
4. Testa o teleprompter.
5. Inicia a gravação.
6. O texto aparece em overlay translúcido ou ao lado do vídeo.
7. O scroll acompanha a fala ou funciona por velocidade manual.
8. Ao final, o usuário baixa o vídeo gravado em `.webm` ou `.mp4`.

## Público-alvo

Criadores de conteúdo, freelancers, pequenos negócios e profissionais que gravam vídeos curtos para redes sociais e querem falar com mais segurança sem decorar roteiro.

## Produto mínimo viável

O MVP deve ter:

- Campo para colar roteiro.
- Botão “testar teleprompter”.
- Botão “gravar”.
- Uso da câmera frontal por padrão.
- Permissão de câmera e microfone via navegador.
- Texto em overlay translúcido sobre a câmera.
- Scroll por voz, quando disponível.
- Fallback manual de velocidade caso o reconhecimento de voz falhe.
- Download do vídeo ao final da gravação.
- Aviso de compatibilidade: “funciona melhor no Chrome Android; no iPhone use Safari atualizado”.

## Funcionalidades principais

### 1. Editor de roteiro

O usuário deve conseguir colar ou digitar um roteiro antes da gravação.

Requisitos:

- Área de texto grande.
- Preservar quebras de linha.
- Permitir limpar roteiro.
- Permitir iniciar teste sem gravar.

### 2. Teleprompter

O roteiro deve ser exibido de forma legível durante a gravação.

Requisitos:

- Overlay translúcido sobre a câmera ou painel lateral.
- Texto grande, com contraste adequado.
- Controle de velocidade manual.
- Botão de pausar/continuar scroll.
- Ajuste simples de tamanho da fonte.

### 3. Scroll por voz

O app pode usar reconhecimento de voz para acompanhar a fala do usuário e avançar o roteiro.

Requisitos:

- Usar Web Speech API quando disponível.
- Manter fallback manual quando a API não estiver disponível.
- Evitar travar a gravação caso o reconhecimento falhe.
- Exibir aviso simples quando o recurso não for suportado.

Observação técnica: o microfone será usado tanto para gravação quanto para reconhecimento de voz. Isso é possível em muitos cenários, mas precisa ser testado em aparelho real.

### 4. Gravação de vídeo

O usuário deve gravar vídeo com câmera e microfone dentro do navegador.

Requisitos:

- Usar `getUserMedia` para câmera e microfone.
- Usar `MediaRecorder` para gravação.
- Usar câmera frontal por padrão.
- Permitir alternar câmera frontal/traseira em versão futura.
- Gerar arquivo para download ao final.

### 5. Download do vídeo

Ao finalizar a gravação, o app deve disponibilizar o arquivo para download.

Requisitos:

- Android/Chrome: provavelmente gerar `.webm`.
- iOS/Safari: pode gerar `.mp4`/H.264 em versões mais novas, mas com inconsistências.
- Exibir orientação quando o formato não for ideal para edição.
- Não prometer compatibilidade perfeita com todos os editores antes de testes reais.

## Compatibilidade esperada

### Android

Tende a funcionar bem no Chrome e Edge.

Recursos esperados:

- Câmera frontal/traseira.
- Microfone.
- `MediaRecorder`.
- Download de `.webm`.
- PWA instalado na tela inicial.

### iOS

Deve funcionar via Safari/PWA, mas com limitações.

Riscos:

- Comportamento diferente entre Safari normal e PWA instalado na tela inicial.
- Inconsistência no suporte do `MediaRecorder` dependendo da versão do iOS.
- Formato final pode variar.
- Necessidade de teste em iPhone real antes de prometer suporte completo.

## Principais riscos técnicos

1. **Formato do vídeo final**

   Android/Chrome normalmente grava `.webm`. iPhone e alguns editores podem não aceitar esse formato de forma ideal. Pode ser necessário orientar o usuário ou estudar conversão futura.

2. **PWA no iOS**

   O Safari instalado na tela inicial pode se comportar diferente do Safari normal. Isso precisa ser validado em iPhone real.

3. **Sincronização entre voz, scroll e gravação**

   O app pode precisar usar microfone para speech recognition e gravação ao mesmo tempo. Em geral é possível, mas precisa de testes práticos.

4. **Performance no celular**

   Câmera + reconhecimento de voz + renderização de texto grande + gravação pode pesar em aparelhos fracos.

5. **Permissões do navegador**

   O app deve lidar bem com permissão negada, câmera indisponível ou microfone bloqueado.

## Critérios de aceite do MVP

O MVP será considerado funcional quando:

- O usuário conseguir colar um roteiro.
- O app conseguir abrir câmera e microfone no Chrome Android.
- O teleprompter aparecer legível sobre a câmera.
- O usuário conseguir iniciar e parar uma gravação.
- O arquivo gravado puder ser baixado.
- O app continuar utilizável mesmo sem scroll por voz.
- Houver mensagem clara de compatibilidade para Android e iOS.

## Melhorias futuras

- Alternar câmera frontal/traseira.
- Espelhamento do texto para uso com setup de teleprompter físico.
- Exportação ou conversão para `.mp4` quando possível.
- Ajuste fino de velocidade por palavras por minuto.
- Modo paisagem/retrato.
- Salvamento local de roteiros.
- Templates de roteiro.
- Contador regressivo antes de gravar.
- Prévia do vídeo antes do download.
- Integração futura com upload direto para nuvem ou editor.

## Nota de posicionamento

Este projeto vale muito como open source e portfólio. O diferencial é resolver uma dor real de criadores mobile com uma solução simples, sem conta e sem depender de app instalado.

A promessa pública inicial deve ser cautelosa: **funciona melhor no Chrome Android; suporte a iOS precisa ser testado em iPhone real**.
