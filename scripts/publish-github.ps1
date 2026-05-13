# Publishes the Industrial Surplus dashboard to a clean folder and pushes to GitHub.
# Usage (PowerShell):
#   cd <folder that contains THIS repo's package.json, app\, etc.>
#   powershell -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1
#
# Optional: specify source and destination
#   .\scripts\publish-github.ps1 -SourceDir "C:\path\to\project" -DestDir "C:\path\to\industrial-surplus-dashboard"
#
# Push to your GitHub remote (uses HTTPS; you may be prompted to sign in or use a PAT as password):
#   .\scripts\publish-github.ps1 -Push
#   .\scripts\publish-github.ps1 -Push -RemoteUrl "https://github.com/OTHER/REPO.git"

param(
  [string]$SourceDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$DestDir = (Join-Path (Split-Path $SourceDir -Parent) "industrial-surplus-dashboard"),
  [string]$RemoteUrl = "https://github.com/mikeswags1/industrial-surplus-dashboard.git",
  [switch]$Push
)

$ErrorActionPreference = "Stop"

$items = @(
  "app",
  "components",
  "context",
  "lib",
  "supabase",
  "scripts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  ".gitignore",
  ".env.example",
  "README.md",
  "COLLAB.md"
)

Write-Host "Source: $SourceDir"
Write-Host "Destination: $DestDir"

if (-not (Test-Path (Join-Path $SourceDir "package.json"))) {
  throw "No package.json in SourceDir. Open a terminal in the project root and run again."
}

if (Test-Path $DestDir) {
  Write-Host "Removing existing $DestDir"
  Remove-Item $DestDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DestDir -Force | Out-Null

foreach ($name in $items) {
  $from = Join-Path $SourceDir $name
  if (-not (Test-Path $from)) {
    Write-Host "Skip (missing): $name"
    continue
  }
  $to = Join-Path $DestDir $name
  Copy-Item -Path $from -Destination $to -Recurse -Force
  Write-Host "Copied: $name"
}

Push-Location $DestDir
try {
  if (-not (git config --get user.email)) {
    throw "Git needs your identity. Run once:`n  git config --global user.email 'you@example.com'`n  git config --global user.name 'Your Name'"
  }

  git init
  git add .
  git status
  git commit -m "Initial commit: industrial surplus marketing dashboard MVP"

  if ($Push) {
    Write-Host ""
    Write-Host "--- Pushing to GitHub ---"
    git branch -M main
    git remote remove origin *>$null
    git remote add origin $RemoteUrl
    git push -u origin main
    Write-Host "Done. Remote: $RemoteUrl"
  }
  else {
    Write-Host ""
    Write-Host "--- Next: push to GitHub ---"
    Write-Host "From this folder:"
    Write-Host "  cd `"$DestDir`""
    Write-Host "  git branch -M main"
    Write-Host "  git remote add origin $RemoteUrl"
    Write-Host "  git push -u origin main"
    Write-Host ""
    Write-Host "Or re-run with -Push (copies again into clean folder, then pushes):"
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1 -Push"
  }

  Write-Host ""
  Write-Host "Folder ready at: $DestDir"
}
finally {
  Pop-Location
}
