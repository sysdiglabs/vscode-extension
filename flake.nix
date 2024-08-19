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
      devShells = forEachSystem (
        pkgs: with pkgs; {
          default = mkShell {
            shellHook = ''
              npm install
            '';

            buildInputs = [
              vscode
              nodejs_22
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
