param(
    [Parameter(Mandatory)][string]$Candidate,
    [Parameter(Mandatory)][string]$Work,
    [Parameter(Mandatory)][string]$Published
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

$candidateRelease = Join-Path $Candidate 'release'
$candidateSetup = Unique-Asset $candidateRelease '*-windows-x64-setup.exe'
$portable = Unique-Asset $candidateRelease '*-windows-x64-portable.exe'
$publicSetup = Unique-Asset $Published '*-windows-x64-setup.exe'
$asar = (Get-FileHash (Join-Path $candidateRelease 'win-unpacked/resources/app.asar') -Algorithm SHA256).Hash.ToLowerInvariant()
$install = Join-Path $Work 'installed-app'
$app = Join-Path $install 'in-C.exe'
$evidence = Join-Path $Work 'installation'
New-Item -Type Directory $evidence | Out-Null
$appId = (Get-Content (Join-Path $Candidate 'package.json') -Raw | ConvertFrom-Json).build.appId
$registryGuid = node -e 'const {UUID}=require(require.resolve("builder-util-runtime",{paths:[process.argv[1]]}));console.log(UUID.v5(process.argv[2],UUID.parse("50e065bc-3134-11e6-9bab-38c9862bdaf3")));' $Candidate $appId
if ($LASTEXITCODE -ne 0 -or !$registryGuid) { throw 'Could not derive installer AppId registry key.' }
$registryLocation = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$registryGuid"
$installRegistry = "HKCU:\Software\$registryGuid"

function Start-Setup($File, $Label) {
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
    if ($entry.DisplayVersion -ne '0.1.0-alpha.43') { throw "Installer $Label has an unexpected version." }
    $installedAsar = (Get-FileHash (Join-Path $install 'resources/app.asar') -Algorithm SHA256).Hash.ToLowerInvariant()
    $status.appAsarSha256 = $installedAsar
    $status.displayVersion = $entry.DisplayVersion
    $status.displayName = $entry.DisplayName
    $status.uninstallKey = $registryGuid
    $status.fileVersion = (Get-Item $app).VersionInfo.ProductVersion
    $status | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $evidence "$Label.json")
    Write-Host "PASS installer $Label and registered app $appId $($entry.DisplayVersion)"
}

function Run-App($Stage, $Executable, $Directory, $ExpectedAsar) {
    node (Join-Path $PSScriptRoot 'drive.cjs') $Stage $Executable $Directory $ExpectedAsar
    if ($LASTEXITCODE -ne 0) { throw "Application verification failed: $Stage" }
}

Start-Setup $candidateSetup 'candidate-fresh'
Run-App 'fresh' $app (Join-Path $Work 'fresh') $asar
$uninstaller = Unique-Asset $install 'Uninstall*.exe'
$removed = Start-Process $uninstaller -ArgumentList @('/S', '/currentuser') -Wait -PassThru
if ($removed.ExitCode -ne 0 -or (Test-Path $app) -or (Test-Path $registryLocation)) { throw 'Fresh installation cleanup failed.' }

Start-Setup $publicSetup 'published'
Run-App 'prepare' $app (Join-Path $Work 'transition') ''
Start-Setup $candidateSetup 'candidate-replacement'
Run-App 'recover' $app (Join-Path $Work 'transition') $asar

$env:STUDIO_QA_DELIVERY_MODE = 'portable-exe'
Run-App 'distribution' $portable (Join-Path $Work 'portable') $asar
@{ arch = $env:RUNNER_ARCH; filesystem = $drive.DriveFormat; candidateAsarSha256 = $asar
    portableSha256 = (Get-FileHash $portable -Algorithm SHA256).Hash.ToLowerInvariant()
    publishedToCandidate = 'same-version replacement'; appId = $appId } |
    ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $evidence 'summary.json')
