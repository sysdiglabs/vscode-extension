
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
    nix develop --command pinact run -u --diff

rehash-npm-nix:
    sd 'npmDepsHash = ".*";' "npmDepsHash = \"$(nix hash convert --to sri $(prefetch-npm-deps ./package-lock.json))\";" vsix.nix
