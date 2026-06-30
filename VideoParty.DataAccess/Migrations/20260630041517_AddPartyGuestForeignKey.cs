using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VideoParty.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddPartyGuestForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_PartyGuests_PartyId",
                table: "PartyGuests",
                column: "PartyId");

            migrationBuilder.AddForeignKey(
                name: "FK_PartyGuests_Parties_PartyId",
                table: "PartyGuests",
                column: "PartyId",
                principalTable: "Parties",
                principalColumn: "PartyId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PartyGuests_Parties_PartyId",
                table: "PartyGuests");

            migrationBuilder.DropIndex(
                name: "IX_PartyGuests_PartyId",
                table: "PartyGuests");
        }
    }
}
