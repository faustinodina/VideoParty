using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoParty.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddUserCounters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastAccessDate",
                table: "Users",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PartiesCreated",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PartiesJoined",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastAccessDate",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PartiesCreated",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PartiesJoined",
                table: "Users");
        }
    }
}
