# TKC_scoreboard

## Targets (ongoing)
- get the timer to work
- Add a system where it will ask the user how long was the tournament(start/end)
        which will update the youtube description for the timer accordingly for easier copy and paste.
- creating database to store data

### Working website:
https://adsea-helmetguy.github.io/TKC_scoreboard/

Combined together with Render("https://render.com/") with websockets.

### Why WebSockets?
The scoreboard uses real-time updates, details change and all connected clients should see it immediately.
Compare to the alternative, HTTP polling, would mean clients repeatedly asking "anything new?" 
on a fixed interval, wasting resources.
Websockets updates the moment something changes, with no unnecessary requests.

### Why Render?
Render was chosen for its simplicity in deploying a persistent Node.js server
- Downsides
      - The free tier spins down after inactivity, which may cause a ~50 second delay on first reconnect after a quiet period.
        (However since the website will contiune to run while you are using it and only close after 15 mins of inactivity,
        it's not a problem if you just keep it running throughout the tournament)

