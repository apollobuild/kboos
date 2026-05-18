import { patchObj, getObj } from './storage.js';

export const googleDriveService = {
  isConnected: () => getObj('settings')?.driveConnected === true,

  connect: () => {
    alert('Google Drive OAuth:\n\n1. Go to console.cloud.google.com\n2. Enable Google Drive API\n3. Create OAuth credentials\n4. Add your domain to authorized origins\n\nFor now, simulating connected state.');
    patchObj('settings', { driveConnected: true });
    return true;
  },

  disconnect: () => {
    patchObj('settings', { driveConnected: false });
  },

  uploadLeadsCSV: async (campaignName, csvBlob) => {
    if (!googleDriveService.isConnected()) return null;
    console.log(`[Drive] Would upload ${campaignName} leads CSV (${csvBlob?.size || 0} bytes)`);
    return { id: 'mock_file_id', name: `${campaignName}-leads.csv`, folder: campaignName };
  },

  uploadReport: async (campaignName, pdfFilename) => {
    if (!googleDriveService.isConnected()) return null;
    console.log(`[Drive] Would upload report to KBOOS Reports/${campaignName}/`);
    return { id: 'mock_report_id', name: pdfFilename };
  },
};
