{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };
  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forEachSystem =
        f:
        nixpkgs.lib.genAttrs supportedSystems (
          system:
          let
            pkgs = import nixpkgs {
              inherit system;
              config.allowUnfree = true;
            };
          in
          f pkgs
        );
    in
    {
      packages = forEachSystem (
        pkgs: with pkgs; rec {
          default = vsix;
          vsix = callPackage ./vsix.nix { };

          sysdig-vscode-ext = vscode-utils.buildVscodeExtension {
            inherit (vsix.packageJson) name version;
            src = vsix;
            unpackPhase = "unzip $src";

            vscodeExtPublisher = vsix.packageJson.publisher;
            vscodeExtName = vsix.packageJson.name;
            vscodeExtUniqueId = "${vsix.packageJson.publisher}.${vsix.packageJson.name}";
          };
        }
      );

      apps = forEachSystem (pkgs: {
        # Builds the extension and packages is with vscode to launch it.
        # To execute with: nix run .#code
        # You can also execute it with the latest version in the repo: nix run github:sysdiglabs/vscode-extension#code
        # Or even from a tag: nix run github:sysdiglabs/vscode-extension/0.2.6#code
        code =
          let
            vscode-with-extension-installed = pkgs.vscode-with-extensions.override {
              vscodeExtensions = [ self.packages.${pkgs.system}.sysdig-vscode-ext ];
            };
          in
          {
            type = "app";
            program = "${vscode-with-extension-installed}/bin/code";
          };
      });

      devShells = forEachSystem (
        pkgs: with pkgs; {
          default = mkShell {
            shellHook = ''
              npm ci
            '';
            buildInputs = [
              vscode
              nodejs
              typescript
              vsce
              nodePackages.typescript-language-server
            ];
          };
        }
      );

      formatter = forEachSystem (pkgs: pkgs.nixfmt-rfc-style);
    };
}
