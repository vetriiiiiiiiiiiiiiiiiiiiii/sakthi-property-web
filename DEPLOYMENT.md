# Deploy on your own Linux server (no Docker)

This guide deploys the React frontend and Express API on one Ubuntu server.
Nginx serves the frontend and proxies `/api` to the API, PostgreSQL stores
application data, systemd keeps the API running, and Certbot provides HTTPS.

## You need

- Ubuntu 22.04 or 24.04 server with a public IP and sudo access.
- A domain whose DNS `A` record points to the server. Point any `www` record
  you plan to use as well.
- TCP ports 22, 80, and 443 allowed by the server/cloud firewall. Do not expose
  PostgreSQL port 5432 publicly.
- Git access to this repository.

## 1. Install server packages

Install Node.js 22 LTS, PostgreSQL, Nginx, and Certbot using your Linux
distribution's supported package repositories. Confirm the installed tools:

```sh
node --version
npm --version
psql --version
nginx -v
command -v npm
```

Node.js must be version 22 or newer. Create a dedicated unprivileged service
account and application directories:

```sh
sudo useradd --system --create-home --home-dir /var/lib/sakthi-property \
  --shell /usr/sbin/nologin sakthi-property
sudo install -d -o sakthi-property -g sakthi-property -m 0750 /opt/sakthi-property-web
sudo install -d -o root -g sakthi-property -m 0750 /etc/sakthi-property
sudo install -d -o root -g www-data -m 0750 /var/www/sakthi-property
```

## 2. Create the production database

Create a dedicated PostgreSQL role and database:

```sh
sudo -u postgres psql
```

In the PostgreSQL prompt:

```sql
CREATE ROLE sakthi_app LOGIN;
\password sakthi_app
CREATE DATABASE sakthi_property OWNER sakthi_app;
\q
```

Generate a database password with `openssl rand -hex 32` and enter it at the
`\password` prompts. Hexadecimal keeps the password safe to use in the
PostgreSQL connection URL below.
Keep PostgreSQL bound to localhost or its private socket; do not open port 5432
to the internet.

## 3. Install the application

Clone the code into the application directory and install locked dependencies:

```sh
sudo git clone https://github.com/vetriiiiiiiiiiiiiiiiiiiiii/sakthi-property-web.git \
  /opt/sakthi-property-web
sudo chown -R sakthi-property:sakthi-property /opt/sakthi-property-web
sudo install -d -o sakthi-property -g sakthi-property -m 0750 \
  /opt/sakthi-property-web/server/logs
cd /opt/sakthi-property-web
sudo -u sakthi-property npm ci
sudo -u sakthi-property npm ci --include=dev --prefix server
```

The frontend calls the API at the same origin (`/api`), so no private API
secrets are embedded in the frontend build. If using Google sign-in, provide
the Google web client ID at build time:

```sh
sudo -u sakthi-property env VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  npm run build
```

Publish the generated static files to the directory readable by Nginx:

```sh
sudo rsync -a --delete --chown=root:www-data --chmod=D750,F640 \
  /opt/sakthi-property-web/dist/ /var/www/sakthi-property/
```

Add `https://YOUR_DOMAIN` as an authorized JavaScript origin for that OAuth
client in Google Cloud Console. Google sign-in is optional.

## 4. Configure server secrets

Create `/etc/sakthi-property/server.env` as root with mode `0640` and group
`sakthi-property`. Use URL-encoded credentials if the database password
contains characters with special meaning in a PostgreSQL URL.

```ini
DATABASE_URL=postgresql://sakthi_app:DB_PASSWORD@127.0.0.1:5432/sakthi_property?schema=public
AUTH_SECRET=REPLACE_WITH_A_RANDOM_SECRET
AUTH_SETUP_KEY=TEMPORARY_RANDOM_SETUP_KEY
CLIENT_ORIGINS=https://YOUR_DOMAIN
GOOGLE_CLIENT_ID=
GOOGLE_AUTO_PROVISION=false
GOOGLE_ALLOWED_EMAIL_DOMAINS=
RESEND_API_KEY=
MAIL_FROM="Sakthi Property <onboarding@resend.dev>"
```

Generate separate secrets; do not reuse passwords:

```sh
openssl rand -hex 32
```

Set `AUTH_SECRET` to a generated value and set `AUTH_SETUP_KEY` to a different
random value for initial admin setup. `RESEND_API_KEY` is needed for password
reset emails; configure a verified `MAIL_FROM` sender with your email provider.
Google sign-in and email reset are optional, but unavailable until configured.

