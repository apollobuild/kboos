import { jsPDF } from 'jspdf';

export async function generateCampaignPDF(bizName, reportData) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const { funnel, campaigns, roi, costs, date } = reportData;

  doc.setFillColor(7, 9, 15);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(238, 242, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('KBOOS — Outreach Report', 20, 25);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(77, 85, 102);
  doc.text(`Business: ${bizName}`, 20, 35);
  doc.text(`Generated: ${date || new Date().toLocaleDateString()}`, 20, 41);

  doc.setDrawColor(255,255,255,0.08);
  doc.line(20, 48, 190, 48);

  doc.setTextColor(238, 242, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Conversion Funnel', 20, 58);

  if (funnel) {
    let y = 66;
    const maxW = 120;
    funnel.forEach((stage, i) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(77, 85, 102);
      doc.text(stage.label, 20, y + 5);
      doc.setFillColor(20, 25, 40);
      doc.roundedRect(70, y, maxW, 8, 2, 2, 'F');
      const w = Math.max(4, (stage.pct / 100) * maxW);
      doc.setFillColor(101, 200, 130);
      doc.roundedRect(70, y, w, 8, 2, 2, 'F');
      doc.setTextColor(238, 242, 255);
      doc.text(`${stage.val.toLocaleString()} (${stage.pct}%)`, 196, y + 6, { align:'right' });
      y += 14;
    });
  }

  if (roi) {
    doc.setTextColor(238, 242, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('ROI Summary', 20, 170);
    const roiItems = [
      ['Pipeline Revenue', `RM ${(roi.meetings * roi.dealValue).toLocaleString()}`],
      ['Platform Cost', `RM ${roi.platformCost}`],
      ['Net Profit', `RM ${((roi.meetings * roi.dealValue) - roi.platformCost).toLocaleString()}`],
      ['ROI', `${roi.roiPct}%`],
    ];
    roiItems.forEach(([label, val], i) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(77, 85, 102);
      doc.text(label, 20, 180 + i * 8);
      doc.setTextColor(238, 242, 255);
      doc.text(val, 190, 180 + i * 8, { align:'right' });
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(77, 85, 102);
  doc.text('Powered by KBOOS — KB Outreach OS by KOBIS Berhad', 105, 290, { align:'center' });

  const filename = `KBOOS-Report-${bizName.replace(/\s+/g,'-')}-${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
