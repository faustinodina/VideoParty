# Computes the API version via MinVer (reads local git tags) and passes it
# to fly deploy as a build arg so the Docker build doesn't need git history.

$buildOutput = dotnet build VideoParty.Api/VideoParty.Api.csproj /p:MinVerVerbosity=detailed --nologo 2>&1
$match = $buildOutput | Select-String '\[output\] MinVerVersion=(.+)'
$version = $match.Matches.Groups[1].Value.Trim()

if (-not $version) {
    Write-Error "Could not determine version from MinVer output."
    exit 1
}

$commit = (git rev-parse --short HEAD).Trim()
$versionWithCommit = "${version}+${commit}"

Write-Host "Deploying version: $versionWithCommit"
fly deploy --build-arg VERSION=$versionWithCommit
