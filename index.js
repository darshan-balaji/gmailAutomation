const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = 'token.json';
const PROCESSED_EMAILS_FILE = 'processedEmails.json';
const CHECK_INTERVAL_MIN = 45 * 1000; // 45 seconds
const CHECK_INTERVAL_MAX = 120 * 1000; // 120 seconds

let processedEmails = [];

// here I am loading processed emails from files to make sure it is not being sent repetitively
if (fs.existsSync(PROCESSED_EMAILS_FILE)) {
  processedEmails = JSON.parse(fs.readFileSync(PROCESSED_EMAILS_FILE, 'utf8'));
}

// here I am setting up gmail API and loading the client secrets file
fs.readFile('client_secret_805136584302-vabfbbpk5mbci79kebh4qhuiad2tvo09.apps.googleusercontent.com.json', 'utf-8', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content), checkEmails);
});

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function checkEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  // here I am creating a label for the automated message, note: I am yet to figure this part out as adding labels seems to be throwing errors
  const vacationResponse = {
    subject: 'Automated Response',
    body: 'Thank you for your email. I am on vacation will get back to you as soon as possible!',
  };
  const labelToAdd = 'missed';

  // List the user's messages
  gmail.users.messages.list(
    {
      userId: 'me',
      labelIds: 'INBOX',
    },
    (err, res) => {
      if (err) return console.log('The API returned an error:', err);

      const messages = res.data.messages;
      if (messages && messages.length) {
        console.log('New emails found:', messages.length);
        // Process each new email
        messages.forEach((message) => {
          const emailId = message.id;

          // here I am checking if the email has already been processed
          if (!processedEmails.includes(emailId)) {
            // Get the email content
            gmail.users.messages.get({ userId: 'me', id: emailId }, (err, res) => {
              if (err) return console.log('Error getting message content:', err);

              const threadId = res.data.threadId;
              const headers = res.data.payload.headers;
              const from = headers.find((header) => header.name === 'From').value;

              // Prepare the vacation response email
              const emailToSend = {
                to: from,
                subject: vacationResponse.subject,
                text: vacationResponse.body,
              };

              // Send the vacation response
              sendEmail(gmail, emailToSend, (err, response) => {
                if (err) return console.log('Error sending vacation response:', err);

                console.log(`Vacation response sent to ${from}`);

                // Add the email to the list of processed emails
                processedEmails.push(emailId);
                // Update the processed emails file
                fs.writeFileSync(PROCESSED_EMAILS_FILE, JSON.stringify(processedEmails), 'utf-8');
              });
            });
          }
        });
      } else {
        console.log('No new emails to process.');
      }
    }
  );
}

function sendEmail(gmail, { to, subject, text }, callback) {
  const raw = makeVacationResponse(to, { subject, body: text });

  gmail.users.messages.send(
    {
      userId: 'me',
      resource: {
        raw: raw,
      },
    },
    (err, response) => {
      if (err) return callback(err, null);
      callback(null, response);
    }
  );
}

function makeVacationResponse(to, { subject, body }) {
  const emailContent = `To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`;
  const base64EncodedEmail = Buffer.from(emailContent).toString('base64');
  return base64EncodedEmail;
}

// Here I am seeting the time interval to perform iterative checking for new emails
setInterval(() => {
  fs.readFile('client_secret_805136584302-vabfbbpk5mbci79kebh4qhuiad2tvo09.apps.googleusercontent.com.json', 'utf-8', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), checkEmails);
  });
}, CHECK_INTERVAL_MIN);
