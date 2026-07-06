using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoParty.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class RenamePartyGuestToPartyMember : Migration
    {
        // Hand-edited: EF scaffolds an entity rename as drop+create, which
        // would lose all rows. These rename operations preserve the data.
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "PartyGuests",
                newName: "PartyMembers");

            migrationBuilder.RenameColumn(
                name: "PartyGuestId",
                table: "PartyMembers",
                newName: "PartyMemberId");

            migrationBuilder.RenameColumn(
                name: "GuestName",
                table: "PartyMembers",
                newName: "DisplayName");

            migrationBuilder.RenameIndex(
                name: "IX_PartyGuests_PartyId",
                table: "PartyMembers",
                newName: "IX_PartyMembers_PartyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_PartyMembers_PartyId",
                table: "PartyMembers",
                newName: "IX_PartyGuests_PartyId");

            migrationBuilder.RenameColumn(
                name: "DisplayName",
                table: "PartyMembers",
                newName: "GuestName");

            migrationBuilder.RenameColumn(
                name: "PartyMemberId",
                table: "PartyMembers",
                newName: "PartyGuestId");

            migrationBuilder.RenameTable(
                name: "PartyMembers",
                newName: "PartyGuests");
        }
    }
}
