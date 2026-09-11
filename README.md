# Qualyhouse Control Alpha

Protótipo funcional/PWA para uso no iPhone e publicação no GitHub Pages.

## O que já funciona
- Painel inicial com métricas.
- Villa Park com mapa do térreo (01–08) e superior (09–16).
- Status por cores: Livre, Ocupado, Reserva e Manutenção.
- Ficha editável por apartamento.
- Registro e histórico de pagamentos.
- UC geral de energia e água do Villa Park.
- Girassol com 5 apartamentos, hidrômetro geral e UC de energia individual.
- Oca Urbana preparada para futura configuração.
- Locações avulsas.
- Backup e restauração em JSON.
- Instalação como PWA pelo Safari depois de publicada em HTTPS.

## Importante
Esta versão Alpha salva tudo no `localStorage` do navegador/aparelho. Não há login, banco de dados online, sincronização entre aparelhos nem backup automático em nuvem.

## Publicar no GitHub Pages
1. Crie/abra um repositório no GitHub.
2. Envie o conteúdo desta pasta para a raiz do repositório.
3. No GitHub, abra Settings > Pages.
4. Em "Build and deployment", escolha "Deploy from a branch".
5. Selecione a branch `main` e a pasta `/ (root)`.
6. Salve e aguarde o GitHub fornecer o endereço HTTPS.
7. Abra esse endereço no Safari do iPhone.
8. Use Compartilhar > Adicionar à Tela de Início.

## Arquivos
- `index.html`: aplicativo.
- `manifest.webmanifest`: configuração PWA.
- `sw.js`: cache/offline básico.
- `assets/`: plantas do Villa Park.
