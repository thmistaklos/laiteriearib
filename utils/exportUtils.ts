
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // This import should augment the jsPDF prototype

// The custom interface jsPDFWithAutoTable has been removed.

export const exportToCsv = (data: any[], filename: string, headers?: string[]) => {
  const csv = Papa.unparse(data, { header: !!headers, columns: headers });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToXlsx = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPdf = (
    title: string,
    headers: string[][], // For complex headers, or simple string[]
    body: any[][],
    filename: string,
    isRTL: boolean = false
) => {
    const doc = new jsPDF(); // Initialize jsPDF instance directly.
                               // Type is jsPDF, which should be augmented by jspdf-autotable.

    // For RTL, jsPDF doesn't natively support it well for text rendering without plugins or specific fonts.
    // This is a basic setup. For better Arabic rendering, embedding an Arabic font (e.g., Amiri) is recommended.
    // We'll use a standard font that might have some Arabic characters.
    doc.setFont('Helvetica'); // A common font, replace if you embed a specific one

    // Add title
    doc.text(title, 14, 16);

    // Add table
    // The `autoTable` method should be available on `doc` due to module augmentation.
    // If UserOptions type from 'jspdf-autotable' is needed for options, it can be imported.
    (doc as any).autoTable({ // Using `as any` temporarily if autoTable specific options type is complex or not readily available
        head: headers,
        body: body,
        startY: 20,
        theme: 'grid',
        styles: {
            font: 'Helvetica', // Ensure table also uses a consistent font
            halign: isRTL ? 'right' : 'left',
        },
        headStyles: {
            fillColor: [22, 160, 133], // A greenish color for header
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245], // Light grey for alternate rows
        },
        // For RTL content in cells, jsPDF-autoTable relies on the font's ability to render it.
        // It doesn't automatically reverse text direction in cells. Text must be pre-formatted if needed.
    });

    doc.save(`${filename}.pdf`);
};
