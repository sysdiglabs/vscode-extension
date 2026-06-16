{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    let
      overlays.default = final: prev: {
        sysdig-vscode-vsix = prev.callPackage ./vsix.nix { };
        vscode-extensions = prev.vscode-extensions // {
          sysdig.sysdig-vscode-ext = vsixToCodeExtension prev final.sysdig-vscode-vsix;
        };
      };

      vsixToCodeExtension =
        pkgs: vsix:
        pkgs.vscode-utils.buildVscodeExtension {
          inherit (vsix) pname version;
          src = vsix;
          unpackPhase = "${pkgs.unzip}/bin/unzip $src";

          vscodeExtPublisher = vsix.packageJson.publisher;
          vscodeExtName = vsix.packageJson.name;
          vscodeExtUniqueId = "${vsix.packageJson.publisher}.${vsix.packageJson.name}";
        };

      flake = flake-utils.lib.eachDefaultSystem (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
            overlays = [
              self.overlays.default
            ];
          };
        in
        {
          packages = {
            inherit (pkgs) sysdig-vscode-vsix;
            inherit (pkgs.vscode-extensions.sysdig) sysdig-vscode-ext;
            default = pkgs.sysdig-vscode-vsix;
          };

          apps = {
            # Builds the extension and packages is with vscode to launch it.
            # To execute with: nix run .#code
            # You can also execute it with the latest version in the repo: nix run github:sysdiglabs/vscode-extension#code
            # Or even from a tag: nix run github:sysdiglabs/vscode-extension/0.2.6#code
            code =
              let
                vscode-with-extension-installed = pkgs.vscode-with-extensions.override {
                  vscodeExtensions = with (pkgs.vscode-extensions); [ sysdig.sysdig-vscode-ext ];
                };
              in
              {
                type = "app";
                program = "${vscode-with-extension-installed}/bin/code";
              };
          };

          devShells.default =
            with pkgs;
            mkShell {
              shellHook = ''
                npm ci
                pre-commit install
              '';
              packages = [
                just
                nodejs
                pinact
                pre-commit
                prefetch-npm-deps
                sd
                typescript
                typescript-language-server
                vsce
                vscode
              ]
              ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
                xvfb-run
              ];
            };

          formatter = pkgs.nixfmt-rfc-style;
        }
      );
    in
    flake // { inherit overlays; };
}
