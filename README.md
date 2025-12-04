# 🔐 ControlaAI - API de Validação de Licenças

API REST para validação de licenças do aplicativo ControlaAI.

## 🚀 Endpoints

### POST /api/activate
Ativa uma nova licença em um dispositivo.

**Body:**
```json
{
  "licenseKey": "uuid-da-licenca",
  "deviceId": "id-unico-do-dispositivo",
  "deviceInfo": {
    "model": "Samsung Galaxy S21",
    "platform": "Android 13"
  }
}
```

**Resposta Success (200):**
```json
{
  "valid": true,
  "message": "Licença ativada com sucesso!"
}
```

**Resposta Error (403):**
```json
{
  "valid": false,
  "message": "Esta chave já foi ativada em outro dispositivo."
}
```

---

### POST /api/verify
Verifica se uma licença é válida.

**Body:**
```json
{
  "licenseKey": "uuid-da-licenca",
  "deviceId": "id-unico-do-dispositivo"
}
```

**Resposta:**
```json
{
  "valid": true,
  "message": "Licença válida"
}
```

---

### POST /api/revoke
Revoga uma licença (Admin apenas).

**Body:**
```json
{
  "licenseKey": "uuid-da-licenca",
  "adminKey": "sua-chave-admin-secreta"
}
```

---

## 📦 Instalação Local

```bash
cd controlaai-api
npm install
```

Crie arquivo `.env`:
```
MONGODB_URI=sua-connection-string
ADMIN_KEY=sua-senha-admin
```

Execute local:
```bash
npm run dev
```

---

## 🌐 Deploy na Vercel

1. Instale Vercel CLI:
```bash
npm i -g vercel
```

2. Faça login:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Configure variáveis de ambiente na Vercel:
   - `MONGODB_URI`
   - `ADMIN_KEY`

---

## 🗄️ Estrutura do Banco (MongoDB)

**Database:** `controlaai`  
**Collection:** `licenses`

**Documento:**
```json
{
  "licenseKey": "uuid",
  "deviceId": "device-uuid",
  "deviceInfo": {},
  "activatedAt": "2025-12-03T...",
  "lastVerified": "2025-12-03T...",
  "status": "active"
}
```

---

## 🔒 Segurança

- CORS habilitado para qualquer origem
- Validação de formato UUID
- Verificação de dispositivo único
- Admin key para operações sensíveis

---

Desenvolvido para o ControlaAI 💰
