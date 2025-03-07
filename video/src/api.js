import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';

const systemInstruction = `When given a video and a query, call the relevant function only once with the appropriate timecodes and text for the video`;

const client = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export default async ({ text, functionDeclarations, file, timecodeList, activeMode }) => { // added timecodeList and activeMode
  const { response } = await client
    .getGenerativeModel(
      { model: 'gemini-2.0-flash-exp', systemInstruction },
      { apiVersion: 'v1beta' }
    )
    .generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text },
            {
              fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.5 },
      tools: [{ functionDeclarations }],
    });

  // Save to Google Drive if timecodeList is available
  if (timecodeList) {
    await saveToGoogleDrive(timecodeList, activeMode);
  }

  return response;
};

async function saveToGoogleDrive(timecodeList, activeMode) {
  const data = JSON.stringify(timecodeList, null, 2);
  const blob = new Blob([data], { type: 'application/json' });

  try {
    const auth = google.auth.getAuthClient({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: `timecodes_${activeMode || 'data'}.json`,
      mimeType: 'application/json',
    };
    const media = {
      mimeType: 'application/json',
      body: blob,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    console.log('File ID:', response.data.id);
    alert('File saved to Google Drive!');
  } catch (error) {
    console.error('Error saving to Google Drive:', error);
    alert('Error saving to Google Drive. Please make sure you are logged in and have authorized the app.');
  }
}
