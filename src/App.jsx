import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import { useSearchParams } from "react-router-dom";

function App() {
  const [accessToken, setAccessToken] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const access_token = urlParams.get("access_token");
    const refresh_token = urlParams.get("refresh_token");
    const expires_in = urlParams.get("expires_in");
    const code = searchParams.get("code");

    if (access_token) {
      setAccessToken(access_token);

      // Schedule token refresh
      setTimeout(() => {
        refreshAccessToken(refresh_token);
      }, (expires_in - 5) * 1000);

      console.log("Using existing tokens:", {
        access_token,
        refresh_token,
        expires_in,
      });
    } else if (code) {
      console.log("Fetching access token using authorization code:", code);
      fetchAccessToken(code);
      window.history.replaceState({}, document.title, "/");
    }
  }, [searchParams]);

  const handleLogin = async () => {
    window.location.href = "http://localhost:5000/login";
  };

  const fetchAccessToken = async (code) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/token",
        { code },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      setAccessToken(access_token);

      setTimeout(
        () => refreshAccessToken(refresh_token),
        (expires_in - 5) * 1000
      );
    } catch (error) {
      console.error("Error fetching access token:", error);
    }
  };

  const refreshAccessToken = async (refresh_token) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/refresh-token?refresh_token=${refresh_token}`
      );
      const { access_token, expires_in } = response.data;
      setAccessToken(access_token);
      // schedule the next refresh
      setTimeout(() => {
        refreshAccessToken(refresh_token);
      }, (expires_in - 5) * 1000);
    } catch (error) {
      console.error("Error refreshing access token:", error);
    }
  };

  const fetchPlaylists = async () => {
    if (!accessToken) return;

    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/me/playlists`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setPlaylists(response.data.items);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  // const fetchTracks = async (playlistId) => {
  //   if (!accessToken) return;
  //   try {
  //     const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
  //       headers: { Authorization: `Bearer ${accessToken}` },
  //     });

  //     const tracks = response.data.items.map((item) => ({
  //       id: item.track.id,
  //       name: item.track.name,
  //       artist: item.track.artists.map((artist) => artist.name).join(', '),
  //       uri: item.track.uri,
  //     }));
  //     setTracks(tracks);
  //     setSelectedPlaylist(playlistId);
  //     detectDuplicates(tracks);
  //   } catch (error) {
  //     console.error('Error fetching playlist tracks:', error);
  //   }
  // };

  const fetchAllPlaylistsTracks = async () => {
    console.log("Fetching all playlists' tracks...");
    if (!accessToken) {
      console.log("No access token available!");
      return;
    }
    console.log("Access token found:", accessToken);

    console.log("Playlists available:", playlists);
    if (!playlists.length) {
      console.log("No playlists found! Try fetching them first.");
      return;
    }

    const trackMap = {}; // Store tracks with their occurrences in playlists

    for (const playlist of playlists) {
      console.log(`Fetching tracks for: ${playlist.name} (${playlist.id})`);
      try {
        const response = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        response.data.items.forEach((item) => {
          console.log(
            `Processing track: ${item.track.name} by ${item.track.artists
              .map((a) => a.name)
              .join(", ")}`
          );
          const trackKey = `${item.track.name} - ${item.track.artists
            .map((artist) => artist.name)
            .join(", ")}`;

          if (!trackMap[trackKey]) {
            trackMap[trackKey] = { count: 1, playlists: [playlist.name] };
          } else {
            trackMap[trackKey].count += 1;
            trackMap[trackKey].playlists.push(playlist.name);
          }
        });
      } catch (error) {
        console.error(`Error fetching tracks for ${playlist.name}:`, error);
      }
    }
    console.log("Track map before checking duplicates:", trackMap);
    console.log("Calling detectPlaylistDuplicates...");
    detectPlaylistDuplicates(trackMap);
  };

  // const detectDuplicates = (tracks) => {
  //   const trackCount = {};
  //   const duplicateTracks = [];

  //   tracks.forEach((track) => {
  //     const key = `${track.name}-${track.artist}`;
  //     if (trackCount[key]) {
  //       trackCount[key].count += 1;
  //       duplicateTracks.push(track);
  //     } else {
  //       trackCount[key] = {count: 1, track};
  //     }
  //   });

  //   setDuplicates(duplicateTracks);
  // }

  const detectPlaylistDuplicates = (trackMap) => {
    const duplicates = Object.entries(trackMap)
      .filter(([_, data]) => data.count > 1) // Only keep tracks that appear in more than one playlist
      .map(([trackName, data]) => ({
        name: trackName,
        playlists: data.playlists,
      }));
    console.log("Duplicates detected:", duplicates);
    setDuplicates(duplicates);
  };

  return (
    <div className="App">
      <h1>Sorty</h1>
      {!accessToken ? (
        <button onClick={handleLogin}>Login with Spotify</button>
      ) : (
        <div>
          <button
            onClick={() => {
              console.log("Check button clicked!");
              fetchAllPlaylistsTracks();
            }}
          >
            Check for Cross-Playlist Duplicates
          </button>

          <button onClick={fetchPlaylists}>Fetch My Playlists</button>
          <div className="playlists">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="playlist-card">
                <img
                  src={playlist.images[0]?.url}
                  alt={playlist.name}
                  width="100"
                />
                <h3>{playlist.name}</h3>
                <p>{playlist.tracks.total} tracks</p>
                {/* <button onClick={() => fetchTracks(playlist.id)}>
                  Check for Duplicates
                </button> */}
              </div>
            ))}
          </div>

          {selectedPlaylist && (
            <div>
              <h2>Tracks in Selected Playlist</h2>
              <ul>
                {tracks.map((track) => (
                  <li key={track.id}>
                    {track.name} - {track.artist}
                  </li>
                ))}
              </ul>

              {/* <h2>Duplicate Songs</h2>
              {duplicates.length > 0 ? (
                <ul>
                  {duplicates.map((track, index) => (
                    <li key={index}>
                      {track.name} - {track.artist}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No duplicates found! 🎉</p>
              )} */}
              <h2>Duplicate Songs Across Playlists</h2>
              {duplicates.length > 0 ? (
                <ul>
                  {duplicates.map((track, index) => (
                    <li key={index}>
                      {track.name} <br />
                      <small>Appears in: {track.playlists.join(", ")}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No duplicates found across playlists! 🎉</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
