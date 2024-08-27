{
  buildNpmPackage,
  pkg-config,
  vsce,
  libsecret,
}:
let
  packageJson = with builtins; fromJSON (readFile ./package.json);
in
buildNpmPackage {
  pname = "${packageJson.name}-vsix";
  version = packageJson.version;
  src = ./.;
  npmDepsHash = "sha256-MRbMbyMFyUr2tetIKMzUoxCVg0eR9oGPU/ecZV5pgq8=";

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
