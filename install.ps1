# Install the "dsh-ikunchick-pet" plugin into the running DSH desktop profile.
#
#   pwsh -File .\install.ps1
#
# Copies this repository's plugin files into the profile's node_modules, records
# a file: dependency, and appends a loader row to the profile's cordis.patch.yml.
# Every modified file is backed up next to the original with a timestamp.

param(
  [string]$Profile = $(if ($env:DSH_PROFILE_DIR) { $env:DSH_PROFILE_DIR } else { Join-Path (Join-Path $env:USERPROFILE '.dsh') 'profiles\desktop' }),
  [switch]$NoEnable
)

$ErrorActionPreference = 'Stop'

$Pkg = 'dsh-ikunchick-pet'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = $repoRoot
if (-not (Test-Path (Join-Path $source 'package.json'))) { throw "plugin source not found: $source" }
if (-not (Test-Path $Profile)) { throw "profile not found: $Profile" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $Profile "node_modules\$Pkg"

Write-Host "[1/4] copying plugin to $target"
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($item in @('package.json', 'cordis.patch.yml', 'icon.svg', 'README.md', 'README.zh.md', 'LICENSE', 'lib', 'assets')) {
  $src = Join-Path $source $item
  if (Test-Path $src) { Copy-Item -Recurse -Force $src (Join-Path $target $item) }
}

Write-Host "[2/4] registering dependency in profile package.json"
$pkgPath = Join-Path $Profile 'package.json'
Copy-Item $pkgPath "$pkgPath.bak-$stamp" -Force
$profilePkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($null -eq $profilePkg.dependencies) {
  $profilePkg | Add-Member -MemberType NoteProperty -Name dependencies -Value ([pscustomobject]@{}) -Force
}
$fileSpec = 'file:' + ($source -replace '\\', '/')
$existing = $profilePkg.dependencies.PSObject.Properties[$Pkg]
if ($null -eq $existing) {
  $profilePkg.dependencies | Add-Member -MemberType NoteProperty -Name $Pkg -Value $fileSpec -Force
} else {
  $existing.Value = $fileSpec
}
$profilePkg | ConvertTo-Json -Depth 40 | Set-Content -Path $pkgPath -Encoding utf8

if ($NoEnable) {
  Write-Host "[3/4] -NoEnable set; skipping cordis.patch.yml edit"
  Write-Host "[4/4] done (not enabled)"
  return
}

Write-Host "[3/4] enabling plugin row in cordis.patch.yml"
$patchPath = Join-Path $Profile 'cordis.patch.yml'
Copy-Item $patchPath "$patchPath.bak-$stamp" -Force
$patch = Get-Content $patchPath -Raw
$pattern = '(?m)^\s*name:\s*[''"]?' + [regex]::Escape($Pkg) + '[''"]?\s*$'
if ($patch -match $pattern) {
  Write-Host "      $Pkg row already present; leaving as is"
} else {
  $block = @"

# --- $Pkg plugin (added by install.ps1) ---
- insert:
    - id: $Pkg
      name: $Pkg
"@
  Add-Content -Path $patchPath -Value $block -Encoding utf8
  Write-Host "      row appended"
}

Write-Host "[4/4] done"
Write-Host "If the GUI does not show the pet immediately: refresh the Web GUI; for host-side changes, toggle the patch row to reload."
