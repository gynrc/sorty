import express from 'express';
import axios from 'axios';
import cors from 'cors';
// import { access } from fs;
import * as querystring from 'querystring';


const app = express();
const PORT = 5000;
const client_id = '9e1c46f6f8764128a67abab5a81c9a9e';
const client_secret = '036ca729cbea48a392829c18a99faaf7';
const redirect_uri = 'http://localhost:5173/callback';

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));

app.get('/login', (req, res) => {
  const scope = 'playlist-read-private playlist-modify-private playlist-modify-public';
  const authUrl = 'https://accounts.spotify.com/authorize?'+querystring.stringify({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri,
  });
  res.redirect(authUrl);
  console.log('Login successful!');
});

app.post('/token', async (req, res) => {
  console.log("Received code:", req.body.code);
  const { code } = req.body;
  
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id,
        client_secret,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json(response.data); // Send tokens to frontend
  } catch (error) {
    console.error('Error fetching token:', error.response?.data || error);
    res.status(500).json({ error: 'Token request failed' });
  }
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,  // Use the provided code
        redirect_uri: redirect_uri, 
        client_id: client_id,
        client_secret: client_secret,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Redirect frontend with access tokens
    res.redirect(`http://localhost:5173/?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error exchanging token:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/refresh-token', async (req, res) => {
  const refresh_token = req.query.refresh_token;
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const { access_token, expires_in } = response.data;
    res.json({ access_token, expires_in });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).send('Failed to refresh token');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
