param(
    [Parameter(Mandatory)][string]$Downloads,
    [Parameter(Mandatory)][string]$Work
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ARCH -ne 'X64') { throw 'Use a disposable Windows x64 Actions runner.' }
$drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($Work))
if ($drive.DriveFormat -ne 'NTFS') { throw "Unexpected filesystem $($drive.DriveFormat)" }
if (Test-Path (Join-Path $env:APPDATA 'in-C')) { throw 'The runner must start with a clean default Studio profile.' }

function Unique-Asset($Directory, $Pattern) {
    $files = @(Get-ChildItem $Directory -File -Filter $Pattern)
    if ($files.Count -ne 1) { throw "Expected one $Pattern in $Directory." }
    return $files[0].FullName
}

$candidateVersion = '0.1.0-alpha.44'
$publishedVersion = '0.1.0-alpha.43'
$candidateSetup = Unique-Asset $Downloads "Ddirori-Studio-$candidateVersion-windows-x64-setup.exe"
$portable = Unique-Asset $Downloads "Ddirori-Studio-$candidateVersion-windows-x64-portable.exe"
$publicSetup = Unique-Asset $Downloads "Ddirori-Studio-$publishedVersion-windows-x64-setup.exe"
$install = Join-Path $Work 'installed-app'
$app = Join-Path $install 'in-C.exe'
$evidence = Join-Path $Work 'installation'
if (!(Test-Path (Join-Path $evidence 'published-assets.json'))) { throw 'The published asset receipt is required.' }
$appId = 'com.mannlab.inc'
# NSIS registry key for the Studio app ID, confirmed by both prior installers.
$registryGuid = '688deee1-5ba1-5c47-a4bc-a2f716bb9772'
$registryLocation = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$registryGuid"
$installRegistry = "HKCU:\Software\$registryGuid"

function Start-Setup($File, $Label, $ExpectedVersion) {
    $start = [DateTimeOffset]::UtcNow
    $process = Start-Process $File -ArgumentList @('/S', '/currentuser', "/D=$install") -Wait -PassThru
    $status = @{ label = $Label; source = [IO.Path]::GetFileName($File); exit = $process.ExitCode
        started = $start.ToString('o'); ended = [DateTimeOffset]::UtcNow.ToString('o')
        installerSha256 = (Get-FileHash $File -Algorithm SHA256).Hash.ToLowerInvariant()
        appId = $appId; installPath = $install }
    $status | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $evidence "$Label.json")
    if ($process.ExitCode -ne 0) { throw "Installer $Label exited $($process.ExitCode)." }
    if (!(Test-Path $app) -or !(Test-Path $registryLocation) -or !(Test-Path $installRegistry)) { throw "Installer $Label did not register or install the executable." }
    $entry = Get-ItemProperty $registryLocation
    $installation = Get-ItemProperty $installRegistry
    if ($installation.InstallLocation.TrimEnd('\') -ne $install) { throw "Installer $Label registered a different location." }
    if ($entry.DisplayVersion -ne $ExpectedVersion) { throw "Installer $Label registered $($entry.DisplayVersion) instead of $ExpectedVersion." }
    $installedAsar = (Get-FileHash (Join-Path $install 'resources/app.asar') -Algorithm SHA256).Hash.ToLowerInvariant()
    $status.appAsarSha256 = $installedAsar
    $status.displayVersion = $entry.DisplayVersion
    $status.displayName = $entry.DisplayName
    $status.uninstallKey = $registryGuid
    $status.fileVersion = (Get-Item $app).VersionInfo.ProductVersion
    $status.executable = $app
    $status.executableSha256 = (Get-FileHash $app -Algorithm SHA256).Hash.ToLowerInvariant()
    $status | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $evidence "$Label.json")
    Write-Host "PASS installer $Label and registered app $appId $($entry.DisplayVersion)"
}

function Run-App($Stage, $Executable, $Directory, $ExpectedAsar, $ExpectedVersion) {
    $env:STUDIO_QA_APP_VERSION = $ExpectedVersion
    node (Join-Path $PSScriptRoot 'drive.cjs') $Stage $Executable $Directory $ExpectedAsar
    if ($LASTEXITCODE -ne 0) { throw "Application verification failed: $Stage" }
}

function Remove-Setup {
    $uninstaller = Unique-Asset $install 'Uninstall*.exe'
    $removed = Start-Process $uninstaller -ArgumentList @('/S', '/currentuser') -Wait -PassThru
    if ($removed.ExitCode -ne 0 -or (Test-Path $app) -or (Test-Path $registryLocation)) { throw 'Isolated installation cleanup failed.' }
}

Start-Setup $candidateSetup 'alpha44-fresh' $candidateVersion
$asar = (Get-Content (Join-Path $evidence 'alpha44-fresh.json') -Raw | ConvertFrom-Json).appAsarSha256
Run-App 'fresh' $app (Join-Path $Work 'fresh') $asar $candidateVersion
Remove-Setup

Start-Setup $publicSetup 'alpha43-installed' $publishedVersion
$publicAsar = (Get-FileHash (Join-Path $install 'resources/app.asar') -Algorithm SHA256).Hash.ToLowerInvariant()
Run-App 'prepare' $app (Join-Path $Work 'transition') $publicAsar $publishedVersion
Start-Setup $candidateSetup 'alpha44-upgrade' $candidateVersion
Run-App 'recover' $app (Join-Path $Work 'transition') $asar $candidateVersion

$env:STUDIO_QA_DELIVERY_MODE = 'portable-exe'
Run-App 'distribution' $portable (Join-Path $Work 'portable') $asar $candidateVersion
Run-App 'portable-default' $portable (Join-Path $Work 'transition') $asar $candidateVersion
Remove-Item Env:STUDIO_QA_DELIVERY_MODE

Remove-Setup
Start-Setup $publicSetup 'alpha43-reinstalled' $publishedVersion
Run-App 'previous-read' $app (Join-Path $Work 'transition') $publicAsar $publishedVersion

@{ arch = $env:RUNNER_ARCH; filesystem = $drive.DriveFormat; candidateAsarSha256 = $asar
    portableSha256 = (Get-FileHash $portable -Algorithm SHA256).Hash.ToLowerInvariant()
    portableFileName = [IO.Path]::GetFileName($portable)
    publishedVersion = $publishedVersion; candidateVersion = $candidateVersion
    publishedToCandidate = 'version upgrade'; appId = $appId } |
    ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $evidence 'summary.json')
