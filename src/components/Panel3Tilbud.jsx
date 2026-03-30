import { useState } from 'react';

function fmt(n) {
  return Number(n || 0).toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function Panel3Tilbud({ offerLines, setOfferLines, jobBreakdown, loading, onNext, proxyAuth }) {
  const [exportingPdf, setExportingPdf] = useState(false);

  if (loading && !offerLines) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
        <span className="w-8 h-8 border-2 border-gray-200 border-t-craft rounded-full animate-spin" />
        <span className="text-sm">Genererer tilbud…</span>
      </div>
    );
  }

  if (!offerLines) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300 px-6 text-center">
        <span className="text-4xl">📋</span>
        <p className="text-sm">Godkend jobanalysen i panel 2 for at generere et tilbud.</p>
      </div>
    );
  }

  const { lines = [], currency = 'DKK', validDays = 30, notes = '', vatRate = 0.25 } = offerLines;

  function updateLine(id, field, rawValue) {
    setOfferLines(prev => {
      const updated = prev.lines.map(l => {
        if (l.id !== id) return l;
        const val = field === 'qty' || field === 'unitPrice' ? parseFloat(rawValue) || 0 : rawValue;
        const newLine = { ...l, [field]: val };
        newLine.total = (newLine.qty || 0) * (newLine.unitPrice || 0);
        return newLine;
      });
      const subtotal = updated.reduce((s, l) => s + (l.total || 0), 0);
      const vat = subtotal * vatRate;
      return { ...prev, lines: updated, subtotal, vat, grandTotal: subtotal + vat };
    });
  }

  function removeLine(id) {
    setOfferLines(prev => {
      const updated = prev.lines.filter(l => l.id !== id);
      const subtotal = updated.reduce((s, l) => s + (l.total || 0), 0);
      const vat = subtotal * vatRate;
      return { ...prev, lines: updated, subtotal, vat, grandTotal: subtotal + vat };
    });
  }

  function addLine() {
    const newLine = { id: `line${Date.now()}`, trade: '', description: 'Ny post', qty: 1, unit: 'stk', unitPrice: 0, total: 0 };
    setOfferLines(prev => ({ ...prev, lines: [...prev.lines, newLine] }));
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const title = jobBreakdown?.title || 'Tilbud';
      const dateStr = new Date().toLocaleDateString('da-DK');

      // Header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('TILBUD', 20, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(title, 20, 33);
      doc.text(`Dato: ${dateStr}`, 20, 40);
      doc.text(`Gyldig: ${validDays} dage`, 20, 47);
      doc.setTextColor(0);

      // Table
      autoTable(doc, {
        startY: 55,
        head: [['Faggruppe', 'Beskrivelse', 'Antal', 'Enhed', 'Enhedspris', 'Total']],
        body: lines.map(l => [
          l.trade || '',
          l.description || '',
          l.qty?.toString() || '',
          l.unit || '',
          `${fmt(l.unitPrice)} ${currency}`,
          `${fmt(l.total)} ${currency}`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [230, 126, 34] },
        columnStyles: {
          0: { cellWidth: 30 },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
      });

      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.text(`Subtotal: ${fmt(offerLines.subtotal)} ${currency}`, 140, finalY, { align: 'right' });
      doc.text(`Moms (25%): ${fmt(offerLines.vat)} ${currency}`, 140, finalY + 6, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`I alt: ${fmt(offerLines.grandTotal)} ${currency}`, 140, finalY + 14, { align: 'right' });

      if (notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Forbehold: ${notes}`, 20, finalY + 20);
      }

      doc.save(`tilbud-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF fejl:', err);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Offer table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-3 py-2 text-gray-400 font-medium w-28">Faggruppe</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Beskrivelse</th>
              <th className="text-right px-3 py-2 text-gray-400 font-medium w-14">Antal</th>
              <th className="text-center px-3 py-2 text-gray-400 font-medium w-14">Enhed</th>
              <th className="text-right px-3 py-2 text-gray-400 font-medium w-24">Enhedspris</th>
              <th className="text-right px-3 py-2 text-gray-400 font-medium w-24">Total</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                <td className="px-2 py-1.5">
                  <input
                    value={l.trade || ''}
                    onChange={e => updateLine(l.id, 'trade', e.target.value)}
                    className="w-full text-xs outline-none text-gray-500 bg-transparent border-b border-transparent focus:border-craft"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={l.description || ''}
                    onChange={e => updateLine(l.id, 'description', e.target.value)}
                    className="w-full text-xs outline-none text-gray-700 bg-transparent border-b border-transparent focus:border-craft"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={l.qty || ''}
                    onChange={e => updateLine(l.id, 'qty', e.target.value)}
                    className="w-full text-xs outline-none text-right text-gray-700 bg-transparent border-b border-transparent focus:border-craft"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={l.unit || ''}
                    onChange={e => updateLine(l.id, 'unit', e.target.value)}
                    className="w-full text-xs outline-none text-center text-gray-500 bg-transparent border-b border-transparent focus:border-craft"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={l.unitPrice || ''}
                    onChange={e => updateLine(l.id, 'unitPrice', e.target.value)}
                    className="w-full text-xs outline-none text-right text-gray-700 bg-transparent border-b border-transparent focus:border-craft"
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-gray-700">
                  {fmt(l.total)}
                </td>
                <td className="px-1 py-1.5">
                  <button
                    onClick={() => removeLine(l.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity text-xs"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-3 py-2">
          <button
            onClick={addLine}
            className="text-xs text-craft hover:text-craft-dark border border-dashed border-craft/30 hover:border-craft rounded-lg px-3 py-1.5 transition-colors"
          >
            + Tilføj linje
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex justify-between items-end mb-3">
          <div className="text-xs text-gray-400">
            {notes && <p className="italic">{notes}</p>}
            <p>Gyldig i {validDays} dage</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Subtotal: <span className="text-gray-600">{fmt(offerLines.subtotal)} {currency}</span></div>
            <div className="text-xs text-gray-400">Moms (25%): <span className="text-gray-600">{fmt(offerLines.vat)} {currency}</span></div>
            <div className="text-sm font-bold text-gray-800 mt-0.5">{fmt(offerLines.grandTotal)} {currency}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportPdf}
            disabled={exportingPdf}
            className="btn-secondary flex items-center gap-1.5 flex-1"
          >
            {exportingPdf ? (
              <><span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> Eksporterer…</>
            ) : (
              <>⬇ Download PDF</>
            )}
          </button>
          <button onClick={onNext} className="btn-primary flex-1">
            Koordiner →
          </button>
        </div>
      </div>
    </div>
  );
}
