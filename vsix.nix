{
  buildNpmPackage,
  pkg-config,
  vsce,
  libsecret,
  darwin,
  lib,
  stdenv,
}:
let
  packageJson = with builtins; fromJSON (readFile ./package.json);
in
buildNpmPackage {
  pname = "${packageJson.name}-vsix";
  version = packageJson.version;
  src = ./.;
  npmDepsHash = "sha256-PteXe/M2GF9jVIcOfta4HjA6xsWnwJXzQGfFAwzd9Cc=";

  nativeBuildInputs = [
    pkg-config
    vsce
  ];
  buildInputs = [ libsecret ];

  dontNpmBuild = true;
  dontNpmInstall = true;

  buildPhase = ''
    vsce package
  '';

  installPhase = ''
    install -Dm444 *.vsix $out
  '';

  passthru = {
    inherit packageJson;
  };
}
