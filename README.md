# Email Reader CLI

Uma aplicação em Node.js com TypeScript que permite ler e-mails da caixa de entrada sem marcá-los como lidos.

## Funcionalidades

- Conecta-se a um servidor de e-mail via IMAP
- Lista os 10 e-mails não lidos mais recentes da caixa de entrada
- Permite selecionar e-mails usando setas do teclado no terminal
- Exibe o conteúdo completo do e-mail selecionado, formatado para fácil leitura
- Suporta emails em HTML e texto simples
- Converte elementos HTML como links, listas e tabelas para visualização no terminal
- Permite voltar à lista de emails após visualizar um e-mail
- Interface interativa para navegação entre emails
- Não marca e-mails como lidos durante o processo

## Requisitos

- Node.js (v14 ou superior)
- NPM

## Instalação

1. Clone este repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com as seguintes informações:

```
EMAIL_HOST=imap.exemplo.com
EMAIL_PORT=993
EMAIL_USER=seu@email.com
EMAIL_PASS=sua_senha
```

Para Gmail, você precisará criar uma senha de aplicativo em https://myaccount.google.com/apppasswords

## Uso

Execute a aplicação:

```bash
npm start
```

Isso irá:
1. Conectar-se ao servidor de e-mail configurado
2. Listar os 10 e-mails não lidos mais recentes
3. Permitir selecionar um e-mail usando as setas do teclado
4. Obter e exibir o conteúdo completo do e-mail selecionado, formatado para fácil leitura no terminal
5. Permitir voltar à lista de e-mails ou sair da aplicação após visualizar um e-mail

## Desenvolvimento

Para executar em modo de desenvolvimento com recarga automática:

```bash
npm run dev
```

### Solução de problemas

Se você encontrar erros relacionados a tipagem durante a execução:

1. Verifique se você está usando a flag `--files` no comando ts-node:
   ```json
   "start": "ts-node --files -r tsconfig-paths/register src/index.ts"
   ```

2. Certifique-se de que o arquivo `tsconfig.json` inclui a configuração de `typeRoots`:
   ```json
   "typeRoots": ["./node_modules/@types", "./src/types"]
   ```

## Testes

Execute os testes unitários:

```bash
npm test
```

## Arquitetura

Este projeto segue os princípios SOLID e possui a seguinte estrutura:

- `src/application/useCases`: Casos de uso (regras de negócio)
- `src/domain/interfaces`: Contratos (interfaces)
- `src/infrastructure/imap`: Implementação concreta (imapflow)
- `src/presentation/cli`: Interface CLI (enquirer)
- `src/shared`: Configurações e contêiner de injeção de dependência