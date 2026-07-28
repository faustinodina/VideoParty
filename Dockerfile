FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY VideoParty.Model/VideoParty.Model.csproj VideoParty.Model/
COPY VideoParty.DataAccess/VideoParty.DataAccess.csproj VideoParty.DataAccess/
COPY VideoParty.Api/VideoParty.Api.csproj VideoParty.Api/
RUN dotnet restore VideoParty.Api/VideoParty.Api.csproj

COPY VideoParty.Model/ VideoParty.Model/
COPY VideoParty.DataAccess/ VideoParty.DataAccess/
COPY VideoParty.Api/ VideoParty.Api/
RUN dotnet publish VideoParty.Api/VideoParty.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "VideoParty.Api.dll"]
