using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoParty.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddPartyVideoVotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PartyVideoVotes",
                columns: table => new
                {
                    PartyVideoVoteId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PartyVideoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartyVideoVotes", x => x.PartyVideoVoteId);
                    table.ForeignKey(
                        name: "FK_PartyVideoVotes_PartyVideos_PartyVideoId",
                        column: x => x.PartyVideoId,
                        principalTable: "PartyVideos",
                        principalColumn: "PartyVideoId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PartyVideoVotes_PartyVideoId_UserId",
                table: "PartyVideoVotes",
                columns: new[] { "PartyVideoId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartyVideoVotes");
        }
    }
}
