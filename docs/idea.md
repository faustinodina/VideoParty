
https://chatgpt.com/share/6a3eac43-8a28-83ea-abc0-ddfed6b7948b

-Guest phones
-Master phone
-Organizer
-Server

Video Party general sequence
-Organizer uses VPapp to Create a Video Party. No login needed.
  -VP creation generates 2 tokens: TK1 identifies party instance, TK2m identifies organizer
  -Organzer is authenticated by these two TK1+TK2m 
-Organizer using VPapp generate an invitation unique token for each guest TK1+TK2n
-Organizer using SMS sends invitations to the Guests phones. Invitations include the invitation token.
-Guest uses VPapp to subscribe to the VP instance using the invitation token.
-Guest uses YouTube to share a video through VPapp. 
	-VPapp sends videoID+TK1+TK2n to server
	-Server routes the call to Master phone
	-Master adds the videoID to the playing list

## Organizer creates a VP

## Organizer generates invitation tokens for guests (invitations)
	- Generate unique token for each guest TK1+TK2n
	- Tokens are sent by SMS to the guests phones

## Accept invitation to VP (Guest is created)
	- Guest POST /party/subscribe TK1+TK2n
	- Server broadcastas event New Guest to all party members

## Guest shares video

## Guest votes for video

# Data model

- Party
	- ID (TK1)
	- NextVideoID
- PartyGuest
	- ID (TK2n)
	- PartyID (TK1)
	- Name
- VideoQueue
	- ID (videoID)
	- PartyID (TK1)
	- AddedByGuestID (TK2n)
	- Votes