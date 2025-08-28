# WhatsApp Voice Note Exporter for Data Collection

This is an Expo-based React Native application designed to facilitate the export of WhatsApp audio notes to a backend server for data collection purposes. It features a user-friendly interface for selecting and uploading voice notes, robust backend infrastructure for secure storage and tracking, and mechanisms for handling network unreliability.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
  - [Frontend (Mobile App)](#frontend-mobile-app)
  - [Backend (AWS Serverless)](#backend-aws-serverless)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup (AWS CDK)](#backend-setup-aws-cdk)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

*   **WhatsApp Voice Note Collection:** Easily select and import WhatsApp voice notes from your device's storage using Android's Storage Access Framework (SAF).
*   **Intelligent Upload Management:**
    *   Detects and prevents re-uploading of already processed voice notes using file hashing.
    *   Manages concurrent uploads to optimize efficiency.
    *   Includes a robust retry mechanism with exponential backoff for network resilience.
*   **Location Data Integration:** Captures user location metadata (with explicit permission) alongside voice note uploads for enriched data collection.
*   **Gamified User Experience:** Tracks and displays "potential earnings" based on the number of uploaded voice notes, incentivizing data contribution.
*   **Audio Playback:** Built-in audio player to listen to voice notes within the app.
*   **Secure & Scalable Backend:** Leverages AWS serverless technologies (S3, DynamoDB, Lambda, API Gateway) for secure, scalable, and cost-effective data handling.
*   **Clear Upload Status:** Provides visual cues for uploaded, uploading, and available voice notes.

## Architecture

The application is split into two main components: a mobile frontend built with Expo/React Native and a serverless backend powered by AWS.

### Frontend (Mobile App)

The mobile application is developed using **Expo** and **React Native**, providing a cross-platform solution for Android.

*   **Framework:** Expo, React Native
*   **Navigation:** Expo Router
*   **State Management:** React hooks (`useState`, `useRef`, `useCallback`)
*   **Local Storage:** `@react-native-async-storage/async-storage` for persisting user preferences and upload status.
*   **File System Access:** `react-native-saf-x` for interacting with Android's Storage Access Framework to access WhatsApp voice note directories.
*   **Audio Playback:** `expo-av`
*   **Networking:** Custom API service for interacting with the backend.
*   **Permissions:** `expo-media-library`, `expo-location` for requesting necessary device permissions.

**Key Frontend Flows:**

1.  **Initialization:** On first launch, the app prompts the user to select the WhatsApp voice notes folder. The URI of this folder is stored locally.
2.  **Voice Note Discovery:** The app scans the selected directory for `.opus` audio files.
3.  **Hash Generation:** A unique hash is generated for each discovered voice note to identify it uniquely.
4.  **Upload Status Sync:** The app communicates with the backend to determine which of the discovered voice notes have already been successfully uploaded.
5.  **User Interaction:** Users can view a list of voice notes, play them, select multiple notes, and initiate an upload.
6.  **Upload Process:** Selected notes are added to an upload queue. The app requests pre-signed URLs from the backend and then uploads the audio files directly to S3. This process includes retry logic for failed uploads.

### Backend (AWS Serverless)

The backend is a serverless architecture deployed on AWS using the **AWS Cloud Development Kit (CDK)**.

*   **Infrastructure as Code:** AWS CDK (TypeScript)
*   **File Storage:** AWS S3 Bucket for storing raw `.opus` voice note files and their associated metadata (`.metadata.json`).
*   **Metadata Storage:** AWS DynamoDB Table (`uploads-table`) to track metadata of uploaded voice notes, including `userId`, `fileHash`, `audioId`, `fileName`, `uploadedAt`, and `locationData`.
*   **API Gateway:** Serves as the public-facing HTTP endpoint for the mobile application.
    *   `POST /upload`: Endpoint for the mobile app to request pre-signed S3 URLs for uploading voice notes.
    *   `POST /check-uploads`: Endpoint for the mobile app to query the status of previously uploaded voice notes based on their `fileHash`.
*   **Lambda Functions (Node.js):**
    *   `presigned-url-generator` (`upload.ts`):
        *   Receives upload requests from the mobile app.
        *   Checks DynamoDB for existing uploads to prevent duplicates.
        *   Uploads a JSON metadata file to S3.
        *   Records upload details in DynamoDB.
        *   Generates and returns a secure, time-limited pre-signed S3 URL for direct audio file upload from the mobile client.
    *   `check-uploads` (`check-uploads.ts`):
        *   Receives a list of `fileHashes` from the mobile app.
        *   Queries the DynamoDB table to identify which of these hashes correspond to already uploaded files.
        *   Returns the list of already uploaded hashes.

**Backend Flow:**

1.  **Mobile App Request:** The mobile app sends a request to the API Gateway `/upload` endpoint with `userId` and voice note metadata (including `fileHash`).
2.  **Pre-signed URL Generation:** The `presigned-url-generator` Lambda function:
    *   Verifies if the file (via `fileHash`) has already been uploaded.
    *   Stores voice note metadata in S3 and DynamoDB.
    *   Generates a pre-signed S3 URL for the mobile app to directly upload the audio file.
3.  **Direct S3 Upload:** The mobile app uses the received pre-signed URL to upload the `.opus` audio file directly to the S3 bucket.
4.  **Upload Status Check:** The mobile app can query the `/check-uploads` endpoint to efficiently determine which voice notes have been successfully processed by the backend.

## Getting Started

### Prerequisites

*   Node.js (LTS recommended)
*   npm or Yarn
*   Expo CLI (`npm install -g expo-cli`)
*   AWS Account and configured AWS CLI (for backend deployment)
*   Android Studio (for running on Android emulator/device)

### Frontend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hamza13-12/whatsapp-export-audio.git
    cd whatsapp-export-audio
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Start the Expo development server:**
    ```bash
    npx expo start
    ```
    This will open a Metro Bundler interface in your browser. You can then:
    *   Scan the QR code with your Expo Go app on your Android device.
    *   Run on an Android emulator (`npm run android`).
    *   Build a development client for advanced features like `react-native-saf-x`.

4.  **Configure API Endpoint:**
    You will need to update the API endpoint in `app/services/api.ts` to point to your deployed API Gateway URL.

### Backend Setup (AWS CDK)

1.  **Navigate to the `infra` directory:**
    ```bash
    cd infra
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Bootstrap CDK (if not already bootstrapped):**
    ```bash
    npx cdk bootstrap aws://YOUR_AWS_ACCOUNT_ID/YOUR_AWS_REGION
    ```
    Replace `YOUR_AWS_ACCOUNT_ID` and `YOUR_AWS_REGION` with your actual AWS account ID and desired region (e.g., `us-east-1`).

4.  **Deploy the infrastructure:**
    ```bash
    npx cdk deploy
    ```
    This command will deploy the S3 bucket, DynamoDB table, Lambda functions, and API Gateway. After successful deployment, the API Gateway URL and other resource names will be printed in your terminal. Copy the API Gateway URL to configure your frontend.

## Usage

1.  **Open the App:** Launch the app on your Android device or emulator.
2.  **Grant Permissions:** Grant necessary media and location permissions when prompted.
3.  **Select WhatsApp Folder:** Onboarding will guide you to select the WhatsApp Voice Notes folder using your device's file picker. This is typically located at `Internal Storage/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Voice Notes/`.
4.  **View Voice Notes:** The app will display a list of all detected voice notes, showing which ones have already been uploaded.
5.  **Select & Upload:**
    *   Tap on individual voice notes to select/deselect them.
    *   Use the "Select All" button to select all available (non-uploaded, non-uploading) notes.
    *   Tap the "Upload" button to start the upload process.
6.  **Track Progress:** Monitor the upload progress and see your "earnings" increase as notes are successfully uploaded.
7.  **Play Audio:** Tap on a voice note to play it within the app.

## Contributing

Feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
