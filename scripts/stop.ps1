$container = "pm-app"

docker rm -f $container 2>$null | Out-Null
Write-Host "Stopped $container"
