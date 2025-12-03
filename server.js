import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { PDFDocument } from "pdf-lib";
import cors from "cors";

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));
app.use(cors());

/* ============================
   📥 ENDPOINT /zpl-pdf
============================ */
app.post("/zpl-pdf", async (req, res) => {
  try {
    const { motores } = req.body;
    if (!motores || motores.length === 0) {
      return res.status(400).json({ error: "No se enviaron motores" });
    }

    const pdfDoc = await PDFDocument.create();

    for (const motor of motores) {
      const { Numero_Serie, ID_Motor} = motor;

      // Generar tipo, potencia y caudal en el servidor
      const tipo = ID_Motor.startsWith("EB075") ? "0,75HP" : "0,50HP";
      const potencia = ID_Motor.startsWith("EB075") ? "120 watts" : "109 watts";
      const caudal = ID_Motor.startsWith("EB075") ? "12 m3/h" : "8 m3/h";

      // Generar ZPL dinámico
      const zpl = `
^XA
^FO50,50^A0N,50,50^FDMotor: ${tipo}^FS
^FO50,120^A0N,50,50^FDNumero: ${Numero_Serie}^FS
^FO50,190^A0N,50,50^FDCodigo: ${ID_Motor}^FS
^FO50,260^A0N,50,50^FDPotencia: ${potencia}^FS
^FO50,330^A0N,50,50^FDCaudal: ${caudal}^FS
^XZ
      `;

      // Convertir ZPL a PNG usando Labelary
      const labelary = await fetch(
        "http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: zpl,
        }
      );

      if (!labelary.ok) throw new Error(await labelary.text());

      const pngBuffer = Buffer.from(await labelary.arrayBuffer());

      // Agregar imagen al PDF
      const pngImage = await pdfDoc.embedPng(pngBuffer);
      const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Enviar PDF al cliente
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=etiquetas.pdf"
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: error.toString() });
  }
});

/* ============================
   🚀 INICIAR SERVIDOR
============================ */
const PORT = process.env.PORT || 10001;
app.listen(PORT, () => {
  console.log("Servidor nuevo activo en puerto " + PORT);
});
