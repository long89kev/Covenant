# Setup

Requirements: Docker, Node.js 22.13 or newer (uses the built-in `node:sqlite`), `jq`, `curl`.

```bash
# 1. TideCloak dev server (development only)
docker run -d --name covenant-tidecloak -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=<choose-one> \
  tideorg/tidecloak-dev:latest

# 2. Provision a licensed, QEA-enabled realm and export tidecloak.json (interactive Tide enrolment)
npm ci
KC_PASSWORD=<same> SUBSCRIPTION_EMAIL=you@example.com npm run init

# 3. Config: AUTHORITY_MODE is required (anything else = executor fails closed)
cp .env.example .env
echo 'KC_PASSWORD=<same>' > .env.admin   # setup script only; never in .env (Next.js loads .env into the app server)

# 4. Approver roles and governance. Each grant is a QEA change request: approve it in
#    http://localhost:8080/realms/<realm>/tide-console/ -> QEA Approvals
bash scripts/realm-setup.sh grant <finance-user> covenant-finance
bash scripts/realm-setup.sh grant <procurement-user> covenant-procurement
bash scripts/realm-setup.sh admin <third-user>       # 3 realm admins -> quorum 2 of 3

# 5. Run (the realm signs the http://localhost:3000 origin)
npm run build && npm start
npm test            # 33 unit, adversarial, service and UI-model tests
npm run test:e2e    # Playwright UI checks at 1440x900 and 390x844 (screenshots in docs/screenshots/)
npm run typecheck
```

Chrome may ask to let `ork…tideprotocol.com` reach your local network during Tide sign-in. Click **Allow**.

All data is synthetic. No real payments, banks or customer data.
