$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$image = "pm-app"
$container = "pm-app"

docker build -t $image $root
docker rm -f $container 2>$null | Out-Null
docker run -d --name $container -p 8000:8000 $image

Write-Host "Running at http://localhost:8000"
