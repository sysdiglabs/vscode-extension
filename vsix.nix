{
  buildNpmPackage,
  clang_20,
  importNpmLock,
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

  # Derive npm dependencies directly from package-lock.json instead of pinning
  # a fixed-output npmDepsHash. This way dependency bumps (e.g. Dependabot PRs)
  # don't require manually updating a hash to keep the Nix build green.
  npmDeps = importNpmLock { npmRoot = ./.; };
  npmConfigHook = importNpmLock.npmConfigHook;

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
