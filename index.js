import express from "express";
import { render } from "zpl-image";
import { PDFDocument, StandardFonts } from "pdf-lib";

const app = express();
app.use(express.text({ type: "*/*" }));

// -----------------------------
// 🟢 ZPL → PNG
// -----------------------------
app.post("/zpl-to-png", async (req, res) => {
  try {
    const zpl = req.body;

    const png = await render(zpl, {
      dpi: 203,
      format: "png",
      width: 800,
      height: 1200
    });

    res.setHeader("Content-Type", "image/png");
    res.send(png);

  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando PNG");
  }
});

// -----------------------------
// 🟢 ZPL → PDF (PNG dentro del PDF)
// -----------------------------
app.post("/zpl-to-pdf", async (req, res) => {
  try {
    const zpl = req.body;

    // 1) Renderizar PNG
    const png = await render(zpl, {
      dpi: 203,
      format: "png",
      width: 800,
      height: 1200
    });

    // 2) Crear PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([800, 1200]);

    const pngEmbed = await pdf.embedPng(png);

    page.drawImage(pngEmbed, {
      x: 0,
      y: 0,
      width: 800,
      height: 1200
    });

    const pdfBytes = await pdf.save();

    // 3) Responder PDF
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));

  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando PDF");
  }
});

// Puerto para Render
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Servidor ZPL ONLINE en puerto " + port));
