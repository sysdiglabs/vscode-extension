
# Show available recipes
[private]
default:
    @just --list

# Run while debugging; wired as the preLaunchTask for F5
watch:
    npm run watch

# Build an installable .vsix (VS Code: "Install from VSIX…") into the repo root
vsix:
    nix build
    install --mode=644 result sysdig-vscode-ext.vsix
    rm result

# Publish the built .vsix to the VS Code Marketplace
publish-vscode-marketplace token: vsix
    vsce publish --packagePath sysdig-vscode-ext.vsix --pat {{token}}

# Publish the built .vsix to the Open VSX registry
publish-openvsx-registry token: vsix
    npx ovsx publish sysdig-vscode-ext.vsix --pat {{token}}

# Clean up
clean:
    rm -f sysdig-vscode-ext.vsix
    rm -rf out
    rm -rf dist
    rm -rf node_modules
    rm -rf .vscode-test
    rm -f result

# Run tests
[linux]
test:
    xvfb-run --auto-display npm test

# Run tests
[macos]
test:
    npm test

# All static code checks, without running tests
lint:
    #!/usr/bin/env bash
    set -o errexit -o nounset -o pipefail
    npm run check-types
    npm run lint
    # Audit fails only when at least one vulnerability has a fix available
    audit=$(npm audit --json) || true
    if node -e 'const v=Object.values(JSON.parse(require("fs").readFileSync(0,"utf8")).vulnerabilities||{}); process.exit(v.some(x=>x.fixAvailable!==false)?0:1)' <<<"$audit"; then
        npm audit
        exit 1
    fi

# Bump all pinned dependencies to their latest versions
update:
    nix flake update
    nix develop --command pre-commit autoupdate
    nix develop --command npm update
    nix develop --command just update-scanner-version
    nix develop --command pinact run --update --diff

# Bump the inner sysdig-cli-scanner to the latest version
update-scanner-version:
    #!/usr/bin/env bash
    set -o errexit -o nounset -o pipefail
    echo "Fetching latest sysdig-cli-scanner version…"
    latest=$(curl --silent --show-error --fail --location https://download.sysdig.com/scanning/sysdig-cli-scanner/latest_version.txt)
    echo "Latest: $latest"
    sd "(export const SCANNER_VERSION : string = ')[^']+(';)" "\${1}$latest\${2}" src/config/configScanner.ts
    echo "Version updated"
