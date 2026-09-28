param(
  [switch]$Connect,
  [switch]$Generate,
  [switch]$Publish,
  [switch]$DryRun,
  [string]$Id
)

$ErrorActionPreference = 'Stop'

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw 'This helper requires Windows DPAPI.'
}

$actions = @(@($Connect, $Generate, $Publish, $DryRun) | Where-Object { $_ }).Count
if ($actions -gt 1) { throw 'Choose exactly one action.' }
if (($Generate -or $Publish) -and [string]::IsNullOrWhiteSpace($Id)) {
  throw '-Generate and -Publish require -Id.'
}

$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$secretDir = Join-Path $repo 'tmp/host-cache/audio'
$secretPath = Join-Path $secretDir 'elevenlabs-api-key.dpapi'
$generator = Join-Path $PSScriptRoot 'generate-sfx.mjs'
$env:TEMP = Join-Path $repo 'tmp/host-cache/temp'
$env:TMP = $env:TEMP
$env:NPM_CONFIG_CACHE = Join-Path $repo 'tmp/host-cache/npm-cache'

if ($Connect) {
  $secret = Read-Host 'ElevenLabs API key' -AsSecureString
  if ($secret.Length -eq 0) { throw 'Empty API key.' }
  New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
  $protected = ConvertFrom-SecureString -SecureString $secret
  Set-Content -LiteralPath $secretPath -Value $protected -Encoding utf8 -NoNewline
  Write-Output 'ElevenLabs key protected with Windows DPAPI for this user on this machine.'
  return
}

if ($Generate) {
  if (-not (Test-Path -LiteralPath $secretPath -PathType Leaf)) {
    throw 'No protected key found. Run this helper with -Connect first.'
  }
  $protected = Get-Content -LiteralPath $secretPath -Raw -Encoding utf8
  $secret = ConvertTo-SecureString -String $protected
  $bstr = [IntPtr]::Zero
  $previousKey = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'Process')
  try {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:ELEVENLABS_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    & node $generator --id $Id --generate
    if ($LASTEXITCODE -ne 0) { throw "SFX generation failed with exit code $LASTEXITCODE." }
  }
  finally {
    [Environment]::SetEnvironmentVariable('ELEVENLABS_API_KEY', $previousKey, 'Process')
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
  return
}

if ($Publish) {
  & node $generator --id $Id --publish
} else {
  & node $generator --dry-run
}
if ($LASTEXITCODE -ne 0) { throw "SFX command failed with exit code $LASTEXITCODE." }
