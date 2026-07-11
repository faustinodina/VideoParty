using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoParty.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddInvitationToPartyMember : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "InvitationId",
                table: "PartyMembers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartyMembers_InvitationId",
                table: "PartyMembers",
                column: "InvitationId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PartyMembers_InvitationId",
                table: "PartyMembers");

            migrationBuilder.DropColumn(
                name: "InvitationId",
                table: "PartyMembers");
        }
    }
}
