$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$image = "pm-app"
$container = "pm-app"
$port = if ($env:PORT) { $env:PORT } else { "8000" }

docker build -t $image $root
docker rm -f $container 2>$null | Out-Null
# -e OPENAI_API_KEY forwards the host value (if set) for the AI features.
# Override the host port with $env:PORT = "8080" before running if 8000 is taken.
docker run -d --name $container -e OPENAI_API_KEY -p "${port}:8000" $image

Write-Host "Running at http://localhost:$port"
