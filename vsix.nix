{
  buildNpmPackage,
  clang_20,
  lib,
  libsecret,
  pkg-config,
  stdenv,
  vsce,
}:
let
  packageJson = with builtins; fromJSON (readFile ./package.json);
in
buildNpmPackage {
  pname = "${packageJson.name}-vsix";
  version = packageJson.version;
  src = ./.;
  npmDepsHash = "sha256-knXlH2hmb8QnFDDYDZnsJIzaZTk+Vn6hFG1JBOokxRE=";

  nativeBuildInputs = [
    pkg-config
    vsce
  ]
  ++ lib.optionals stdenv.isDarwin [ clang_20 ]; # clang_21 breaks @vscode/vsce's optional dependency keytar

  buildInputs = [
    libsecret
  ];

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
