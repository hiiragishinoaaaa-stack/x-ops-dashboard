{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript-language-server
    pkgs.python3
    pkgs.gcc
    pkgs.gnumake
  ];
}
