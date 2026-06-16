
[private]
default:
    @just -l

[linux]
test:
    xvfb-run -d npm test

[macos]
test:
    npm test

lint:
    npm run lint
    npm audit

update:
    nix flake update
    nix develop --command pre-commit autoupdate
    nix develop --command npm update
    nix develop --command just rehash-npm-nix
    nix develop --command just update-scanner-version
    nix develop --command pinact run -u --diff

update-scanner-version:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Fetching latest sysdig-cli-scanner version…"
    latest=$(curl -sfSL https://download.sysdig.com/scanning/sysdig-cli-scanner/latest_version.txt)
    echo "Latest: $latest"
    sd "(export const SCANNER_VERSION : string = ')[^']+(';)" "\${1}$latest\${2}" src/config/configScanner.ts
    echo "Version updated"

rehash-npm-nix:
    sd 'npmDepsHash = ".*";' "npmDepsHash = \"$(nix hash convert --to sri $(prefetch-npm-deps ./package-lock.json))\";" vsix.nix
