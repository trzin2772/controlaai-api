# 🚀 GUIA DE DEPLOY - API DO CONTROLAAI NA VERCEL

## ✅ PRÉ-REQUISITOS

- [x] API criada em `controlaai-api/`
- [x] MongoDB configurado
- [x] Conta no Vercel (gratuita)

---

## 📋 PASSO A PASSO

### **1. Criar Conta na Vercel**

1. Acesse: https://vercel.com/signup
2. Clique em **"Continue with GitHub"** (recomendado)
3. Autorize a Vercel a acessar seus repositórios

---

### **2. Fazer Deploy**

**OPÇÃO A - Via Interface Web (Mais Fácil):**

1. Acesse: https://vercel.com/new
2. Clique em **"Add New Project"**
3. Selecione **"Import Git Repository"** 
4. OU clique em **"Deploy from local folder"**
5. Arraste a pasta `controlaai-api` para a Vercel
6. Clique em **"Deploy"**

**OPÇÃO B - Via CLI:**

```powershell
# Instalar Vercel CLI
npm i -g vercel

# Ir para a pasta da API
cd controlaai-api

# Fazer login
vercel login

# Deploy
vercel --prod
```

---

### **3. Configurar Variáveis de Ambiente**

Após o deploy, configure as variáveis:

1. No painel da Vercel, clique no seu projeto
2. Vá em **Settings** → **Environment Variables**
3. Adicione:

| Nome | Valor |
|------|-------|
| `MONGODB_URI` | `mongodb+srv://trzin27_db_user:cZ8OZ9B5Ln2z4Is8@cluster-controlaai.hszcpx9.mongodb.net/?appName=Cluster-ControlaAi` |
| `ADMIN_KEY` | `controlaai-admin-2025-secret-key` |

4. Clique em **"Save"**
5. Clique em **"Redeploy"** para aplicar

---

### **4. Testar a API**

Você receberá uma URL tipo:
```
https://controlaai-api.vercel.app
```

**Teste no navegador ou Postman:**

```
POST https://controlaai-api.vercel.app/api/activate
Content-Type: application/json

{
  "licenseKey": "test-1234-5678-abcd-ef1234567890",
  "deviceId": "device-test-123"
}
```

**Resposta esperada:**
```json
{
  "valid": true,
  "message": "Licença ativada com sucesso!"
}
```

---

### **5. Anotar a URL**

Guarde a URL da API (ex: `https://controlaai-api.vercel.app`)

Você vai precisar dela para configurar o app Android!

---

## 🔧 PROBLEMAS COMUNS

**"Error: Cannot find module 'mongodb'"**
- Execute `npm install` na pasta `controlaai-api/`
- Faça deploy novamente

**"MongoServerError: Authentication failed"**
- Verifique se a senha no `MONGODB_URI` está correta
- Confira se o usuário `trzin27_db_user` existe no MongoDB

**"CORS error"**
- A API já tem CORS configurado
- Se persistir, adicione sua domain na lista de origens permitidas

---

## 📊 MONITORAMENTO

**Ver logs:**
```powershell
vercel logs [URL-DO-DEPLOY]
```

**Dashboard:**
https://vercel.com/dashboard

---

## 🎯 PRÓXIMO PASSO

Após o deploy, você precisa:

1. ✅ Anotar a URL da API
2. ✅ Modificar o `activation.js` do app Android
3. ✅ Gerar novo APK
4. ✅ Testar com 2 celulares

---

**Boa sorte! 🚀**
