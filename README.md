# Gmail Auto Reply Script

Automate the process of sending vacation responses to new emails using the Gmail API.

## Prerequisites

- Node.js installed
- Gmail API credentials (client secret file)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/darshan-balaji/openinappProject.git
2. Navigate to project folder
3. Install dependencies
   npm install
4. Replace the existing client secret file with the one that is specific to your gmail ID
5. Run the script

## Usage

- The script runs at regular intervals (45-120 seconds) to check for new emails.
- It sends vacation responses to new emails received after the script starts running.
- The timestamp of the last processed email is stored to avoid duplicate responses.

## Configuration

- Adjust the CHECK_INTERVAL_MIN variable in the script for the desired interval.
- To customize the automated message, you can modify the subject and body line inside the code block
  ```javascript
  const vacationResponse = {
    subject: 'Automated Response',
    body: 'Thank you for your email. I am on vacation will get back to you as soon as possible!',
  };
