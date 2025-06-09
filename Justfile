
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

update:
    pre-commit autoupdate
    nix flake update
    npm update
    just rehash-npm-nix


rehash-npm-nix:
    sd 'npmDepsHash = ".*";' "npmDepsHash = \"$(nix hash convert --to sri $(prefetch-npm-deps ./package-lock.json))\";" vsix.nix
