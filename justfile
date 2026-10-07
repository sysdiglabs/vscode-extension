
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
    nix develop --command just update-cli-scanner
    nix develop --command just update-oldest-cli-scanner
    nix develop --command pinact run --update --diff

# (internal) Print the latest published sysdig-cli-scanner version
[private]
_latest-version:
    @curl --silent --fail --show-error --location https://download.sysdig.com/scanning/sysdig-cli-scanner/latest_version.txt | tr -d '[:space:]'

# Find the oldest sysdig-cli-scanner version still within the support window (default 365 days)
oldest-cli-scanner window_days="365":
    #!/usr/bin/env bash
    set -euo pipefail
    base="https://download.sysdig.com/scanning/bin/sysdig-cli-scanner"
    os="linux"; arch="amd64"
    cutoff=$(( $(date -u +%s) - {{window_days}} * 86400 ))
    latest=$(just _latest-version)
    major=${latest%%.*}
    minor=$(echo "$latest" | cut -d. -f2)
    oldest_ver=""; oldest_epoch=""
    for m in $(seq "$minor" -1 0); do
        minor_hit=0; misses=0
        for p in $(seq 0 30); do
            v="$major.$m.$p"
            lm=$(curl -sfI "$base/$v/$os/$arch/sysdig-cli-scanner" \
                | grep -i '^last-modified:' | sed 's/^[Ll]ast-[Mm]odified: //' | tr -d '\r' || true)
            if [ -z "$lm" ]; then
                misses=$((misses + 1)); [ "$misses" -ge 2 ] && break; continue
            fi
            misses=0
            epoch=$(date -u -d "$lm" +%s)
            if [ "$epoch" -ge "$cutoff" ]; then
                minor_hit=1
                if [ -z "$oldest_epoch" ] || [ "$epoch" -lt "$oldest_epoch" ]; then
                    oldest_epoch=$epoch; oldest_ver=$v
                fi
            fi
        done
        # Versions are chronological: once a whole minor is out of window, stop.
        [ "$minor_hit" -eq 0 ] && [ -n "$oldest_ver" ] && break
    done
    if [ -z "$oldest_ver" ]; then
        echo "No version found within the last {{window_days}} days" >&2
        exit 1
    fi
    echo >&2 "Oldest supported: $oldest_ver (released $(date -u -d "@$oldest_epoch" '+%Y-%m-%d'))"
    echo "$oldest_ver"

# (internal) Replace the version tagged with <marker>-version-marker wherever it
# appears. Markers are HTML-comment spans in Markdown and trailing `#`/`//`
# comments in YAML/TS. Target files are discovered, not hardcoded, so a new
# marker anywhere is picked up automatically. DO NOT delete those markers.
[private]
_set-version marker version:
    #!/usr/bin/env bash
    set -euo pipefail
    # Discover files carrying this marker. Skip deps, build output, and the
    # tooling/docs that only name the marker in prose.
    mapfile -t files < <(grep -rl \
        --exclude-dir=.git --exclude-dir=node_modules \
        --exclude-dir=out --exclude-dir=dist --exclude-dir=.vscode-test \
        --exclude=justfile --exclude=AGENTS.md \
        "{{marker}}-version-marker" . | sort)
    if [ "${#files[@]}" -eq 0 ]; then
        echo "No files found carrying {{marker}}-version-marker" >&2
        exit 1
    fi
    for f in "${files[@]}"; do
        echo "Updating $f" >&2
        # Markdown: <!-- {{marker}}-version-marker ... -->X<!-- /{{marker}}-version-marker -->
        sed -i -E "s#(<!-- {{marker}}-version-marker[^>]*-->)(\`?)[0-9][0-9.]*(\`?)(<!-- /{{marker}}-version-marker -->)#\1\2{{version}}\3\4#g" "$f"
        # YAML/TS: line carrying a `#`/`//` {{marker}}-version-marker comment
        sed -i -E "/(#|\/\/)[[:space:]]*{{marker}}-version-marker/ s/[0-9]+\.[0-9]+\.[0-9]+/{{version}}/" "$f"
    done

# Substitute the oldest supported version wherever the oldest-version-marker is placed
update-oldest-cli-scanner window_days="365":
    #!/usr/bin/env bash
    set -euo pipefail
    oldest=$(just oldest-cli-scanner {{window_days}})
    just _set-version oldest "$oldest"
    echo "Oldest supported version set to $oldest (via oldest-version-marker)"

# Bump the bundled sysdig-cli-scanner to the latest version (wherever the newest-version-marker is placed)
update-cli-scanner:
    #!/usr/bin/env bash
    set -euo pipefail
    latest=$(just _latest-version)
    just _set-version newest "$latest"
    echo "Newest (default) version set to $latest (via newest-version-marker)"

# Kept for backwards compatibility; use `update-cli-scanner`
alias update-scanner-version := update-cli-scanner
