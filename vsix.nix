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
  npmDepsHash = "sha256-LL+saWx1l0vydK9z4N13UOElO6HRo9FyOVCVQIz6otw=";

  nativeBuildInputs = [
    pkg-config
    vsce
  ];
  buildInputs =
    [ libsecret ]
    ++ lib.optionals stdenv.isDarwin (
      with darwin.apple_sdk.frameworks;
      [
        Security
        AppKit
      ]
    );

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