Create the file securely (do not commit it):

```sh
sudo install -o root -g sakthi-property -m 0640 /dev/null \
  /etc/sakthi-property/server.env
sudoedit /etc/sakthi-property/server.env
```

## 5. Apply database migrations

Run migrations before starting the API. Load the protected environment file
into the command's environment:

```sh
sudo -u sakthi-property sh -c \
  'set -a; . /etc/sakthi-property/server.env; set +a; cd /opt/sakthi-property-web/server && npx prisma migrate deploy'
sudo -u sakthi-property npm prune --omit=dev --prefix server
```

The Prisma CLI is only needed for migrations. Pruning the backend development
dependencies afterward keeps them out of the running production service.

## 6. Install and start the API service

Install the included systemd unit:

```sh
sudo install -o root -g root -m 0644 \
  /opt/sakthi-property-web/deploy/sakthi-property-api.service \
  /etc/systemd/system/sakthi-property-api.service
# If `command -v npm` did not report /usr/bin/npm, edit ExecStart in the unit
# to use the actual absolute npm path before starting the service.
sudo systemctl daemon-reload
sudo systemctl enable --now sakthi-property-api
sudo systemctl status sakthi-property-api
```

Check API logs with:

```sh
sudo journalctl -u sakthi-property-api -n 100 --no-pager
```

## 7. Configure Nginx and HTTPS

First configure the HTTP-only Nginx site so Certbot can obtain the certificate.
Replace `example.com` and `www.example.com` in the template with your actual
domain names; remove the `www` name if you do not have DNS for it.

```sh
sudo install -o root -g root -m 0644 \
  /opt/sakthi-property-web/deploy/nginx-http.conf \
  /etc/nginx/sites-available/sakthi-property
sudo ln -s /etc/nginx/sites-available/sakthi-property \
  /etc/nginx/sites-enabled/sakthi-property
sudo nginx -t
sudo systemctl reload nginx
```

Request the certificate:

```sh
sudo certbot certonly --webroot -w /var/www/html \
  -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

If not using `www`, omit its `-d` option. Replace the domain names in
`deploy/nginx-https.conf` (including the certificate directory) and install
that file over `/etc/nginx/sites-available/sakthi-property`. Then verify and
reload:

```sh
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

## 8. Create the initial administrator and verify

Create the initial admin exactly once. Do not use real credentials in shell
history; use your terminal's secure input method or a password manager to
prepare the request.

```sh
curl --fail --request POST https://YOUR_DOMAIN/api/auth/setup \
  --header 'Content-Type: application/json' \
  --header 'x-setup-key: YOUR_TEMPORARY_AUTH_SETUP_KEY' \
  --data '{"username":"admin","email":"YOUR_RECOVERY_EMAIL","password":"YOUR_STRONG_PASSWORD"}'
```

After successful setup, remove the `AUTH_SETUP_KEY` line from
`/etc/sakthi-property/server.env` and restart the service. The setup endpoint
will then reject requests, and it also refuses creation once an admin exists.
Verify database connectivity and HTTPS:

```sh
curl --fail https://YOUR_DOMAIN/api/health
```

Open `https://YOUR_DOMAIN` and verify sign-in and core property, tenant, rent,
bill, and maintenance workflows. Test password reset only after configuring
Resend.

## Updates and backups

Back up PostgreSQL to secure off-server storage before deploying updates. Test
restores periodically. Update the checkout and rebuild:

```sh
cd /opt/sakthi-property-web
sudo -u sakthi-property git -C /opt/sakthi-property-web pull --ff-only
sudo -u sakthi-property npm ci
sudo -u sakthi-property npm run build
sudo -u sakthi-property npm ci --include=dev --prefix server
sudo -u sakthi-property sh -c \
  'set -a; . /etc/sakthi-property/server.env; set +a; cd /opt/sakthi-property-web/server && npx prisma migrate deploy'
sudo -u sakthi-property npm prune --omit=dev --prefix server
sudo systemctl restart sakthi-property-api
sudo systemctl status sakthi-property-api
```

Run and securely transfer a database backup, for example:

```sh
sudo -u postgres pg_dump sakthi_property > sakthi-property-$(date +%F).sql
```

Keep backups outside the server, encrypted and access-controlled. Keep Ubuntu,
Node.js, PostgreSQL, and Nginx updated; limit SSH access; monitor disk space and
logs; and rehearse database restore before relying on the deployment.
