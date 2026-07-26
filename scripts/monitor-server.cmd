@echo off
REM ==============================================================================
REM Monitor Eventing EC2 Server via AWS CLI / SSM / Curl
REM Usage: scripts\monitor-server.cmd [status|health|shell|logs|stats|grafana|help]
REM ==============================================================================
setlocal EnableExtensions

REM Set defaults with environment variable overrides
if defined EVENTING_AWS_PROFILE (
  set "AWS_PROFILE_NAME=%EVENTING_AWS_PROFILE%"
) else (
  set "AWS_PROFILE_NAME=eventing-operator"
)

if defined EVENTING_AWS_REGION (
  set "AWS_REGION_NAME=%EVENTING_AWS_REGION%"
) else (
  set "AWS_REGION_NAME=ap-southeast-2"
)

if defined EVENTING_INSTANCE_ID (
  set "TARGET_INSTANCE_ID=%EVENTING_INSTANCE_ID%"
) else (
  set "TARGET_INSTANCE_ID=i-07fad4ae71f784a69"
)

set "AWS_CMD=aws --profile %AWS_PROFILE_NAME% --region %AWS_REGION_NAME%"
set "HEALTH_URL=https://eventing-api.moteo.fun/health"

REM Parse action
set "ACTION=%~1"
if "%ACTION%"=="" goto :usage
if /I "%ACTION%"=="help" goto :usage
if /I "%ACTION%"=="-h" goto :usage
if /I "%ACTION%"=="--help" goto :usage
if /I "%ACTION%"=="/?" goto :usage

if /I "%ACTION%"=="status" goto :do_status
if /I "%ACTION%"=="health" goto :do_health
if /I "%ACTION%"=="shell" goto :do_shell
if /I "%ACTION%"=="logs" goto :do_logs
if /I "%ACTION%"=="stats" goto :do_stats
if /I "%ACTION%"=="grafana" goto :do_grafana

echo ERROR: Unknown action "%ACTION%"
echo.
goto :usage

:check_aws
where aws >nul 2>&1
if errorlevel 1 (
  echo ERROR: AWS CLI is not installed or not on PATH.
  echo Please install AWS CLI v2 and retry.
  exit /b 1
)

%AWS_CMD% sts get-caller-identity >nul 2>&1
if errorlevel 1 (
  echo ERROR: AWS credentials check failed for profile '%AWS_PROFILE_NAME%'.
  echo Please run: aws configure --profile %AWS_PROFILE_NAME%
  exit /b 1
)
exit /b 0

:check_ssm_plugin
where session-manager-plugin >nul 2>&1
if errorlevel 1 (
  echo ERROR: AWS Session Manager Plugin is not installed or not on PATH.
  echo Please download and install the official Windows plugin:
  echo   https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe
  echo Reopen CMD then run "session-manager-plugin" to verify.
  exit /b 1
)
exit /b 0

:check_curl
where curl >nul 2>&1
if errorlevel 1 (
  echo ERROR: curl command is not available on PATH.
  exit /b 1
)
exit /b 0

:do_status
call :check_aws || exit /b 1
echo ==============================================================================
echo Eventing Server Status
echo Profile  : %AWS_PROFILE_NAME%
echo Region   : %AWS_REGION_NAME%
echo Instance : %TARGET_INSTANCE_ID%
echo ==============================================================================
echo.
echo [EC2 Instance Status]
%AWS_CMD% ec2 describe-instances --instance-ids %TARGET_INSTANCE_ID% --query "Reservations[*].Instances[*].{InstanceId:InstanceId,State:State.Name,InstanceType:InstanceType,PublicIp:PublicIpAddress,PrivateIp:PrivateIpAddress,LaunchTime:LaunchTime}" --output table
echo.
echo [SSM Agent Status]
%AWS_CMD% ssm describe-instance-information --filters Key=InstanceIds,Values=%TARGET_INSTANCE_ID% --query "InstanceInformationList[*].{InstanceId:InstanceId,PingStatus:PingStatus,AgentVersion:AgentVersion,PlatformName:PlatformName,LastPingDateTime:LastPingDateTime}" --output table
exit /b 0

:do_health
call :check_curl || exit /b 1
echo Checking API health at %HEALTH_URL% ...
echo.
curl -i -sS "%HEALTH_URL%"
if errorlevel 1 (
  echo.
  echo ERROR: Health check request failed.
  exit /b 1
)
echo.
exit /b 0

:do_shell
call :check_aws || exit /b 1
call :check_ssm_plugin || exit /b 1
echo Starting SSM session for instance %TARGET_INSTANCE_ID% ...
%AWS_CMD% ssm start-session --target %TARGET_INSTANCE_ID%
exit /b %ERRORLEVEL%

:do_logs
call :check_aws || exit /b 1
call :check_ssm_plugin || exit /b 1
echo Opening interactive SSM shell on instance %TARGET_INSTANCE_ID% ...
echo.
echo Once connected, run any of the following commands to view logs:
echo   docker logs -f --tail 100 eventing-api
echo   docker logs -f --tail 100 eventing-caddy
echo   docker logs -f --tail 100 eventing-web
echo.
%AWS_CMD% ssm start-session --target %TARGET_INSTANCE_ID%
exit /b %ERRORLEVEL%

:do_stats
call :check_aws || exit /b 1
call :check_ssm_plugin || exit /b 1
echo Opening interactive SSM shell on instance %TARGET_INSTANCE_ID% ...
echo.
echo Once connected, run any of the following commands to view server stats:
echo   docker stats
echo   free -h
echo   df -h /
echo.
%AWS_CMD% ssm start-session --target %TARGET_INSTANCE_ID%
exit /b %ERRORLEVEL%

:do_grafana
call :check_aws || exit /b 1
call :check_ssm_plugin || exit /b 1
echo ==============================================================================
echo Port forwarding Grafana from %TARGET_INSTANCE_ID%:3001 to localhost:3301
echo Grafana URL: http://localhost:3301
echo Press Ctrl+C to stop port forwarding.
echo ==============================================================================
echo.
%AWS_CMD% ssm start-session --target %TARGET_INSTANCE_ID% --document-name AWS-StartPortForwardingSession --parameters "portNumber=3001,localPortNumber=3301"
exit /b %ERRORLEVEL%

:usage
echo Eventing EC2 Server Management Script
echo.
echo Usage:
echo   scripts\monitor-server.cmd [action]
echo.
echo Actions:
echo   status   - Check EC2 instance state and SSM agent connection status
echo   health   - Curl public API health endpoint (https://eventing-api.moteo.fun/health)
echo   shell    - Start an interactive AWS SSM shell session on the server
echo   logs     - Display remote log commands then start interactive SSM shell
echo   stats    - Display remote resource/docker stat commands then start interactive SSM shell
echo   grafana  - Forward remote Grafana port 3001 to http://localhost:3301
echo   help     - Display this help message
echo.
echo Environment Overrides:
echo   EVENTING_AWS_PROFILE  - AWS profile (default: eventing-operator)
echo   EVENTING_AWS_REGION   - AWS region  (default: ap-southeast-2)
echo   EVENTING_INSTANCE_ID  - EC2 instance ID (default: i-07fad4ae71f784a69)
echo.
echo Current Settings:
echo   Profile  : %AWS_PROFILE_NAME%
echo   Region   : %AWS_REGION_NAME%
echo   Instance : %TARGET_INSTANCE_ID%
echo.
endlocal
exit /b 0
