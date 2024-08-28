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
  npmDepsHash = "sha256-j9mbkC3WpESJ7/pD4xMvk4tnuguXG1INTNVrOGQyxuc=";

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
