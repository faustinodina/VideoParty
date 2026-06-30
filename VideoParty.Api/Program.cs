using Microsoft.EntityFrameworkCore;
using VideoParty.Api.Hubs;
using VideoParty.DataAccess.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.MapOpenApi();
  app.UseSwaggerUI(options =>
      options.SwaggerEndpoint("/openapi/v1.json", "VideoParty API"));
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapHub<UserHub>("/hubs/user");

app.Run();
