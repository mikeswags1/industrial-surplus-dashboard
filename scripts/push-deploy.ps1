# Commit all changes and push to origin (Vercel deploys from GitHub on main).
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\push-deploy.ps1
#
# Optional commit message:
#   .\scripts\push-deploy.ps1 -Message "fix: typo"

param(
  [string]$Message = "feat(phase1): repositories, health, import preview, lead notes API, remove localStorage"
)

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Test-Path .git)) {
  Write-Error "Run this from the industrial-surplus-dashboard clone (missing .git)."
}

$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch: $branch"
git status --short

$dirty = git status --porcelain
if ([string]::IsNullOrWhiteSpace($dirty)) {
  Write-Host "Working tree clean - nothing to commit."
} else {
  git add -A
  git commit -m $Message
}

Write-Host "Pushing to origin/$branch ..."
git push origin $branch
Write-Host "Done. Open Vercel, then Project, then Deployments for status."
