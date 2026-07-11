using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoParty.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                table: "PartyVideos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "PartyVideos",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThumbnailUrl",
                table: "PartyVideos");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "PartyVideos");
        }
    }
}
