param(
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$Ready,
    [Parameter(Mandatory = $true)][string]$Release
)
$ErrorActionPreference = 'Stop'
$directory = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Target))
foreach ($marker in @($Ready, $Release)) {
    if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($marker)) -ne $directory) {
        throw 'The lock target and control files must share the fixture directory.'
    }
}
$stream = [IO.File]::Open($Target, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
try {
    [IO.File]::WriteAllText($Ready, [string]$PID)
    $deadline = [DateTime]::UtcNow.AddSeconds(75)
    while (-not [IO.File]::Exists($Release) -and [DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 25
    }
    if (-not [IO.File]::Exists($Release)) {
        throw 'The fixture lock reached its time limit.'
    }
} finally {
    $stream.Dispose()
}
