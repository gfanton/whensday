{ pkgs, ... }:
{
  packages = with pkgs; [
    nodejs_22
    pnpm
  ];

  enterShell = ''
    mkdir -p data
  '';
}
