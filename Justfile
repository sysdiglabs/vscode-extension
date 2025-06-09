
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
