<div align="center">

# 🎤 VoiceFlow Prompter

### O teleprompter que **escuta você** — grave vídeos com roteiro direto no navegador.

Cole seu roteiro, fale, e o texto rola **no ritmo da sua voz**. Sem app, sem conta, sem instalação.

[![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-5b21b6?style=flat-square&logo=pwa)](#-instalar-como-app-pwa)
[![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-zero_depend%C3%AAncias-f7df1e?style=flat-square&logo=javascript&logoColor=black)](#-stack--decis%C3%B5es-t%C3%A9cnicas)
[![No Build](https://img.shields.io/badge/build_step-nenhum-22c55e?style=flat-square)](#-rodando-localmente)
[![License: MIT](https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square)](#-licen%C3%A7a)
[![Made for Mobile](https://img.shields.io/badge/foco-criadores_mobile-00e5ff?style=flat-square)](#-compatibilidade)

</div>

---

## ✨ O que é

**VoiceFlow Prompter** é um teleprompter de gravação que roda 100% no navegador. A grande sacada: em vez de rolar o texto numa velocidade fixa que você precisa acompanhar, **ele acompanha você** — usando reconhecimento de voz para detectar onde você está no roteiro e rolar exatamente nesse ponto.

É pensado para **criadores de conteúdo, freelancers e pequenos negócios** que gravam vídeos curtos para redes sociais e querem falar com mais segurança, sem decorar o roteiro nem pagar por um app nativo.

> **Fluxo:** cole o roteiro → libere câmera e microfone → grave → o texto rola com a sua fala → baixe o vídeo para editar no CapCut, Instagram, DaVinci, etc.

---

## 🎬 Demo

> _Adicione aqui um GIF da tela em ação (`docs/demo.gif`). Dica: grave a tela do celular lendo um roteiro e mostre o texto rolando junto com a fala._

```
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  📝 EDITOR                    │    │  🎥 PROMPTER + CÂMERA          │
│  ────────────────            │    │  ────────────────             │
│  Cole seu roteiro...          │ →  │  [ vídeo da câmera ao fundo ]  │
│  🎚️ Fonte · Cor · Idioma      │    │  Olá! Seja bem-vindo ao... ◀── │
│  ▶ Iniciar Teleprompter       │    │  ● REC 00:12   🎙️ Escutando... │
└──────────────────────────────┘    └──────────────────────────────┘
```

---

## 🚀 Funcionalidades

- 🎙️ **Scroll por voz** — usa a Web Speech API para seguir sua fala em tempo real
- 🧠 **Algoritmo tolerante a erros** — janela deslizante que retoma o match mesmo se você gaguejar, pular ou repetir uma palavra
- 🎥 **Gravação no navegador** — câmera + microfone via `getUserMedia` e `MediaRecorder`, **vídeo limpo** (o texto fica só na tela, não é queimado no vídeo)
- ⬇️ **Download imediato** — preview do clipe e download em `.mp4` ou `.webm` (escolhe o melhor formato suportado)
- 🪟 **Overlay translúcido** — texto legível sobre a câmera ao vivo, com contraste garantido
- 🎚️ **Modo manual de backup** — auto-scroll por velocidade caso o reconhecimento não esteja disponível
- 🌗 **Tema claro/escuro**, ajuste de fonte, cor (verde neon, âmbar, ciano, branco) e idioma (PT-BR, EN, ES)
- 📲 **PWA instalável** — adicione à tela inicial e use offline
- 🛡️ **Degradação graciosa** — sem câmera ou microfone? O teleprompter continua funcionando em modo texto puro

---

## 🧩 Stack & decisões técnicas

Este projeto é deliberadamente **vanilla**: HTML, CSS e JavaScript puros, **zero dependências** e **zero etapa de build**. Tudo são arquivos estáticos servíveis por qualquer host.

| Área | Como foi resolvido |
|------|--------------------|
| **Reconhecimento de voz** | `webkitSpeechRecognition` (Web Speech API) com `continuous` + `interimResults` e auto-restart |
| **Alinhamento fala↔texto** | Tokenização normalizada (sem acentos/pontuação) + busca por _âncoras_ numa **janela deslizante**, com limite de avanço por resultado para nunca "pular parágrafos" |
| **Rolagem suave** | Loop de física próprio com `requestAnimationFrame` e interpolação (LERP) para colar a palavra ativa na linha-guia |
| **Câmera & gravação** | `getUserMedia({ video: facingMode:'user', audio:true })` + `MediaRecorder` gravando o stream direto |
| **Formato de vídeo** | Seleção automática via `MediaRecorder.isTypeSupported` (prefere `mp4`, cai para `webm`/VP9/VP8) |
| **PWA** | `manifest.webmanifest` + Service Worker com estratégia _cache-first_ do app shell |
| **Resiliência** | Tratamento de permissão negada, ausência de câmera e navegador sem suporte — sempre com _fallback_ |

> 💡 **Por que vanilla?** Para mostrar domínio das APIs nativas do navegador (mídia, fala, service workers) sem esconder a engenharia atrás de um framework — e para que o app carregue instantaneamente em qualquer celular.

---

## 📲 Instalar como app (PWA)

1. Abra a URL no **Chrome (Android)** ou **Safari (iOS)**.
2. **Android:** menu ⋮ → _Instalar app_ / _Adicionar à tela inicial_.
3. **iOS:** botão _Compartilhar_ → _Adicionar à Tela de Início_.
4. Pronto — abre em tela cheia, como um app nativo, e funciona offline.

---

## 🛠️ Rodando localmente

> ⚠️ Câmera, microfone e gravação só funcionam em **contexto seguro**: `https://` ou `localhost`.

```bash
# clone o repositório
git clone https://github.com/<seu-usuario>/FalaPrompter.git
cd FalaPrompter

# sirva os arquivos estáticos (qualquer servidor serve)
npm run dev          # http-server na porta 3000
# ou: npx http-server -p 3000
# ou: python -m http.server 3000
```

Acesse `http://localhost:3000`. Não há nada para compilar. 🎉

**Testando no celular:** como o celular não é `localhost`, você precisa de HTTPS. Use [ngrok](https://ngrok.com) (`ngrok http 3000`) ou publique em **GitHub Pages / Netlify / Vercel** (todos servem HTTPS de graça).

---

## 📱 Compatibilidade

| Plataforma | Status | Observações |
|------------|--------|-------------|
| **Chrome / Edge (Android)** | ✅ Recomendado | Suporte completo: câmera, voz, `MediaRecorder`, download `.webm`, PWA |
| **Chrome / Edge (Desktop)** | ✅ | Ótimo para testar e gravar pela webcam |
| **Safari (iOS 14.5+)** | ⚠️ Parcial | `MediaRecorder` e formato final variam por versão — **valide no aparelho real** |
| **Firefox** | ⚠️ | Reconhecimento de voz indisponível → usa o modo auto-scroll manual |

> A promessa é honesta: **funciona melhor no Chrome Android; o suporte a iOS precisa ser validado em iPhone real.**

---

## 🗺️ Roadmap

- [ ] Alternar câmera frontal/traseira
- [ ] Espelhamento do texto (para setups de teleprompter físico)
- [ ] Conversão garantida para `.mp4` quando possível
- [ ] Ajuste fino por **palavras por minuto (WPM)**
- [ ] Contagem regressiva antes de gravar
- [ ] Salvamento local de roteiros + templates
- [ ] Modo paisagem/retrato

Veja o [PRD completo](PRD.md) para a visão de produto.

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! Abra uma _issue_ para discutir ideias ou mande um _pull request_. Por ser vanilla e sem build, basta editar os arquivos e recarregar a página.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Sinta-se livre para usar, modificar e aprender com o código.

---

<div align="center">

Se este projeto te ajudou ou te inspirou, **deixe uma ⭐ no repositório** — ajuda muito! 🙏

Feito com 🎙️ e JavaScript puro.

</div>
