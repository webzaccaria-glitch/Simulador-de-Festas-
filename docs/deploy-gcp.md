# Deploy no Google Cloud (SQLite persistente)

**Por que não Cloud Run:** o disco do Cloud Run é efêmero e montar Cloud Storage como volume não oferece o
travamento de arquivo de que o SQLite precisa. A opção compatível e de menor custo é **uma VM do Compute Engine
com disco persistente**, rodando o mesmo `Dockerfile` do repositório e o Caddy para HTTPS.

> Nada aqui foi executado. Os comandos criam recursos **somente quando o proprietário rodar**.
> Exigem conta de faturamento vinculada ao projeto (mesmo para itens do nível gratuito).
> Confira os preços atuais antes: VM, disco, IP externo e tráfego de saída podem gerar cobrança.

## 1. Pré-requisitos (feitos pelo proprietário no console)
- Projeto: `PROJECT_ID` (o seu projeto FestDecor3D).
- Faturamento vinculado ao projeto e, se quiser, um alerta de orçamento (Faturamento → Orçamentos e alertas).
- Um domínio ou subdomínio apontando para o IP da VM (ex.: `app.seudominio.com.br`). Sem domínio próprio,
  dá para testar com `IP.sslip.io` (ex.: `34-1-2-3.sslip.io`).

## 2. Criar a VM (Cloud Shell)
```bash
gcloud config set project PROJECT_ID
gcloud services enable compute.googleapis.com
# e2-micro com disco padrão de 30 GB: tamanhos do nível gratuito nas regiões us-west1, us-central1 e us-east1.
gcloud compute instances create festdecor \
  --zone=us-central1-a --machine-type=e2-micro \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=30GB --boot-disk-type=pd-standard \
  --tags=http-server,https-server
gcloud compute firewall-rules create festdecor-web --allow=tcp:80,tcp:443 --target-tags=http-server,https-server
gcloud compute instances describe festdecor --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```
Para o IP não mudar ao reiniciar, promova-o a estático (pode ter custo):
`gcloud compute addresses create festdecor-ip --region=us-central1 --addresses=IP_ATUAL`.

## 3. Instalar e subir o app (na VM: `gcloud compute ssh festdecor --zone=us-central1-a`)
```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
sudo git clone -b claude/zen-hawking-i6r0uv https://github.com/webzaccaria-glitch/Simulador-de-Festas-.git /opt/festdecor
sudo mkdir -p /srv/festdecor/data /srv/festdecor/caddy && sudo chown -R 1000:1000 /srv/festdecor/data
cd /opt/festdecor/deploy/gcp
sudo tee .env >/dev/null <<'ENV'
DOMAIN=app.seudominio.com.br
# GEMINI_API_KEY=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
ENV
sudo chmod 600 .env
sudo docker compose up -d --build
curl -s https://app.seudominio.com.br/api/health
```
O arquivo `.env` fica só na VM (não vai para o Git). O Caddy emite o certificado HTTPS sozinho.

## 4. Backup diário
```bash
sudo cp /opt/festdecor/deploy/gcp/backup.sh /usr/local/bin/festdecor-backup
echo '30 3 * * * root /usr/local/bin/festdecor-backup' | sudo tee /etc/cron.d/festdecor-backup
```
Opcional: snapshots agendados do disco (Compute Engine → Snapshots), com custo de armazenamento.

## 5. Atualizar
```bash
cd /opt/festdecor && sudo git pull && cd deploy/gcp && sudo docker compose up -d --build
```

## 6. Depois do deploy
- Login Google: em APIs e serviços → Credenciais, crie um ID do cliente OAuth (Web) com redirect
  `https://SEU_DOMINIO/auth/callback` e coloque ID/segredo no `.env` da VM.
- APK funcional: no GitHub, Settings → Secrets and variables → Actions → Variables, crie
  `CAP_SERVER_URL=https://SEU_DOMINIO` e rode o workflow "Android APK (debug)".
